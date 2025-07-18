import type { NextConfig } from "next";
import path from "path";

console.log('🔍 Loading next.config.ts from:', __dirname);
console.log('📁 Expected lib path:', path.join(__dirname, "src/lib"));

const nextConfig: NextConfig = {
  // Handle app directory and routing
  output: 'standalone',
  trailingSlash: true,
  // Disable asset prefix in development
  assetPrefix: process.env.NODE_ENV === 'production' ? '/tools/push-blaster' : '',
  // Configure base path for app directory
  basePath: process.env.NODE_ENV === 'production' ? '/tools/push-blaster' : '',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ensure @/lib alias resolves during Next.js build
  webpack: (config) => {
    console.log('⚙️ Webpack config function called');
    console.log('📦 Current aliases:', config.resolve?.alias);
    
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@/lib": path.join(__dirname, "src/lib"),
    };
    
    console.log('🔧 Updated aliases:', config.resolve.alias);
    return config;
  },
};

export default nextConfig;
