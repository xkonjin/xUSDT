/**
 * Next.js configuration for SubKiller app
 * Transpiles @plasma-pay monorepo packages for proper module resolution
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@plasma-pay/core',
    '@plasma-pay/gasless',
    '@plasma-pay/x402',
    '@plasma-pay/db',
    '@plasma-pay/ui',
    '@plasma-pay/privy-auth',
  ],
};

export default nextConfig;
