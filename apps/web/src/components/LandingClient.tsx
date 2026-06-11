'use client';

// landing — hero + mode toggle + read-only deck, with the warm↔cool
// circular world reveal from unsaid-app.jsx (AmbientMorph, simplified for
// the open web). reactions go live after magic-link sign-in.
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { react } from '@unsaid/api';
import type { FeedPost, Mode, ReactionType } from '@unsaid/tokens';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { worldVars } from '@/lib/theme';
import { MaskIcon } from './MaskIcon';
import { ModeToggle } from './ModeToggle';
import { CardDeck } from './CardDeck';
import { SignInModal } from './SignInModal';
import { ComposeModal } from './ComposeModal';
import styles from './LandingClient.module.css';

interface Props {
  feeds: Record<Mode, FeedPost[]>;
}

export function LandingClient({ feeds }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('personal');
  const [baseMode, setBaseMode] = useState<Mode>('personal');
  const [reveal, setReveal] = useState<{ mode: Mode; key: number } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [reactions, setReactions] = useState<Record<string, ReactionType | null>>({});
  const revealTimer = useRef<number>(0);

  // session
  useEffect(() => {
    const sb = createSupabaseBrowserClient();
    sb.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setReveal({ mode: next, key: Date.now() });
    // safety: settle even if animationend is missed
    window.clearTimeout(revealTimer.current);
    revealTimer.current = window.setTimeout(() => {
      setBaseMode(next);
      setReveal(null);
    }, 900);
  };

  const settleReveal = () => {
    if (!reveal) return;
    window.clearTimeout(revealTimer.current);
    setBaseMode(reveal.mode);
    setReveal(null);
  };

  const handleReact = useCallback(
    (post: FeedPost, type: ReactionType) => {
      if (!user) {
        setShowSignIn(true);
        return;
      }
      const sb = createSupabaseBrowserClient();
      const current = reactions[post.id] ?? null;
      const next = current === type ? null : type;
      setReactions((r) => ({ ...r, [post.id]: next }));
      react(sb, post.id, type).catch(() => {
        setReactions((r) => ({ ...r, [post.id]: current }));
      });
    },
    [user, reactions],
  );

  const handleReply = useCallback(
    (post: FeedPost) => {
      if (!user) {
        setShowSignIn(true);
        return;
      }
      router.push(`/p/${post.id}`);
    },
    [user, router],
  );

  const signOut = async () => {
    await createSupabaseBrowserClient().auth.signOut();
  };

  const modalOpen = showSignIn || showCompose;
  const revealOrigin: CSSProperties =
    reveal?.mode === 'professional' ? ({ '--ox': '72%', '--oy': '180px' } as CSSProperties) : ({ '--ox': '28%', '--oy': '180px' } as CSSProperties);

  return (
    <div className={styles.shell}>
      {/* ambient world background — settled base + circular reveal on switch */}
      <div className={`themed ${styles.bg}`} style={worldVars(baseMode)} aria-hidden="true" />
      {reveal && (
        <div
          key={reveal.key}
          className={`themed ${styles.bg} ${styles.bgReveal}`}
          style={{ ...worldVars(reveal.mode), ...revealOrigin }}
          onAnimationEnd={settleReveal}
          aria-hidden="true"
        />
      )}

      <div className={`themed ${styles.content}`} style={worldVars(mode)}>
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
            <span className={styles.storeBadge}>
              <svg width="14" height="16" viewBox="0 0 814 1000" fill="currentColor" aria-hidden="true">
                <path d="M788 341c-6 4-110 63-110 192 0 150 132 203 136 204-1 3-21 73-70 144-43 63-89 125-159 125s-88-41-169-41c-79 0-107 42-171 42S136 949 85 876C26 791 0 661 0 538c0-198 129-303 256-303 67 0 123 44 165 44 40 0 103-47 179-47 29 0 133 3 188 109zM554 159c32-38 55-91 55-144 0-7-1-15-2-21-52 2-114 35-152 78-29 33-57 86-57 140 0 8 1 16 2 19 3 1 9 2 14 2 47 0 106-31 140-74z" />
              </svg>
              ios app — coming soon
            </span>
          </div>
          <div className={styles.toggleRow}>
            <ModeToggle mode={mode} onChange={switchMode} />
          </div>
        </header>

        <main>
          <CardDeck
            posts={feeds[mode]}
            mode={mode}
            reactions={reactions}
            onReact={handleReact}
            onReply={handleReply}
            paused={modalOpen}
          />
        </main>

        {user ? (
          <button type="button" className={styles.spillBtn} onClick={() => setShowCompose(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M14 4l6 6M3 21l1.2-4.2L15 6l3 3L7.2 19.8 3 21Z"
                stroke="#fff"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
            spill it
          </button>
        ) : (
          <div className={styles.quietCta}>
            <Link href="/auth" className={styles.quietLink}>
              already feeling it? get in quietly →
            </Link>
          </div>
        )}

        <footer className={styles.footer}>
          <nav className={styles.footerLinks}>
            <Link href="/legal/privacy">privacy</Link>
            <span aria-hidden="true">·</span>
            <Link href="/legal/anonymous">what anonymous means here</Link>
            {user && (
              <>
                <span aria-hidden="true">·</span>
                <button type="button" className={styles.footerBtn} onClick={() => void signOut()}>
                  slip out quietly
                </button>
              </>
            )}
          </nav>
          <p className={styles.footerNote}>the app for things you can&rsquo;t say. 18+ only.</p>
        </footer>
      </div>

      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
      {showCompose && <ComposeModal mode={mode} onClose={() => setShowCompose(false)} />}
    </div>
  );
}
