import type { NextConfig } from "next";

// Import environment configurations to validate them at build time
import '~/env/client';
import '~/env/server';

const nextConfig: NextConfig = {
  reactCompiler: true,
};

export default nextConfig;
