import { createHmac } from "node:crypto";

import { env } from "~/env/server";
import { startVideoToArticleWorkflow } from "~/features/videos/server/video-to-article.workflow";
import { Logger } from "~/platform/server/logger";

// Top-level regex patterns for Atom XML parsing
const VIDEO_ID_REGEX = /<yt:videoId>([^<]+)<\/yt:videoId>/;
const TITLE_REGEX = /<title>([^<]+)<\/title>/;

/**
 * Handle PubSubHubbub hub verification
 * YouTube will call this endpoint to verify the webhook subscription
 */
export function GET(request: Request) {
  const url = new URL(request.url);
  const challenge = url.searchParams.get("hub.challenge");

  if (!challenge) {
    return new Response("Missing hub.challenge", { status: 400 });
  }

  return new Response(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

/**
 * Receive new video notifications from YouTube PubSubHubbub
 * Parses Atom XML feed and triggers the video-to-MDX workflow
 */
export async function POST(request: Request) {
  const signature = request.headers.get("X-Hub-Signature");
  const body = await request.text();

  // Verify request authenticity using HMAC-SHA1
  if (signature) {
    const expectedSignature = `sha1=${createHmac("sha1", env.YOUTUBE_WEBHOOK_SECRET).update(body).digest("hex")}`;

    if (signature !== expectedSignature) {
      return new Response("Invalid signature", { status: 401 });
    }
  }

  // Parse Atom XML to extract video information
  const videoIdMatch = body.match(VIDEO_ID_REGEX);
  const titleMatch = body.match(TITLE_REGEX);

  if (!videoIdMatch?.[1]) {
    return new Response("Missing video ID in feed", { status: 400 });
  }

  const videoId = videoIdMatch[1];
  const title = titleMatch?.[1] ?? "Untitled Video";

  Logger.info(`Received webhook for video: ${title}`, { scope: "YOUTUBE_WEBHOOK", videoId });

  // Trigger the workflow asynchronously (don't block webhook response)
  startVideoToArticleWorkflow(videoId).catch((error) => {
    Logger.error(`Failed to trigger workflow for ${videoId}`, { scope: "YOUTUBE_WEBHOOK", error });
  });

  // Return 200 OK immediately (webhook must respond quickly)
  return new Response("OK", { status: 200 });
}
