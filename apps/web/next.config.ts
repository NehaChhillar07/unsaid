import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@unsaid/tokens', '@unsaid/api'],
  // legal pages read the canonical markdown from the repo's docs/ at runtime
  outputFileTracingIncludes: {
    '/legal/privacy': ['../../docs/*.md'],
    '/legal/anonymous': ['../../docs/*.md'],
  },
};

export default nextConfig;
