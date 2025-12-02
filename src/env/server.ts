import { createEnv } from "@t3-oss/env-nextjs";
import { vercel } from "@t3-oss/env-nextjs/presets-zod";
import { z } from "zod";

/**
 * Server-side environment configuration
 * These variables are only available on the server
 */
export const env = createEnv({
  extends: [vercel()],
  server: {
    /** YouTube Data API v3 for fetching video metadata and captions */
    YOUTUBE_API_KEY: z.string().min(1),
    /** YouTube OAuth Client ID for caption downloads */
    YOUTUBE_CLIENT_ID: z.string().min(1),
    /** YouTube OAuth Client Secret for caption downloads */
    YOUTUBE_CLIENT_SECRET: z.string().min(1),
    /** YouTube OAuth Refresh Token for caption downloads */
    YOUTUBE_REFRESH_TOKEN: z.string().min(1),
    /** HMAC secret for verifying PubSubHubbub webhook signatures */
    YOUTUBE_WEBHOOK_SECRET: z.string().min(1),
    /** YouTube channel ID for PubSubHubbub subscription */
    YOUTUBE_CHANNEL_ID: z.string().min(1),
    /** Personal access token with `repo` and `issues:write` scope for creating issues */
    GITHUB_TOKEN: z.string().min(1),
    /** Secret key for authenticating manual API trigger requests */
    ADMIN_API_KEY: z.string().min(1),
    /** Vercel cron secret for verifying cron job requests */
    CRON_SECRET: z.string().min(1),
    /** Base URL of the application for webhook callbacks */
    APP_URL: z.url(),
  },
  experimental__runtimeEnv: {},
});
