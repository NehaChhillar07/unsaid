'use client';

// explore — no-account home preview, ported from unsaid_BUILD_SPEC.md §3.
// reuses the production CardDeck + ConfessionCard (so it feels exactly like the
// real feed the visitor lands on next), restyled as a dark "threshold" scene.
// the one conversion point — "get in quietly" — lives in the end-state + footer.
import { useMemo, useState } from 'react';
import { THRESHOLD, type FeedPost, type Mode } from '@unsaid/tokens';
import { useApp } from '../AppContext';
import { MaskIcon } from '../MaskIcon';
import { ModeToggle } from '../ModeToggle';
import { CardDeck } from '../CardDeck';
import { makeVisitorPost } from '@/lib/demoFeed';

const accent = 'var(--accent)';
const { cream, creamSoft, creamFaint } = THRESHOLD;

export function ExploreLanding({
  feeds,
  submitted,
  onGetIn,
}: {
  feeds: Record<Mode, FeedPost[]>;
  /** the visitor's just-typed confession — shown as the top card if present */
  submitted?: string | null;
  onGetIn: () => void;
}) {
  const app = useApp();
  const { mode } = app;
  const [resetKey, setResetKey] = useState(0);

  // real anonymous feed only — when it's empty the deck's end state invites
  // the visitor to spill first (fresh community, no canned cards)
  const posts = useMemo(() => {
    const base = feeds[mode];
    return submitted ? [makeVisitorPost(mode, submitted), ...base] : base;
  }, [feeds, mode, submitted]);

  // reacting / replying need a self — gently surface the sign-in modal
  const nudge = () => app.setSignInOpen(true);
  // "felt this" plays its heart bloom first, then nudges to sign in to keep it.
  const feltNudge = () => window.setTimeout(() => app.setSignInOpen(true), 750);
  // "not for me" is a private skip — no account needed; the card just drifts away.
  const skip = () => {};

  const endState = (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '0 14px',
        animation: 'riseSoft .5s ease',
      }}
    >
      <MaskIcon size={34} color={accent} />
      <div
        style={{
          fontFamily: 'var(--font-confession)',
          fontStyle: 'italic',
          fontSize: 26,
          color: cream,
          lineHeight: 1.3,
          margin: '18px 0 10px',
          maxWidth: 290,
        }}
      >
        that was just the surface.
      </div>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14.5, color: creamSoft, maxWidth: 270, lineHeight: 1.5 }}>
        there&rsquo;s a whole feed under it &mdash; and a place to say yours.
      </div>
      <button
        type="button"
        onClick={onGetIn}
        style={{
          marginTop: 26,
          height: 54,
          padding: '0 30px',
          borderRadius: 16,
          border: 'none',
          cursor: 'pointer',
          background: cream,
          color: '#1A1512',
          fontFamily: 'var(--font-ui)',
          fontSize: 16,
          fontWeight: 600,
          boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
        }}
      >
        get in quietly &rarr;
      </button>
      <button
        type="button"
        onClick={() => setResetKey((k) => k + 1)}
        style={{
          marginTop: 14,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          color: creamFaint,
          textDecoration: 'underline',
          textUnderlineOffset: 3,
        }}
      >
        see them again
      </button>
    </div>
  );

  return (
    <div
      data-threshold="dark"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        overflow: 'hidden',
        background: THRESHOLD.exploreBg,
        display: 'flex',
        flexDirection: 'column',
        padding: '60px 4px 0',
        boxSizing: 'border-box',
        animation: 'welScene .45s ease',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
          <MaskIcon size={22} color={accent} />
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 27,
              fontWeight: 700,
              letterSpacing: '-0.035em',
              color: cream,
            }}
          >
            unsaid
          </span>
        </div>
        <div
          style={{
            fontFamily: 'var(--font-confession)',
            fontStyle: 'italic',
            fontSize: 15.5,
            color: creamSoft,
            marginBottom: 16,
          }}
        >
          say the thing you&rsquo;ve never said.
        </div>
        <ModeToggle mode={mode} onChange={app.setMode} />
      </div>

      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', marginTop: 6 }}>
        <CardDeck
          key={resetKey}
          posts={posts}
          mode={mode}
          reactions={{}}
          onReact={feltNudge}
          onNotForMe={skip}
          onReply={nudge}
          paused={app.signInOpen || !!app.compose}
          caughtUpContent={endState}
        />
      </div>

      <div style={{ flexShrink: 0, padding: '14px 0 28px', textAlign: 'center' }}>
        <button
          type="button"
          onClick={onGetIn}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
            fontSize: 14.5,
            color: creamSoft,
          }}
        >
          already feeling it?{' '}
          <span style={{ color: cream, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}>
            get in quietly &rarr;
          </span>
        </button>
      </div>
    </div>
  );
}
