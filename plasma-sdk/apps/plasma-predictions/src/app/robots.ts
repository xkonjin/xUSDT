import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/my-bets'],
    },
    sitemap: 'https://predictions.plasma.to/sitemap.xml',
  };
}
