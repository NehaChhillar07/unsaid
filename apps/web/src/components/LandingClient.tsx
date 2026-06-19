'use client';

// landing orchestrator — signed-out visitors get the hero + read-only deck;
// signed-in (onboarded) users get the full-viewport swipe feed inside the
// app shell. the warm↔cool world reveal lives in <Chrome>.
import { useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FeedPost, Mode, ReactionType } from '@unsaid/tokens';
import { useApp } from './AppContext';
import { Chrome } from './Chrome';
import { MaskIcon } from './MaskIcon';
import { ModeToggle } from './ModeToggle';
import { CardDeck } from './CardDeck';
import { FeedScreen } from './FeedScreen';
import styles from './LandingClient.module.css';

interface Props {
  feeds: Record<Mode, FeedPost[]>;
}

export function LandingClient({ feeds }: Props) {
  const app = useApp();
  const signedIn = !!app.user && app.onboarded;

  return (
    <Chrome chrome={signedIn} feed={signedIn}>
      {signedIn ? <FeedScreen initialFeeds={feeds} /> : <SignedOutLanding feeds={feeds} />}
    </Chrome>
  );
}

const NO_REACTIONS: Record<string, ReactionType | null> = {};

function SignedOutLanding({ feeds }: Props) {
  const app = useApp();
  const router = useRouter();
  const { mode } = app;

  // reacting and replying need a self first
  const handleReact = useCallback(() => app.setSignInOpen(true), [app]);

  const handleReply = useCallback(
    (post: FeedPost) => {
      router.push(`/p/${post.id}`);
    },
    [router],
  );

  return (
    <div className={styles.content}>
      <header className={styles.hero}>
        <div className={styles.brandRow}>
          <span className={styles.brandIcon}>
            <MaskIcon size={38} color="var(--accent)" />
          </span>
          <h1 className={styles.brand}>unsaid</h1>
        </div>
        <p className={styles.tagline}>say the thing you&rsquo;ve never said.</p>
        <p className={styles.sub}>nobody knows it&rsquo;s you. everybody feels it.</p>
        <div className={styles.badgeRow}>
          <span className={styles.storeBadge}>🤍 lives right here — add it to your home screen</span>
        </div>
        <div className={styles.toggleRow}>
          <ModeToggle mode={mode} onChange={app.setMode} />
        </div>
      </header>

      <main>
        <CardDeck
          posts={feeds[mode]}
          mode={mode}
          reactions={NO_REACTIONS}
          onReact={handleReact}
          onNotForMe={handleReact}
          onReply={handleReply}
          paused={app.signInOpen || !!app.compose}
        />
      </main>

      {app.user && !app.onboarded && app.identities !== null ? (
        <div className={styles.quietCta}>
          <Link href="/welcome" className={styles.quietLink}>
            one tiny step left — set up your two selves →
          </Link>
        </div>
      ) : !app.user ? (
        <div className={styles.quietCta}>
          <Link href="/auth" className={styles.quietLink}>
            already feeling it? get in quietly →
          </Link>
        </div>
      ) : null}

      <footer className={styles.footer}>
        <nav className={styles.footerLinks}>
          <Link href="/legal/privacy">privacy</Link>
          <span aria-hidden="true">·</span>
          <Link href="/legal/anonymous">what anonymous means here</Link>
          {app.user && (
            <>
              <span aria-hidden="true">·</span>
              <button type="button" className={styles.footerBtn} onClick={() => void app.signOut()}>
                slip out quietly
              </button>
            </>
          )}
        </nav>
        <p className={styles.footerNote}>the app for things you can&rsquo;t say. 18+ only.</p>
      </footer>
    </div>
  );
}
