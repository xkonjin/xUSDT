import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  /* config options here */
  // Explicitly set the workspace root to silence Turbopack inference warnings in monorepos
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
  reactCompiler: true,
};

export default nextConfig;
