import { NextResponse } from "next/server";

import { z } from "zod";

import { env } from "~/env/server";
import { startVideoToArticleWorkflow } from "~/features/videos/server/video-to-article.workflow";

const requestSchema = z.union([z.object({ videoId: z.string().min(1) }), z.object({ videoIds: z.array(z.string().min(1)).min(1) })]);

/**
 * Manual trigger API for video processing
 * Accepts single videoId or array of videoIds for batch processing
 */
export async function POST(request: Request) {
  // Validate Authorization header
  const authHeader = request.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });
  }

  const token = authHeader.slice(7);

  if (token !== env.ADMIN_API_KEY) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  // Parse and validate request body
  const body = await request.json();
  const parseResult = requestSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid request body", details: parseResult.error.flatten() }, { status: 400 });
  }

  // Normalize to array of video IDs
  const videoIds = "videoId" in parseResult.data ? [parseResult.data.videoId] : parseResult.data.videoIds;

  // Start workflows for each video
  const results = await Promise.allSettled(videoIds.map((videoId) => startVideoToArticleWorkflow(videoId)));

  const successful = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({
    triggered: successful,
    failed,
    videoIds,
    results: results.map((result, index) => ({
      videoId: videoIds[index],
      status: result.status,
      runId: result.status === "fulfilled" ? result.value.runId : undefined,
      error: result.status === "rejected" ? String(result.reason) : undefined,
    })),
  });
}
