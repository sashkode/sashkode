import { createEnv } from '@t3-oss/env-nextjs';

/**
 * Client-side environment configuration
 * These variables are available on both client and server
 * Must be prefixed with NEXT_PUBLIC_
 */
export const env = createEnv({
  client: {},
  runtimeEnv: {},
});
