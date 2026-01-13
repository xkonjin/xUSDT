/**
 * Next.js configuration for Plasma Venmo app
 * Transpiles @plasma-pay monorepo packages for proper module resolution
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@plasma-pay/core',
    '@plasma-pay/gasless',
    '@plasma-pay/privy-auth',
    '@plasma-pay/aggregator',
    '@plasma-pay/db',
    '@plasma-pay/ui',
  ],
};

export default nextConfig;
