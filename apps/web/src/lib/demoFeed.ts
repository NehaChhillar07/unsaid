import type { FeedPost, Mode, MoodKey, TopicId } from '@unsaid/tokens';

// Default anonymous confessions for the explore / "get in quietly" screen.
//
// A first-time visitor should always land on a real-looking feed — never the
// empty "the feed is warming up" state — so the explore preview shows what the
// feed actually looks like before they sign up. These are the design
// prototype's FEED confessions, sourced verbatim from supabase/seed.sql
// (is_seed = true) so the preview matches the seeded production feed.
//
// When the live anon feed returns rows, those win; this is only the fallback
// used while the backend is empty / not yet wired (see ExploreLanding).

interface DemoCard {
  id: string;
  body: string;
  mood: MoodKey;
  topic: TopicId;
  role_title: string;
  felt_count: number;
  same_count: number;
  comment_count: number;
  /** minutes before "now" the confession was posted (mirrors the seed stagger) */
  agoMin: number;
}

const PERSONAL: DemoCard[] = [
  {
    id: 'demo-p-01',
    body: `i've been the strong one for so long that nobody ever asks if i'm okay. i wouldn't even know how to answer if they did.`,
    mood: 'heavy', topic: 'family', role_title: 'eldest daughter, 24',
    felt_count: 1284, same_count: 612, comment_count: 3, agoMin: 12960,
  },
  {
    id: 'demo-p-02',
    body: `i have a hundred people i could text right now and not a single one i could call crying at 2am.`,
    mood: 'lonely', topic: 'lonely', role_title: 'overthinker, 23',
    felt_count: 2017, same_count: 1340, comment_count: 2, agoMin: 11520,
  },
  {
    id: 'demo-p-03',
    body: `i love my family and i cannot wait to move out. both things are true and it makes me feel like a liar.`,
    mood: 'confused', topic: 'family', role_title: 'middle child',
    felt_count: 894, same_count: 503, comment_count: 1, agoMin: 10080,
  },
  {
    id: 'demo-p-04',
    body: `ninety days today. nobody in my life knows to be proud of me, so i'm telling strangers instead.`,
    mood: 'proud', topic: 'wins', role_title: 'newly sober, 30',
    felt_count: 4302, same_count: 221, comment_count: 2, agoMin: 8640,
  },
  {
    id: 'demo-p-05',
    body: `everyone's figuring out their lives and i'm just pretending i have a plan so nobody worries about me.`,
    mood: 'scared', topic: 'future', role_title: 'the quiet one, 19',
    felt_count: 1551, same_count: 1102, comment_count: 1, agoMin: 7200,
  },
  {
    id: 'demo-p-06',
    body: `i drove three hours for a birthday nobody thanked me for. i'm not angry. okay. i'm a little angry.`,
    mood: 'angry', topic: 'family', role_title: 'tired daughter, 26',
    felt_count: 763, same_count: 488, comment_count: 1, agoMin: 5760,
  },
  {
    id: 'demo-p-07',
    body: `i moved across the country to chase something and some nights i'm not sure it was worth it. but tonight, i am.`,
    mood: 'hopeful', topic: 'self', role_title: 'homesick, 22',
    felt_count: 1098, same_count: 340, comment_count: 0, agoMin: 4320,
  },
];

const PROFESSIONAL: DemoCard[] = [
  {
    id: 'demo-w-01',
    body: `my manager presented my work to the whole company today and said 'i' the entire time. i smiled and said nothing.`,
    mood: 'angry', topic: 'work', role_title: 'startup designer, 2 yrs in',
    felt_count: 3120, same_count: 1890, comment_count: 2, agoMin: 13080,
  },
  {
    id: 'demo-w-02',
    body: `four months in and i'm terrified the day they realize i don't know what i'm doing is coming soon.`,
    mood: 'scared', topic: 'work', role_title: 'intern at a big4',
    felt_count: 2740, same_count: 2210, comment_count: 1, agoMin: 11700,
  },
  {
    id: 'demo-w-03',
    body: `i laid off two people i hired myself and told them it was 'a business decision.' i went home and couldn't eat.`,
    mood: 'heavy', topic: 'work', role_title: 'team lead, fintech',
    felt_count: 1670, same_count: 540, comment_count: 1, agoMin: 10320,
  },
  {
    id: 'demo-w-04',
    body: `everyone tells me their problems and i have nobody to tell mine. being the safe person is exhausting.`,
    mood: 'confused', topic: 'work', role_title: 'HR exec',
    felt_count: 1422, same_count: 980, comment_count: 1, agoMin: 8940,
  },
  {
    id: 'demo-w-05',
    body: `i finally said 'no, that timeline isn't realistic' in a meeting today. the ceiling didn't fall. i can breathe.`,
    mood: 'relieved', topic: 'wins', role_title: 'engineer, 5 yrs',
    felt_count: 2050, same_count: 410, comment_count: 1, agoMin: 7560,
  },
  {
    id: 'demo-w-06',
    body: `i eat lunch in my car most days so nobody sees that i don't have anyone to eat with yet.`,
    mood: 'lonely', topic: 'lonely', role_title: 'first job, marketing',
    felt_count: 1985, same_count: 1530, comment_count: 1, agoMin: 6180,
  },
  {
    id: 'demo-w-07',
    body: `six months of runway left and i smiled through standup this morning telling everyone we're doing great.`,
    mood: 'scared', topic: 'money', role_title: 'founder',
    felt_count: 1340, same_count: 760, comment_count: 0, agoMin: 4800,
  },
];

function toFeedPost(mode: Mode, c: DemoCard, now: number): FeedPost {
  return {
    id: c.id,
    mode,
    body: c.body,
    mood: c.mood,
    topic: c.topic,
    role_title: c.role_title,
    felt_count: c.felt_count,
    same_count: c.same_count,
    comment_count: c.comment_count,
    comments_enabled: true,
    created_at: new Date(now - c.agoMin * 60_000).toISOString(),
  };
}

/** Build the fallback explore feed with timestamps relative to now. */
export function buildDemoFeed(): Record<Mode, FeedPost[]> {
  const now = Date.now();
  return {
    personal: PERSONAL.map((c) => toFeedPost('personal', c, now)),
    professional: PROFESSIONAL.map((c) => toFeedPost('professional', c, now)),
  };
}

/**
 * Turn a visitor's just-typed confession into the top card of the explore feed —
 * their unsaid, "published" into the preview. Not persisted (they haven't signed
 * in yet); the real post is created once they get in quietly.
 */
export function makeVisitorPost(mode: Mode, body: string): FeedPost {
  return {
    id: 'visitor-draft',
    mode,
    body: body.trim(),
    mood: null,
    topic: null,
    role_title: 'you',
    felt_count: 0,
    same_count: 0,
    comment_count: 0,
    comments_enabled: true,
    created_at: new Date().toISOString(),
  };
}
