import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@plasma-pay/core', '@plasma-pay/gasless', '@plasma-pay/x402'],
};

export default nextConfig;
