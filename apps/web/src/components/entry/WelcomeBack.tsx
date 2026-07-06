'use client';

// welcome — the convergence overlay. ONE component, TWO lengths via `variant`:
//   first-time   → LONG (~4.5s): logo + drifting whispers + breathing bubble →
//                  "some things go unsaid." · "here, they don't have to."
//                  shown ONCE ever (a device's very first open).
//   welcome-back → SHORT (~2.5s): logo + bubble pulse → "welcome back".
//                  shown on every load after the first, and over the feed for
//                  signed-in users — gets the user into the cards fast.
// whispers consolidate into a breathing typing bubble, resolve into the greeting,
// then the layer fades + scales away to reveal what's underneath. tap to skip ·
// reduced-motion safe.
import { useCallback, useEffect, useState } from 'react';
import { THRESHOLD } from '@unsaid/tokens';
import { prefersReducedMotion } from '@/lib/motion';
import { MaskIcon } from '../MaskIcon';

export type WelcomeVariant = 'first-time' | 'welcome-back';

// the welcome is always the warm/personal brand accent, regardless of world.
const accent = '#B06A48';
const { cream, creamSoft, creamFaint } = THRESHOLD;

const WHISPERS = [
  { t: "i'm the strong one. nobody asks if i'm okay.", x: '6%', y: '64%', d: 200, o: 0.5 },
  { t: 'a hundred people to text. nobody to call.', x: '32%', y: '28%', d: 520, o: 0.4 },
  { t: "i love them and i can't wait to leave.", x: '40%', y: '74%', d: 880, o: 0.5 },
  { t: "ninety days. i'm telling strangers.", x: '10%', y: '44%', d: 1180, o: 0.38 },
  { t: "i'm pretending i have a plan.", x: '44%', y: '20%', d: 1460, o: 0.46 },
];

// per-variant timeline — seconds for the CSS animationDelays, ms for auto-finish.
// the short variant skips the whispers and compresses every reveal so the user
// is into the feed in ~2.5s.
const TIMING = {
  'first-time': {
    whispers: true,
    logo: '1.5s', ring: 1.7, bubble: '1.7s', bubbleFloat: '2.6s', dot: 1.9,
    headline: '2.3s', sub: '2.5s', micro: '3.2s', auto: 4300,
  },
  'welcome-back': {
    whispers: false,
    logo: '0.2s', ring: 0.3, bubble: '0.3s', bubbleFloat: '1.3s', dot: 0.5,
    headline: '0.75s', sub: '0.95s', micro: '1.2s', auto: 2300,
  },
} as const;

export function WelcomeBack({ variant, onDone }: { variant: WelcomeVariant; onDone: () => void }) {
  // client-only overlay (mounted from client state), so reading the media query in
  // the initializer is safe and avoids a one-frame flash of the motion version.
  const [reduce] = useState(() => prefersReducedMotion());
  const [leaving, setLeaving] = useState(false);
  const long = variant === 'first-time';
  const t = TIMING[variant];

  const finish = useCallback(() => {
    setLeaving((prev) => {
      if (prev) return prev;
      window.setTimeout(onDone, 620);
      return true;
    });
  }, [onDone]);

  useEffect(() => {
    const id = window.setTimeout(finish, reduce ? 1100 : t.auto);
    return () => window.clearTimeout(id);
  }, [reduce, finish, t.auto]);

  const headline = long ? 'some things go unsaid.' : 'welcome back';
  const sub = long ? "here, they don't have to." : 'breathe. then say yours.';
  const micro = long ? "nobody knows it's you. everybody feels it." : '';

  const a = (s: string) => (reduce ? 'none' : s);
  const hidden = reduce ? 1 : 0;

  const Dot = ({ i }: { i: number }) => (
    <span
      style={{
        width: 11,
        height: 11,
        borderRadius: 999,
        background: cream,
        display: 'block',
        animation: a('dotBreath 1.45s ease-in-out infinite'),
        animationDelay: `${t.dot + i * 0.18}s`,
        opacity: hidden,
      }}
    />
  );

  return (
    <div
      data-threshold="dark"
      onClick={finish}
      role="button"
      tabIndex={0}
      aria-label="continue to the feed"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          finish();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        cursor: 'pointer',
        background: THRESHOLD.welcomeBg,
        overflow: 'hidden',
        opacity: leaving ? 0 : 1,
        transform: leaving ? 'scale(1.05)' : 'scale(1)',
        transition: 'opacity .6s ease, transform .6s cubic-bezier(0.16,1,0.3,1)',
        animation: a('welScene .55s ease'),
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -70,
          right: -50,
          width: 230,
          height: 230,
          borderRadius: 999,
          background: `radial-gradient(circle, ${accent}3a, transparent 70%)`,
          filter: 'blur(8px)',
          animation: a('drift 9s ease-in-out infinite alternate'),
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 80,
          left: -60,
          width: 200,
          height: 200,
          borderRadius: 999,
          background: 'radial-gradient(circle, rgba(241,233,223,0.10), transparent 70%)',
          filter: 'blur(8px)',
          animation: a('drift 11s ease-in-out infinite alternate-reverse'),
        }}
      />

      {/* drifting whispers — first-time (long) only */}
      {!reduce &&
        t.whispers &&
        WHISPERS.map((w, i) => (
          <div
            key={i}
            style={
              {
                position: 'absolute',
                left: w.x,
                top: w.y,
                maxWidth: 230,
                zIndex: 1,
                fontFamily: 'var(--font-confession)',
                fontStyle: 'italic',
                fontSize: 16,
                lineHeight: 1.35,
                color: cream,
                textWrap: 'pretty',
                '--wo': w.o,
                opacity: 0,
                willChange: 'transform, opacity',
                animation: 'whisperRise 2700ms ease-in-out forwards',
                animationDelay: `${w.d}ms`,
              } as React.CSSProperties
            }
          >
            {w.t}
          </div>
        ))}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 36px',
          textAlign: 'center',
          boxSizing: 'border-box',
          background:
            'radial-gradient(58% 42% at 50% 50%, rgba(18,14,12,0.62) 0%, rgba(18,14,12,0.32) 55%, transparent 78%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            marginBottom: 38,
            opacity: hidden,
            animation: a('riseSoft .7s ease forwards'),
            animationDelay: t.logo,
          }}
        >
          <MaskIcon size={22} color={accent} />
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: cream,
            }}
          >
            unsaid
          </span>
        </div>

        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 140,
            height: 140,
            marginBottom: 30,
          }}
        >
          {[0, 1].map((r) => (
            <div
              key={r}
              style={{
                position: 'absolute',
                borderRadius: 999,
                width: r ? 140 : 108,
                height: r ? 140 : 108,
                border: `1.5px solid ${accent}`,
                opacity: reduce ? 0.3 : 0,
                animation: a('breatheRing 3.6s ease-in-out infinite'),
                animationDelay: `${t.ring + r * 0.5}s`,
              }}
            />
          ))}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '18px 22px',
              borderRadius: 26,
              background: `linear-gradient(150deg, ${accent}, ${accent}cc)`,
              boxShadow: `0 16px 40px ${accent}55`,
              transform: reduce ? 'scale(1)' : 'scale(0.6)',
              opacity: hidden,
              animation: a(
                `markPop .7s cubic-bezier(0.16,1,0.3,1) forwards, bubbleFloat 4s ease-in-out ${t.bubbleFloat} infinite`,
              ),
              animationDelay: t.bubble,
            }}
          >
            <Dot i={0} />
            <Dot i={1} />
            <Dot i={2} />
          </div>
        </div>

        <div
          style={{
            fontFamily: 'var(--font-confession)',
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: 34,
            lineHeight: 1.1,
            color: cream,
            letterSpacing: '-0.01em',
            opacity: hidden,
            animation: a('riseSoft .7s ease forwards'),
            animationDelay: t.headline,
          }}
        >
          {headline}
        </div>

        <div
          style={{
            marginTop: 14,
            maxWidth: 280,
            fontFamily: 'var(--font-ui)',
            fontSize: 15,
            lineHeight: 1.5,
            color: creamSoft,
            opacity: hidden,
            animation: a('riseSoft .7s ease forwards'),
            animationDelay: t.sub,
          }}
        >
          {sub}
        </div>

        {micro && (
          <div
            style={{
              marginTop: 30,
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              color: creamFaint,
              opacity: hidden,
              animation: a('riseSoft .7s ease forwards, welcomePulse 2.4s ease-in-out 3.6s infinite'),
              animationDelay: t.micro,
            }}
          >
            {micro}
          </div>
        )}
      </div>

      {/* tap-to-skip hint — first-time (long) only; the short one is over before it'd matter */}
      {long && (
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: 'var(--font-ui)',
            fontSize: 12,
            color: creamFaint,
            letterSpacing: '0.02em',
            opacity: 0,
            animation: a('riseSoft .6s ease forwards'),
            animationDelay: '3.4s',
          }}
        >
          tap to look around
        </div>
      )}
    </div>
  );
}
