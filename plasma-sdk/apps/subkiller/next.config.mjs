/**
 * Next.js configuration for SubKiller app
 * Transpiles @plasma-pay monorepo packages for proper module resolution
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@plasma-pay/core', '@plasma-pay/gasless', '@plasma-pay/x402'],
};

export default nextConfig;
