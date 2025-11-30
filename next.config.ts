import type { NextConfig } from "next";

// Import environment configurations to validate them at build time
import "~/env/client";
import "~/env/server";

// Generate TypeScript types for public images
import "./config/plugins/public-images";

import { env } from "~/env/server";

import { createSubdomainConfig } from "./config/ssl/next-subdomains";

const { rewrites, redirects, allowedDevOrigins } = createSubdomainConfig(env, ["sashkode.dev", "sashkode.app"]);

const nextConfig: NextConfig = {
  reactCompiler: true,
  typedRoutes: true,
  logging: { incomingRequests: false },
  serverExternalPackages: ["pino"],
  allowedDevOrigins,
  rewrites,
  redirects,
};

export default nextConfig;
