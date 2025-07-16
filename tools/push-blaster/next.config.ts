import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/tools/push-blaster",
  assetPrefix: "/tools/push-blaster",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
