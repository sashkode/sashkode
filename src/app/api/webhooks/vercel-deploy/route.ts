import { createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { env } from "~/env/server";
import { updateYouTubeVideo } from "~/features/videos/server/youtube-update";
import { Logger } from "~/platform/server/logger";

const GITHUB_API_BASE = "https://api.github.com";
const REPO_OWNER = "sashkode";
const REPO_NAME = "sashkode";
const BLOG_BASE_URL = "https://videos.sashkode.dev";

// Regex to extract youtubeVideoId from MDX frontmatter
const YOUTUBE_VIDEO_ID_REGEX = /^youtubeVideoId:\s*["']?([a-zA-Z0-9_-]+)["']?\s*$/m;
// Regex for MDX file extension
const MDX_EXTENSION_REGEX = /\.mdx$/;

type VercelDeploymentPayload = {
  type: string;
  id: string;
  createdAt: number;
  payload: {
    team?: { id: string };
    user: { id: string };
    deployment: {
      id: string;
      url: string;
      name: string;
      meta?: Record<string, string>;
    };
    links: {
      deployment: string;
      project: string;
    };
    target: string | null;
    project: { id: string };
  };
};

type GitHubCommitResponse = {
  sha: string;
  files?: Array<{
    sha: string;
    filename: string;
    status: "added" | "removed" | "modified" | "renamed" | "copied" | "changed" | "unchanged";
    additions: number;
    deletions: number;
    changes: number;
    raw_url: string;
  }>;
};

/**
 * Verify Vercel webhook signature using HMAC SHA1
 */
function verifySignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) {
    return false;
  }

  const expectedSignature = createHmac("sha1", secret).update(body).digest("hex");

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(signatureBuffer, expectedBuffer);
}

/**
 * Get commit details from GitHub API
 */
async function getCommitDetails(commitSha: string): Promise<GitHubCommitResponse> {
  const response = await fetch(`${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/commits/${commitSha}`, {
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch commit: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<GitHubCommitResponse>;
}

/**
 * Fetch raw file content from GitHub
 */
async function fetchFileContent(rawUrl: string): Promise<string> {
  const response = await fetch(rawUrl, {
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch file content: ${response.status}`);
  }

  return response.text();
}

/**
 * Extract youtubeVideoId from MDX file content
 */
function extractVideoId(content: string): string | null {
  const match = content.match(YOUTUBE_VIDEO_ID_REGEX);
  return match?.[1] ?? null;
}

/**
 * Extract slug from MDX filename
 * e.g., "content/videos/my-article.mdx" -> "my-article"
 */
function extractSlug(filename: string): string {
  const basename = filename.split("/").pop() ?? "";
  return basename.replace(MDX_EXTENSION_REGEX, "");
}

/**
 * Process a single MDX file: extract video ID and update YouTube
 */
async function processVideoArticle(file: { filename: string; raw_url: string }): Promise<{
  filename: string;
  videoId: string | null;
  blogUrl: string | null;
  success: boolean;
  error?: string;
}> {
  const slug = extractSlug(file.filename);
  const blogUrl = `${BLOG_BASE_URL}/${slug}`;

  try {
    // Fetch the file content to extract youtubeVideoId
    const content = await fetchFileContent(file.raw_url);
    const videoId = extractVideoId(content);

    if (!videoId) {
      return {
        filename: file.filename,
        videoId: null,
        blogUrl: null,
        success: false,
        error: "No youtubeVideoId found in frontmatter",
      };
    }

    // Update YouTube video
    await updateYouTubeVideo(videoId, blogUrl);

    return {
      filename: file.filename,
      videoId,
      blogUrl,
      success: true,
    };
  } catch (error) {
    return {
      filename: file.filename,
      videoId: null,
      blogUrl,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Handle Vercel deployment webhook
 * Triggers YouTube video updates when blog articles are deployed to production
 */
export async function POST(request: Request) {
  const signature = request.headers.get("x-vercel-signature");
  const body = await request.text();

  // Verify webhook signature
  if (!verifySignature(body, signature, env.VERCEL_WEBHOOK_SECRET)) {
    Logger.warn("Invalid Vercel webhook signature", { scope: "VERCEL_WEBHOOK" });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Parse webhook payload
  let payload: VercelDeploymentPayload;
  try {
    payload = JSON.parse(body) as VercelDeploymentPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  // Only process deployment.succeeded events
  if (payload.type !== "deployment.succeeded") {
    Logger.info(`Ignoring event type: ${payload.type}`, { scope: "VERCEL_WEBHOOK" });
    return NextResponse.json({ message: "Event type ignored", type: payload.type });
  }

  // Only process production deployments
  if (payload.payload.target !== "production") {
    Logger.info(`Ignoring non-production deployment: ${payload.payload.target}`, { scope: "VERCEL_WEBHOOK" });
    return NextResponse.json({ message: "Non-production deployment ignored", target: payload.payload.target });
  }

  // Extract git commit SHA from deployment meta
  const commitSha = payload.payload.deployment.meta?.["githubCommitSha"];
  if (!commitSha) {
    Logger.warn("No git commit SHA in deployment metadata", { scope: "VERCEL_WEBHOOK" });
    return NextResponse.json({ error: "Missing git commit SHA" }, { status: 400 });
  }

  Logger.info(`Processing production deployment for commit ${commitSha}`, { scope: "VERCEL_WEBHOOK" });

  try {
    // Get commit details to find added files
    const commit = await getCommitDetails(commitSha);

    // Filter for added MDX files in content/videos/
    const addedVideoFiles = commit.files?.filter((file) => file.status === "added" && file.filename.startsWith("content/videos/") && file.filename.endsWith(".mdx")) ?? [];

    if (addedVideoFiles.length === 0) {
      Logger.info("No new video articles in this deployment", { scope: "VERCEL_WEBHOOK" });
      return NextResponse.json({ message: "No new video articles found" });
    }

    Logger.info(`Found ${addedVideoFiles.length} new video article(s)`, { scope: "VERCEL_WEBHOOK" });

    // Process each video article
    const results = await Promise.all(addedVideoFiles.map(processVideoArticle));

    // Check for failures
    const failures = results.filter((r) => !r.success);
    if (failures.length > 0) {
      Logger.error(`Failed to process ${failures.length} video article(s)`, {
        scope: "VERCEL_WEBHOOK",
        failures,
      });
      return NextResponse.json(
        {
          error: "Some video articles failed to process",
          results,
        },
        { status: 500 }
      );
    }

    Logger.info(`Successfully processed ${results.length} video article(s)`, { scope: "VERCEL_WEBHOOK", results });

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    Logger.error("Failed to process deployment webhook", { scope: "VERCEL_WEBHOOK", error });
    return NextResponse.json(
      {
        error: "Failed to process deployment",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
