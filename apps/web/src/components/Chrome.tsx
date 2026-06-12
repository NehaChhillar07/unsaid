'use client';

// app shell — ambient world background + circular reveal, persistent header
// (mode toggle · bell · you), and the prototype-style bottom tab bar on small
// screens. global compose / sign-in overlays live here so every screen shares
// them. ported from unsaid-app.jsx (AmbientMorph) + unsaid-screens.jsx (TabBar).
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { Mode } from '@unsaid/tokens';
import { worldVars } from '@/lib/theme';
import { useApp } from './AppContext';
import { MaskIcon } from './MaskIcon';
import { ModeToggle } from './ModeToggle';
import { ThemeToggle } from './ThemeToggle';
import { SignInModal } from './SignInModal';
import { ComposeModal } from './ComposeModal';
import styles from './Chrome.module.css';

interface Props {
  children: ReactNode;
  /** show the header + tab bar (signed-in app shell) */
  chrome?: boolean;
  /** fixed full-viewport screen (the swipe feed) — no page scroll */
  feed?: boolean;
}

export function Chrome({ children, chrome = true, feed = false }: Props) {
  const app = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const { mode } = app;

  // circular world reveal — settled base + animating layer on switch
  const [baseMode, setBaseMode] = useState<Mode>(mode);
  const [reveal, setReveal] = useState<{ mode: Mode; key: number } | null>(null);
  const revealTimer = useRef<number>(0);
  const prevMode = useRef<Mode>(mode);

  useEffect(() => {
    if (prevMode.current === mode) return;
    prevMode.current = mode;
    setReveal({ mode, key: Date.now() });
    window.clearTimeout(revealTimer.current);
    revealTimer.current = window.setTimeout(() => {
      setBaseMode(mode);
      setReveal(null);
    }, 900);
  }, [mode]);

  const settleReveal = () => {
    if (!reveal) return;
    window.clearTimeout(revealTimer.current);
    setBaseMode(reveal.mode);
    setReveal(null);
  };

  const revealOrigin: CSSProperties = (
    reveal?.mode === 'professional'
      ? { '--ox': '72%', '--oy': '120px' }
      : { '--ox': '28%', '--oy': '120px' }
  ) as CSSProperties;

  const unread = app.unread[mode];
  const tab = pathname === '/felt' ? 'felt' : pathname === '/you' ? 'you' : 'feel';

  const onPublished = () => {
    app.closeCompose();
    app.bumpFeed();
    router.refresh();
  };

  return (
    <div className={`${styles.shell}${feed ? ` ${styles.shellFeed}` : ''}`}>
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
        {chrome && (
          <header className={styles.header}>
            <Link href="/" className={styles.brand} aria-label="unsaid — feed">
              <MaskIcon size={24} color="var(--accent)" />
              <span className={styles.brandWord}>unsaid</span>
            </Link>
            <div className={styles.headerToggle}>
              <ModeToggle mode={mode} onChange={app.setMode} />
            </div>
            <ThemeToggle />
            <nav className={styles.headerNav} aria-label="app">
              <Link
                href="/felt"
                className={`${styles.iconBtn}${tab === 'felt' ? ` ${styles.iconBtnOn}` : ''}`}
                aria-label={unread > 0 ? `felt — ${unread} unread` : 'felt'}
              >
                <BellIcon />
                {unread > 0 && <span className={styles.badge}>{unread > 9 ? '9+' : unread}</span>}
              </Link>
              <Link
                href="/you"
                className={`${styles.iconBtn}${tab === 'you' ? ` ${styles.iconBtnOn}` : ''}`}
                aria-label="your space"
              >
                <YouIcon />
              </Link>
            </nav>
          </header>
        )}

        <main className={feed ? styles.mainFeed : chrome ? styles.main : styles.mainBare}>
          {children}
        </main>

        {chrome && (
          <nav className={styles.tabBar} aria-label="tabs">
            <TabItem
              label="feel"
              active={tab === 'feel'}
              onClick={() => router.push('/')}
              icon={<FeelIcon />}
            />
            <button
              type="button"
              className={styles.spillTab}
              onClick={() => app.openCompose()}
              aria-label="spill it"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M14 4l6 6M3 21l1.2-4.2L15 6l3 3L7.2 19.8 3 21Z"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <TabItem
              label="felt"
              active={tab === 'felt'}
              onClick={() => router.push('/felt')}
              icon={<BellIcon />}
              badge={unread}
            />
            <TabItem
              label="you"
              active={tab === 'you'}
              onClick={() => router.push('/you')}
              icon={<YouIcon />}
            />
          </nav>
        )}
      </div>

      {app.signInOpen && <SignInModal onClose={() => app.setSignInOpen(false)} />}
      {app.compose && (
        <div className="themed" style={worldVars(app.compose.mode)}>
          <ComposeModal
            mode={app.compose.mode}
            initialBody={app.compose.initialBody}
            initialMood={app.compose.initialMood}
            onClose={app.closeCompose}
            onPublished={onPublished}
          />
        </div>
      )}
    </div>
  );
}

function TabItem({
  label,
  active,
  onClick,
  icon,
  badge = 0,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  badge?: number;
}) {
  return (
    <button
      type="button"
      className={`${styles.tabItem}${active ? ` ${styles.tabItemOn}` : ''}`}
      onClick={onClick}
    >
      <span className={styles.tabIcon}>
        {icon}
        {badge > 0 && <span className={styles.badge}>{badge > 9 ? '9+' : badge}</span>}
      </span>
      <span className={styles.tabLabel}>{label}</span>
    </button>
  );
}

function FeelIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="6" width="16" height="13" rx="3.5" stroke="currentColor" strokeWidth="2.1" />
      <path d="M7 3.5h10" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 9a6 6 0 1112 0c0 4 1.4 5.4 2 6H4c.6-.6 2-2 2-6Z"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinejoin="round"
      />
      <path d="M10 19a2 2 0 004 0" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}

function YouIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8.5" r="3.6" stroke="currentColor" strokeWidth="2.1" />
      <path
        d="M5.5 19.5c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
}
