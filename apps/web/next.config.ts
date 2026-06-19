import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@unsaid/tokens', '@unsaid/api'],
  // allow LAN devices (e.g. phone on same Wi-Fi) to load /_next/* during dev
  allowedDevOrigins: ['10.10.1.56'],
  // legal pages read the canonical markdown from the repo's docs/ at runtime —
  // every /legal/* route must trace docs/ or loadDoc() silently returns fallback
  outputFileTracingIncludes: {
    '/legal/privacy': ['../../docs/*.md'],
    '/legal/anonymous': ['../../docs/*.md'],
    '/legal/moderation': ['../../docs/*.md'],
  },
};

export default nextConfig;
