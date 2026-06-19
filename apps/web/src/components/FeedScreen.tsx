'use client';

// signed-in feed — a fixed full-viewport swipe screen. personalized reads
// (feed_posts excludes seen + muted for the session user), markSeen on every
// committed swipe, 45s "new drops" polling, reaction burst + ribbon, and the
// save / report / mute action sheet.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  countNewSince,
  dismiss,
  fetchFeed,
  fetchSaved,
  markSeen,
  muteAuthorOf,
  react,
  report,
  toggleSave,
} from '@unsaid/api';
import type { FeedPost, Mode, ReactionType } from '@unsaid/tokens';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { prefersReducedMotion } from '@/lib/motion';
import { useApp } from './AppContext';
import { CardDeck } from './CardDeck';
import { CardActionSheet, type ReportReason } from './CardActionSheet';
import { CommentsSheet } from './CommentsSheet';
import styles from './FeedScreen.module.css';

interface Particle {
  id: number;
  x: number;
  y: number;
  dx: number;
  rot: number;
  size: number;
  dur: number;
  glyph: string;
}

const MODES: Mode[] = ['personal', 'professional'];
const NEW_DROPS_POLL_MS = 45_000;

export function FeedScreen({ initialFeeds }: { initialFeeds: Record<Mode, FeedPost[]> }) {
  const app = useApp();
  const { mode } = app;
  const sb = useMemo(() => createSupabaseBrowserClient(), []);

  const [feeds, setFeeds] = useState<Record<Mode, FeedPost[]>>(initialFeeds);
  const [reactions, setReactions] = useState<Record<string, ReactionType | null>>({});
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [actionPost, setActionPost] = useState<FeedPost | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [commentsPost, setCommentsPost] = useState<FeedPost | null>(null);
  const [newCount, setNewCount] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [glow, setGlow] = useState<{ x: number; y: number; key: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const committedIds = useRef<Set<string>>(new Set());
  const toastTimer = useRef(0);
  // ref mirror so the new-drops poll reads fresh state without re-arming
  const feedsRef = useRef(feeds);
  feedsRef.current = feeds;

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2000);
  }, []);

  // personalized feed (the SSR payload is the anonymous read)
  const refetchFeeds = useCallback(async () => {
    try {
      const [personal, professional] = await Promise.all(
        MODES.map((m) => fetchFeed(sb, m, 'newest')),
      );
      if (!personal || !professional) return;
      const seenHere = committedIds.current;
      setFeeds({
        personal: personal.posts.filter((p) => !seenHere.has(p.id)),
        professional: professional.posts.filter((p) => !seenHere.has(p.id)),
      });
    } catch {
      // keep what we have
    }
  }, [sb]);

  useEffect(() => {
    void refetchFeeds();
  }, [refetchFeeds, app.feedVersion]);

  // saved-state for the action sheet
  useEffect(() => {
    let on = true;
    Promise.all(MODES.map((m) => fetchSaved(sb, m)))
      .then((lists) => {
        if (!on) return;
        setSavedIds(new Set(lists.flat().map((p) => p.id)));
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, [sb]);

  // "N new drops" polling
  useEffect(() => {
    setNewCount(0);
    const tick = async () => {
      const newest = feedsRef.current[mode][0]?.created_at;
      if (!newest) return;
      try {
        const n = await countNewSince(sb, mode, newest);
        setNewCount(n);
      } catch {
        // quiet
      }
    };
    const t = window.setInterval(() => void tick(), NEW_DROPS_POLL_MS);
    return () => window.clearInterval(t);
  }, [sb, mode]);

  const acceptNew = useCallback(async () => {
    setNewCount(0);
    await refetchFeeds();
    flash('fresh drops added 🤍');
  }, [refetchFeeds, flash]);

  // ── reactions ────────────────────────────────────────────────
  // subtle & warm: a soft glow blooms from the button + a few hearts drift up.
  const PARTICLE_N = 5;
  const burst = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (prefersReducedMotion()) return;
    const r = e.currentTarget.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const id0 = Date.now();
    setGlow({ x: cx, y: cy, key: id0 });
    window.setTimeout(() => setGlow((g) => (g && g.key === id0 ? null : g)), 650);
    const glyphs = ['🤍', '💗', '🩷'];
    const ps: Particle[] = Array.from({ length: PARTICLE_N }, (_, i) => ({
      id: id0 + i,
      x: cx - 12 + (Math.random() * 24 - 12),
      y: r.top - 4,
      dx: Math.random() * 56 - 28,
      rot: Math.random() * 36 - 18,
      size: 14 + Math.random() * 10,
      dur: 1000 + Math.random() * 500,
      glyph: glyphs[Math.floor(Math.random() * glyphs.length)] ?? '🤍',
    }));
    setParticles((p) => [...p, ...ps]);
    window.setTimeout(() => {
      setParticles((p) => p.filter((q) => q.id < id0 || q.id >= id0 + PARTICLE_N));
    }, 1700);
  }, []);

  // only "felt this" reacts now; "not for me" is a private dismissal (below).
  const handleReact = useCallback(
    (post: FeedPost, type: ReactionType, e?: React.MouseEvent<HTMLButtonElement>) => {
      const current = reactions[post.id] ?? null;
      const next = current === type ? null : type;
      setReactions((r) => ({ ...r, [post.id]: next }));
      if (next === 'felt' && e) burst(e);
      react(sb, post.id, type).catch(() => {
        setReactions((r) => ({ ...r, [post.id]: current }));
      });
    },
    [sb, reactions, burst],
  );

  // "not for me" — private skip: dismiss (won't recur, author never sees it).
  const handleNotForMe = useCallback(
    (post: FeedPost) => {
      committedIds.current.add(post.id);
      void dismiss(sb, post).catch(() => {});
    },
    [sb],
  );

  // ── seen tracking ────────────────────────────────────────────
  const handleCommit = useCallback(
    (post: FeedPost) => {
      committedIds.current.add(post.id);
      void markSeen(sb, post.id).catch(() => {});
    },
    [sb],
  );

  // ── action sheet ─────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const post = actionPost;
    if (!post) return;
    const isSaved = savedIds.has(post.id);
    setActionBusy(true);
    try {
      await toggleSave(sb, post.id, !isSaved);
      setSavedIds((s) => {
        const n = new Set(s);
        if (isSaved) n.delete(post.id);
        else n.add(post.id);
        return n;
      });
      flash(isSaved ? 'let go of that one' : 'kept close 🤍');
      setActionPost(null);
    } catch {
      flash('that slipped — try again in a moment');
    } finally {
      setActionBusy(false);
    }
  }, [sb, actionPost, savedIds, flash]);

  const handleReport = useCallback(
    async (reason: ReportReason) => {
      const post = actionPost;
      if (!post) return;
      setActionBusy(true);
      try {
        await report(sb, { type: 'post', id: post.id }, reason);
        flash('thank you. a human will look at this one.');
        setActionPost(null);
      } catch {
        flash('that slipped — try again in a moment');
      } finally {
        setActionBusy(false);
      }
    },
    [sb, actionPost, flash],
  );

  const handleMute = useCallback(async () => {
    const post = actionPost;
    if (!post) return;
    setActionBusy(true);
    try {
      await muteAuthorOf(sb, { type: 'post', id: post.id });
      // drop the card now; a quiet refetch clears the author's other posts
      // (author ids are never exposed client-side — the server filters).
      const seenHere = committedIds.current;
      setFeeds((f) => ({
        ...f,
        [post.mode]: f[post.mode].filter((p) => p.id !== post.id && !seenHere.has(p.id)),
      }));
      setActionPost(null);
      flash('you won’t hear that voice again');
      void refetchFeeds();
    } catch {
      flash('that slipped — try again in a moment');
    } finally {
      setActionBusy(false);
    }
  }, [sb, actionPost, flash, refetchFeeds]);

  // ── comments ─────────────────────────────────────────────────
  const bumpCommentCount = useCallback((postId: string) => {
    setFeeds((f) => {
      const out = { ...f };
      for (const m of MODES) {
        out[m] = f[m].map((p) =>
          p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p,
        );
      }
      return out;
    });
    setCommentsPost((c) => (c && c.id === postId ? { ...c, comment_count: c.comment_count + 1 } : c));
  }, []);

  const overlayOpen = !!(actionPost || commentsPost || app.compose || app.signInOpen);

  return (
    <div className={styles.screen}>
      <CardDeck
        posts={feeds[mode]}
        mode={mode}
        reactions={reactions}
        onReact={handleReact}
        onNotForMe={handleNotForMe}
        onReply={(post) => setCommentsPost(post)}
        onSwipeUp={(post) => setCommentsPost(post)}
        onLongPress={(post) => setActionPost(post)}
        onMore={(post) => setActionPost(post)}
        onCommit={handleCommit}
        paused={overlayOpen}
      />

      {/* desktop spill button (the tab bar carries it on phones) */}
      <button type="button" className={styles.spillBtn} onClick={() => app.openCompose()}>
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

      {/* new drops pill */}
      {newCount > 0 && (
        <button type="button" className={styles.newDrops} onClick={() => void acceptNew()}>
          <span className={styles.newDropsDot} />
          {newCount} new {newCount === 1 ? 'drop' : 'drops'}
        </button>
      )}

      {/* transient toast */}
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* warm glow bloom from the felt button */}
      {glow && (
        <div
          key={glow.key}
          className={styles.glow}
          style={{ left: glow.x, top: glow.y }}
          aria-hidden="true"
        />
      )}

      {/* reaction burst particles */}
      <div className={styles.burstLayer} aria-hidden="true">
        {particles.map((p) => (
          <span
            key={p.id}
            className={styles.particle}
            style={{
              left: p.x,
              top: p.y,
              fontSize: p.size,
              ['--dx' as string]: `${p.dx}px`,
              ['--rot' as string]: `${p.rot}deg`,
              animationDuration: `${p.dur}ms`,
            }}
          >
            {p.glyph}
          </span>
        ))}
      </div>

      {actionPost && (
        <CardActionSheet
          post={actionPost}
          saved={savedIds.has(actionPost.id)}
          busy={actionBusy}
          onSave={() => void handleSave()}
          onReport={(reason) => void handleReport(reason)}
          onMute={() => void handleMute()}
          onClose={() => setActionPost(null)}
        />
      )}

      {commentsPost && (
        <CommentsSheet
          post={commentsPost}
          onClose={() => setCommentsPost(null)}
          onPosted={bumpCommentCount}
        />
      )}
    </div>
  );
}
