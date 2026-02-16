import type { NextConfig } from "next";
import path from "node:path";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
  // Explicitly set the workspace root to silence Turbopack inference warnings in monorepos
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
  reactCompiler: true,
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: "xusdt",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
});
