import { createEnv } from '@t3-oss/env-nextjs';
import { vercel } from '@t3-oss/env-nextjs/presets-zod';

/**
 * Server-side environment configuration
 * These variables are only available on the server
 */
export const env = createEnv({
  extends: [vercel()],
  server: {},
  experimental__runtimeEnv: process.env,
});
