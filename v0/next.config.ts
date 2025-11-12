import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Serverless function configuration
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  // Environment variables
  env: {
    GAME_API_URL: process.env.GAME_API_URL,
  },
};

export default nextConfig;
