'use client';

// entry orchestrator for signed-out visitors — the client state machine that
// sequences welcome → (intro) → explore before the (route-based) sign-in. the
// welcome animation plays on EVERY load, but only the device's first-ever open
// gets the LONG version + the typing intro:
//   first time  → long welcome → intro ("say the thing…") → explore feed
//   after that  → short welcome (~2.5s) → explore feed (straight to the cards)
// the phase is decided in an effect (never during render) so SSR/hydration stay
// matched and a signed-in user never flashes the entry scenes.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { THRESHOLD, type FeedPost, type Mode } from '@unsaid/tokens';
import { useApp } from '../AppContext';
import { WelcomeBack } from './WelcomeBack';
import { IntroHero } from './IntroHero';
import { ExploreLanding } from './ExploreLanding';

// device-scoped flag: has the long first-time welcome already played once?
const SEEN_WELCOME = 'unsaid:seenWelcome';

export function EntryFlow({ feeds }: { feeds: Record<Mode, FeedPost[]> }) {
  const app = useApp();
  const router = useRouter();
  const [phase, setPhase] = useState<'welcome' | 'intro' | 'explore' | null>(null);
  // first-ever open on this device → long welcome + typing intro; else short.
  const [firstTime, setFirstTime] = useState(false);
  // dev/test: ?intro on the URL always replays long welcome → typing intro
  // (without burning the seen flag), so the send animation can be retried.
  const [forceIntro, setForceIntro] = useState(false);
  // the visitor's confession typed on the intro hero — carried into explore as
  // the top card so they see their own unsaid land in the feed before sign-in.
  const [submitted, setSubmitted] = useState<string | null>(null);

  // open on the welcome animation once auth is known (signed-out only; deciding
  // in an effect avoids a flash for signed-in users + keeps hydration matched).
  useEffect(() => {
    if (!app.authReady) return;
    let seen = false;
    try {
      seen = window.localStorage.getItem(SEEN_WELCOME) === '1';
    } catch {
      /* private mode — treat as first time */
    }
    const force = new URLSearchParams(window.location.search).has('intro');
    setForceIntro(force);
    setFirstTime(force || !seen);
    setPhase('welcome');
  }, [app.authReady]);

  // after the welcome animation: first-timers learn to post via the intro;
  // returning visitors skip straight to the feed.
  const finishWelcome = () => {
    if (firstTime) {
      if (!forceIntro) {
        try {
          window.localStorage.setItem(SEEN_WELCOME, '1');
        } catch {
          /* ignore */
        }
      }
      setPhase('intro');
    } else {
      setPhase('explore');
    }
  };

  const finishIntro = (confession?: string) => {
    if (confession) setSubmitted(confession);
    setPhase('explore');
  };

  const getIn = () => router.push('/auth');

  // the welcome animation — long the first time (→ intro), short every load after
  // (→ feed). tap to skip; auto-advances (~4.5s long / ~2.5s short).
  if (phase === 'welcome')
    return <WelcomeBack variant={firstTime ? 'first-time' : 'welcome-back'} onDone={finishWelcome} />;
  if (phase === 'intro') return <IntroHero onDone={finishIntro} />;
  if (phase === 'explore')
    return <ExploreLanding feeds={feeds} submitted={submitted} onGetIn={getIn} />;

  // neutral dark first frame while auth resolves — blends into either scene
  return (
    <div
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, zIndex: 40, background: THRESHOLD.introBg }}
    />
  );
}
