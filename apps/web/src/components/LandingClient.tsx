'use client';

// landing orchestrator — signed-out visitors get the entry flow (intro →
// explore); signed-in (onboarded) users get the full-viewport swipe feed inside
// the app shell, with the welcome-reveal overlay mounted ON TOP of it. the
// warm↔cool world reveal lives in <Chrome>.
import type { FeedPost, Mode } from '@unsaid/tokens';
import { useApp } from './AppContext';
import { Chrome } from './Chrome';
import { FeedScreen } from './FeedScreen';
import { EntryFlow } from './entry/EntryFlow';
import { WelcomeBack } from './entry/WelcomeBack';

interface Props {
  feeds: Record<Mode, FeedPost[]>;
}

export function LandingClient({ feeds }: Props) {
  const app = useApp();
  const signedIn = !!app.user && app.onboarded;

  return (
    <Chrome chrome={signedIn} feed={signedIn}>
      {signedIn ? <FeedScreen initialFeeds={feeds} /> : <EntryFlow feeds={feeds} />}
      {/* signed-in users get the short welcome-back over the feed (the long
          first-time welcome already played pre-auth in EntryFlow). */}
      {signedIn && app.welcome && <WelcomeBack variant="welcome-back" onDone={app.clearWelcome} />}
    </Chrome>
  );
}
