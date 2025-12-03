import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { env } from "~/env/server";
import { Logger } from "~/platform/server/logger";

const PUBSUBHUBBUB_HUB = "https://pubsubhubbub.appspot.com/subscribe";
const YOUTUBE_TOPIC_BASE = "https://www.youtube.com/xml/feeds/videos.xml";

/**
 * Vercel Cron endpoint for renewing YouTube PubSubHubbub subscription
 *
 * PubSubHubbub subscriptions expire after a configurable lease period (max 10 days).
 * This cron job renews the subscription before it expires.
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/youtube-subscription",
 *     "schedule": "0 0 * * *"
 *   }]
 * }
 */
export async function GET(request: Request) {
  // Verify this is a cron request from Vercel
  const authHeader = request.headers.get("Authorization");
  const expectedAuth = `Bearer ${env.CRON_SECRET}`;

  // Use timing-safe comparison to prevent timing attacks
  const authBuffer = Buffer.from(authHeader ?? "");
  const expectedBuffer = Buffer.from(expectedAuth);

  if (authBuffer.length !== expectedBuffer.length || !timingSafeEqual(authBuffer, expectedBuffer)) {
    Logger.warn("Unauthorized cron request attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const channelId = env.YOUTUBE_CHANNEL_ID;
  const callbackUrl = `${env.APP_URL}/api/webhooks/youtube`;
  const topicUrl = `${YOUTUBE_TOPIC_BASE}?channel_id=${channelId}`;

  Logger.info("Renewing YouTube PubSubHubbub subscription", { channelId, callbackUrl });

  // Subscribe to YouTube channel notifications
  const formData = new URLSearchParams({
    "hub.callback": callbackUrl,
    "hub.topic": topicUrl,
    "hub.verify": "async",
    "hub.mode": "subscribe",
    "hub.secret": env.YOUTUBE_WEBHOOK_SECRET,
    "hub.lease_seconds": "864000", // 10 days (maximum)
  });

  const response = await fetch(PUBSUBHUBBUB_HUB, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    Logger.error("Failed to renew subscription", { status: response.status, error: errorText });
    return NextResponse.json(
      {
        error: "Failed to renew subscription",
        status: response.status,
        details: errorText,
      },
      { status: 500 }
    );
  }

  Logger.info("YouTube subscription renewal request sent successfully");

  return NextResponse.json({
    success: true,
    channelId,
    message: "Subscription renewal requested. Verification will be sent to callback URL.",
  });
}
