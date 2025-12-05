import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { env } from "~/env/server";
import { updateYouTubeVideo } from "~/features/videos/server/youtube-update";
import { Logger } from "~/platform/server/logger";

/**
 * Internal API route for updating YouTube video with blog article link
 *
 * This endpoint is called by the Vercel deployment webhook after a successful
 * production deployment that includes new blog articles.
 *
 * Authentication: Bearer token using ADMIN_API_KEY
 */
export async function POST(request: Request) {
  // Verify authorization
  const authHeader = request.headers.get("Authorization");
  const expectedAuth = `Bearer ${env.ADMIN_API_KEY}`;

  const authBuffer = Buffer.from(authHeader ?? "");
  const expectedBuffer = Buffer.from(expectedAuth);

  if (authBuffer.length !== expectedBuffer.length || !timingSafeEqual(authBuffer, expectedBuffer)) {
    Logger.warn("Unauthorized YouTube update request attempt", { scope: "YOUTUBE_UPDATE_API" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate required fields
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { videoId, blogUrl } = body as { videoId?: string; blogUrl?: string };

  if (!videoId || typeof videoId !== "string") {
    return NextResponse.json({ error: "Missing or invalid videoId" }, { status: 400 });
  }

  if (!blogUrl || typeof blogUrl !== "string") {
    return NextResponse.json({ error: "Missing or invalid blogUrl" }, { status: 400 });
  }

  try {
    Logger.info(`Updating YouTube video ${videoId} with blog URL`, { scope: "YOUTUBE_UPDATE_API", blogUrl });

    const result = await updateYouTubeVideo(videoId, blogUrl);

    return NextResponse.json({
      success: true,
      videoId,
      blogUrl,
      descriptionUpdated: result.descriptionUpdated,
      commentId: result.commentId,
    });
  } catch (error) {
    Logger.error(`Failed to update YouTube video ${videoId}`, { scope: "YOUTUBE_UPDATE_API", error });
    return NextResponse.json(
      {
        error: "Failed to update YouTube video",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
