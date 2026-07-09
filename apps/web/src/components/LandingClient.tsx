'use client';

// landing orchestrator — no gate: everyone lands straight on the swipe feed
// inside the app shell (an anonymous session is created silently in
// AppContext). the optional "make it yours" prompt surfaces after a little
// browsing. the warm↔cool world reveal lives in <Chrome>.
import { useEffect, useState } from 'react';
import type { FeedPost, Mode } from '@unsaid/tokens';
import { useApp } from './AppContext';
import { Chrome } from './Chrome';
import { FeedScreen } from './FeedScreen';
import { PersonalizePrompt } from './PersonalizePrompt';
import { WelcomeBack } from './entry/WelcomeBack';

interface Props {
  feeds: Record<Mode, FeedPost[]>;
}

export function LandingClient({ feeds }: Props) {
  const app = useApp();
  // returning, set-up users: the pre-paint script in layout.tsx already raised the
  // #greet-cover (welcome-back bg) over the SSR feed. read that decision on mount,
  // then hand off to <WelcomeBack> and lift the static bridge — same frame, so the
  // welcome-back leads instead of flashing over an already-painted feed.
  const [greet, setGreet] = useState(false);
  useEffect(() => {
    if (document.documentElement.dataset.greet === '1') {
      setGreet(true);
      delete document.documentElement.dataset.greet;
    }
  }, []);

  // the greet path (cold load) and app.welcome (just-onboarded hand-off from
  // /welcome) both resolve to the same short welcome-back over the feed.
  const showWelcome = greet || app.welcome != null;
  const finishWelcome = () => {
    setGreet(false);
    app.clearWelcome();
  };

  return (
    <Chrome chrome feed>
      <FeedScreen initialFeeds={feeds} />
      <PersonalizePrompt />
      {showWelcome && <WelcomeBack variant="welcome-back" onDone={finishWelcome} />}
    </Chrome>
  );
}
