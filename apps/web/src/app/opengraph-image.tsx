// default share card for every non-post route — brand + tagline on the warm
// world, mirroring the per-post card's visual language.
import { ImageResponse } from 'next/og';
import { WORLDS, cardGradientCss, worldBgCss } from '@unsaid/tokens';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = "unsaid — say the thing you've never said";

export default function OgImage() {
  const w = WORLDS.personal;
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          padding: 56,
          background: worldBgCss('personal', false),
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            borderRadius: 48,
            padding: '64px',
            background: cardGradientCss('personal', 'unsaid', false),
            boxShadow: '0 30px 70px rgba(59,51,43,0.18)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 26 }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 4h14a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-7l-4.5 3.5V16H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z"
                fill={w.accent}
                fillOpacity="0.16"
                stroke={w.accent}
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <circle cx="8" cy="10" r="1.15" fill={w.accent} />
              <circle cx="12" cy="10" r="1.15" fill={w.accent} />
              <circle cx="16" cy="10" r="1.15" fill={w.accent} />
            </svg>
            <span style={{ display: 'flex', fontSize: 76, fontWeight: 700, letterSpacing: -2, color: w.accent }}>
              unsaid
            </span>
          </div>
          <span style={{ display: 'flex', fontSize: 40, color: w.ink, fontWeight: 500 }}>
            say the thing you&rsquo;ve never said.
          </span>
          <span style={{ display: 'flex', fontSize: 25, color: w.ink, opacity: 0.65, marginTop: 18 }}>
            an anonymous space for the things you can&rsquo;t say out loud.
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
