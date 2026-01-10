/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@plasma-pay/core',
    '@plasma-pay/ui',
    '@plasma-pay/share',
    '@plasma-pay/analytics',
    '@plasma-pay/db',
  ],
};

module.exports = nextConfig;
