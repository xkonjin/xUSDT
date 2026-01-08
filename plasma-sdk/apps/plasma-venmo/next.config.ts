import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@plasma-pay/core',
    '@plasma-pay/gasless',
    '@plasma-pay/privy-auth',
    '@plasma-pay/aggregator',
  ],
};

export default nextConfig;
