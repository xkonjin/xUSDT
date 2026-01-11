/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@plasma-pay/core',
    '@plasma-pay/gasless',
    '@plasma-pay/privy-auth',
    '@plasma-pay/ui',
    '@plasma-pay/db',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'polymarket.com',
      },
      {
        protocol: 'https',
        hostname: '*.polymarket.com',
      },
    ],
  },
};

export default nextConfig;
