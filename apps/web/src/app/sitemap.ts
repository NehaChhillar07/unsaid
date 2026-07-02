import type { MetadataRoute } from 'next';

const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://unsaid.app').replace(/\/$/, '');

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: { path: string; priority: number }[] = [
    { path: '', priority: 1 },
    { path: '/legal/privacy', priority: 0.4 },
    { path: '/legal/anonymous', priority: 0.4 },
    { path: '/legal/moderation', priority: 0.4 },
  ];
  return routes.map(({ path, priority }) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority,
  }));
}
