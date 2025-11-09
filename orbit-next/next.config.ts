import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    externalDir: true,
  },
  // Optimized for Vercel deployment
  poweredByHeader: false,
  compress: true,
  // Ensure shared schema is included in build
  transpilePackages: [],
};

export default nextConfig;
