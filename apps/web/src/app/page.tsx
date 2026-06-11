import { fetchFeed } from '@unsaid/api';
import type { FeedPost, Mode } from '@unsaid/tokens';
import { createAnonReadClient } from '@/lib/supabase/server';
import { LandingClient } from '@/components/LandingClient';

// anon read of public views — cacheable; refreshed every minute.
export const revalidate = 60;

async function getFeeds(): Promise<Record<Mode, FeedPost[]>> {
  try {
    const sb = createAnonReadClient();
    const [personal, professional] = await Promise.all([
      fetchFeed(sb, 'personal', 'newest'),
      fetchFeed(sb, 'professional', 'newest'),
    ]);
    return { personal: personal.posts, professional: professional.posts };
  } catch {
    // backend not up yet / env missing — render the landing shell anyway.
    return { personal: [], professional: [] };
  }
}

export default async function Home() {
  const feeds = await getFeeds();
  return <LandingClient feeds={feeds} />;
}
