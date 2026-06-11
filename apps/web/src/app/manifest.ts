import type { MetadataRoute } from 'next';

// PWA manifest — the personal (warm) world is the front door.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'unsaid',
    short_name: 'unsaid',
    description:
      "an anonymous space for the things you can't say out loud. nobody knows it's you. everybody feels it.",
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ECE5DC',
    theme_color: '#ECE5DC',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
