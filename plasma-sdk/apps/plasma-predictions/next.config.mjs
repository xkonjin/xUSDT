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
      {
        protocol: 'https',
        hostname: 'polymarket-upload.s3.us-east-2.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'polymarket-static.s3.us-east-2.amazonaws.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://auth.privy.io",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' https: data:",
              "font-src 'self' data:",
              "connect-src 'self' https://auth.privy.io https://gamma-api.polymarket.com",
              "frame-src 'self' https://auth.privy.io",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
