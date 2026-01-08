/**
 * Next.js configuration for Bill Split app
 * Transpiles @plasma-pay monorepo packages for proper module resolution
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@plasma-pay/core',
    '@plasma-pay/gasless',
    '@plasma-pay/privy-auth',
    '@plasma-pay/aggregator',
  ],
};

export default nextConfig;
