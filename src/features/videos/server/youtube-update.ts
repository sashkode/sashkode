import { env } from "~/env/server";
import { Logger } from "~/platform/server/logger";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

// Cache for OAuth access token
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

/**
 * Get a valid OAuth access token, refreshing if needed
 */
async function getAccessToken(): Promise<string> {
  // Check if we have a valid cached token (with 5 min buffer)
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt - 5 * 60 * 1000) {
    return cachedAccessToken.token;
  }

  // Refresh the token
  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.YOUTUBE_CLIENT_ID,
      client_secret: env.YOUTUBE_CLIENT_SECRET,
      refresh_token: env.YOUTUBE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh OAuth token: ${error}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };

  cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  Logger.info("OAuth access token refreshed", { scope: "YOUTUBE_UPDATE" });
  return cachedAccessToken.token;
}

type VideoSnippet = {
  title: string;
  description: string;
  categoryId: string;
  tags?: string[];
};

type YouTubeVideoResponse = {
  items?: Array<{
    id: string;
    snippet: VideoSnippet;
  }>;
};

/**
 * Fetch video snippet data (needed for updates)
 */
async function getVideoSnippet(videoId: string): Promise<(VideoSnippet & { id: string }) | null> {
  const url = new URL(`${YOUTUBE_API_BASE}/videos`);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("id", videoId);
  url.searchParams.set("key", env.YOUTUBE_API_KEY);

  const response = await fetch(url.toString());

  if (!response.ok) {
    Logger.error(`Failed to fetch video snippet: ${response.status} ${response.statusText}`, {
      scope: "YOUTUBE_UPDATE",
    });
    return null;
  }

  const data = (await response.json()) as YouTubeVideoResponse;
  const video = data.items?.[0];

  if (!video) {
    Logger.error(`Video not found: ${videoId}`, { scope: "YOUTUBE_UPDATE" });
    return null;
  }

  return { id: video.id, ...video.snippet };
}

/**
 * Update video description with blog URL
 * Returns true if updated, false if URL already exists (idempotent)
 */
export async function updateVideoDescription(videoId: string, blogUrl: string): Promise<boolean> {
  const snippet = await getVideoSnippet(videoId);
  if (!snippet) {
    throw new Error(`Failed to fetch video snippet for ${videoId}`);
  }

  // Idempotency check: skip if blog URL already in description
  if (snippet.description.includes(blogUrl)) {
    Logger.info(`Blog URL already in description for video ${videoId}, skipping update`, { scope: "YOUTUBE_UPDATE" });
    return false;
  }

  const accessToken = await getAccessToken();

  // Append blog URL to description
  const updatedDescription = `${snippet.description}\n📖 Blog post: ${blogUrl}`;

  const response = await fetch(`${YOUTUBE_API_BASE}/videos?part=snippet`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: videoId,
      snippet: {
        title: snippet.title,
        description: updatedDescription,
        categoryId: snippet.categoryId,
        tags: snippet.tags,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update video description: ${response.status} ${error}`);
  }

  Logger.info(`Updated video description for ${videoId} with blog URL`, { scope: "YOUTUBE_UPDATE", blogUrl });
  return true;
}

type CommentThreadResponse = {
  id: string;
  snippet: {
    topLevelComment: {
      id: string;
    };
  };
};

/**
 * Post a comment on the video with the blog URL
 *
 * Note: The YouTube Data API v3 does not support pinning comments programmatically.
 * Pinning must be done manually via YouTube Studio after the comment is posted.
 */
export async function postBlogComment(videoId: string, blogUrl: string): Promise<string> {
  const accessToken = await getAccessToken();

  const commentText = `📖 Read the full blog post: ${blogUrl}`;

  const response = await fetch(`${YOUTUBE_API_BASE}/commentThreads?part=snippet`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      snippet: {
        videoId,
        topLevelComment: {
          snippet: {
            textOriginal: commentText,
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to post comment: ${response.status} ${error}`);
  }

  const data = (await response.json()) as CommentThreadResponse;
  const commentId = data.snippet.topLevelComment.id;

  Logger.info(`Posted blog comment on video ${videoId}`, { scope: "YOUTUBE_UPDATE", commentId, blogUrl });
  return commentId;
}

/**
 * Update YouTube video with blog article link
 * - Updates video description (idempotent)
 * - Posts a comment with blog URL (must be pinned manually in YouTube Studio)
 */
export async function updateYouTubeVideo(videoId: string, blogUrl: string): Promise<{ descriptionUpdated: boolean; commentId: string | null }> {
  const descriptionUpdated = await updateVideoDescription(videoId, blogUrl);

  // Only post comment if description was updated (first time)
  let commentId: string | null = null;
  if (descriptionUpdated) {
    commentId = await postBlogComment(videoId, blogUrl);
  }

  return { descriptionUpdated, commentId };
}
