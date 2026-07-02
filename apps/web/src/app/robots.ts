import type { MetadataRoute } from 'next';

const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://unsaid.app').replace(/\/$/, '');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // private / personal surfaces stay out of the index
        disallow: ['/admin', '/auth', '/welcome', '/you', '/felt'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
