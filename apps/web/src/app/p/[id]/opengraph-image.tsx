// pastel share card — the share-card growth engine. 1200×630, world gradient,
// card gradient panel, role badge pill, serif (Lora) confession body,
// small "unsaid" watermark.
import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';
import {
  MOODS,
  WORLDS,
  cardGradientCss,
  formatCount,
  worldBgCss,
  type FeedPost,
  type Mode,
} from '@unsaid/tokens';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'an unsaid confession';

async function loadLora(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Lora:wght@500&display=swap',
    ).then((r) => r.text());
    const match = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/);
    if (!match || !match[1]) return null;
    return await fetch(match[1]).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

async function loadPost(id: string): Promise<FeedPost | null> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    const sb = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data } = await sb.from('feed_posts').select('*').eq('id', id).maybeSingle();
    return (data as FeedPost | null) ?? null;
  } catch {
    return null;
  }
}

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [post, lora] = await Promise.all([loadPost(id), loadLora()]);

  const mode: Mode = post?.mode ?? 'personal';
  const w = WORLDS[mode];
  const body = post
    ? post.body.length > 240
      ? `${post.body.slice(0, 240).trimEnd()}…`
      : post.body
    : "say the thing you've never said.";
  const role = post?.role_title ?? 'a stranger';
  const mood = post?.mood ? MOODS[post.mood] : null;
  const counts = post
    ? `🤍 ${formatCount(post.felt_count)} felt this   ·   💬 ${formatCount(post.comment_count)} replies`
    : '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          padding: 56,
          background: worldBgCss(mode, false),
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderRadius: 48,
            padding: '48px 56px',
            background: cardGradientCss(mode, post?.id ?? 'unsaid', false),
            boxShadow: '0 30px 70px rgba(59,51,43,0.18)',
          }}
        >
          {/* header: role pill + mood */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 26px 12px 20px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.55)',
                color: w.ink,
                fontSize: 26,
                fontWeight: 500,
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 4h14a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-7l-4.5 3.5V16H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z"
                  fill={w.ink}
                  fillOpacity="0.16"
                  stroke={w.ink}
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <circle cx="8" cy="10" r="1.15" fill={w.ink} />
                <circle cx="12" cy="10" r="1.15" fill={w.ink} />
                <circle cx="16" cy="10" r="1.15" fill={w.ink} />
              </svg>
              <span style={{ display: 'flex' }}>{role}</span>
            </div>
            {mood ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 22px',
                  borderRadius: 999,
                  background: `${mood.tint}26`,
                  color: mood.tint,
                  fontSize: 24,
                  fontWeight: 500,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    width: 12,
                    height: 12,
                    borderRadius: 999,
                    background: mood.tint,
                  }}
                />
                <span style={{ display: 'flex' }}>{mood.label}</span>
              </div>
            ) : (
              <div style={{ display: 'flex' }} />
            )}
          </div>

          {/* confession body */}
          <div
            style={{
              display: 'flex',
              flex: 1,
              alignItems: 'center',
              padding: '28px 0',
            }}
          >
            <p
              style={{
                fontFamily: lora ? 'Lora' : 'serif',
                fontSize: body.length > 150 ? 40 : 52,
                lineHeight: 1.4,
                color: w.ink,
                margin: 0,
                fontWeight: 500,
              }}
            >
              {body}
            </p>
          </div>

          {/* footer: counts + watermark */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                display: 'flex',
                fontSize: 24,
                color: w.ink,
                opacity: 0.7,
              }}
            >
              {counts}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span
                style={{
                  display: 'flex',
                  fontSize: 30,
                  fontWeight: 700,
                  color: w.accent,
                  letterSpacing: -1,
                }}
              >
                unsaid
              </span>
              <span style={{ display: 'flex', fontSize: 22, color: w.ink, opacity: 0.6 }}>
                — the app for things you can&rsquo;t say
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: lora
        ? [{ name: 'Lora', data: lora, style: 'normal' as const, weight: 500 as const }]
        : undefined,
    },
  );
}
