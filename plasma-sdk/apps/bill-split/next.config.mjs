/**
 * Next.js configuration for Bill Split app
 * Transpiles @plasma-pay monorepo packages for proper module resolution
 * Includes performance optimizations
 * PWA configuration using next-pwa
 */

import withBundleAnalyzer from '@next/bundle-analyzer';
import withPWA from 'next-pwa';

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

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
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

// PWA Configuration
const withPWAConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
        },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'imageCache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      urlPattern: /\.(?:js|css)$/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'staticCache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
  ],
});

export default withAnalyzer(withPWAConfig(nextConfig));
