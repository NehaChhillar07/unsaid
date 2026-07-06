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
  fetchMyReactions,
  fetchSaved,
  markSeen,
  muteAuthorOf,
  react,
  report,
  toggleSave,
} from '@unsaid/api';
import type { FeedPost, Mode, ReactionType } from '@unsaid/tokens';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useApp } from './AppContext';
import { CardDeck } from './CardDeck';
import { CardActionSheet, type ReportReason } from './CardActionSheet';
import { CommentsSheet } from './CommentsSheet';
import { announce } from './LiveStatus';
import { sendPostEvent } from '@/lib/postLive';
import styles from './FeedScreen.module.css';

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
  const [toast, setToast] = useState<string | null>(null);

  const committedIds = useRef<Set<string>>(new Set());
  const toastTimer = useRef(0);
  const announcedNew = useRef(0);
  // ref mirror so the new-drops poll reads fresh state without re-arming
  const feedsRef = useRef(feeds);
  feedsRef.current = feeds;

  const flash = useCallback((msg: string) => {
    setToast(msg);
    announce(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2000);
  }, []);

  // personalized feed (the SSR payload is the anonymous read)
  const refetchFeeds = useCallback(async () => {
    try {
      // rank each world's opening page by the viewer's chosen topics
      const topicsFor = (m: Mode) => app.identities?.find((i) => i.mode === m)?.topics ?? [];
      const [personal, professional] = await Promise.all(
        MODES.map((m) => fetchFeed(sb, m, 'newest', null, { topics: topicsFor(m) })),
      );
      if (!personal || !professional) return;
      const seenHere = committedIds.current;
      const nextFeeds = {
        personal: personal.posts.filter((p) => !seenHere.has(p.id)),
        professional: professional.posts.filter((p) => !seenHere.has(p.id)),
      };
      setFeeds(nextFeeds);
      // seed felt/none state from the server so returning users don't see an
      // inverted toggle (preserve any optimistic taps already made this session).
      const ids = [...nextFeeds.personal, ...nextFeeds.professional].map((p) => p.id);
      try {
        const mine = await fetchMyReactions(sb, ids);
        setReactions((r) => ({ ...mine, ...r }));
      } catch {
        // read-back is best-effort; feed still works without it
      }
    } catch {
      // keep what we have
    }
  }, [sb, app.identities]);

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
        if (n > 0 && n !== announcedNew.current) {
          announce(`${n} new ${n === 1 ? 'drop' : 'drops'} — activate the new drops button to load`);
        }
        announcedNew.current = n;
        setNewCount(n);
      } catch {
        // quiet
      }
    };
    const t = window.setInterval(() => void tick(), NEW_DROPS_POLL_MS);
    return () => window.clearInterval(t);
  }, [sb, mode]);

  // accepting new drops is a visible moment: the current deck exhales out,
  // the fresh cards drop in from above (wave re-keys the deck wrapper).
  const [wave, setWave] = useState(0);
  const [waving, setWaving] = useState(false);
  const acceptNew = useCallback(async () => {
    if (waving) return;
    setWaving(true);
    announce('gathering the new drops');
    const exit = new Promise((r) => window.setTimeout(r, 340));
    await Promise.all([refetchFeeds(), exit]);
    setNewCount(0);
    announcedNew.current = 0;
    setWave((w) => w + 1);
    setWaving(false);
    flash('fresh drops, just for you 🤍');
  }, [refetchFeeds, flash, waving]);

  // ── reactions ────────────────────────────────────────────────
  // the "felt this" celebration is owned entirely by FeltBurstProvider — one
  // stable, smooth animation shared by every surface. here we only toggle and
  // persist the reaction (no second, competing burst).

  // only "felt this" reacts now; "not for me" is a private dismissal (below).
  const handleReact = useCallback(
    (post: FeedPost, type: ReactionType) => {
      const current = reactions[post.id] ?? null;
      const next = current === type ? null : type;
      setReactions((r) => ({ ...r, [post.id]: next }));
      react(sb, post.id, type)
        .then(() => {
          // everyone else looking at this card sees the heart land live
          if (type === 'felt') sendPostEvent(post.id, 'felt', { delta: next === 'felt' ? 1 : -1 });
        })
        .catch(() => {
          setReactions((r) => ({ ...r, [post.id]: current }));
        });
    },
    [sb, reactions],
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

  // one-tap save / unsave from the card header — optimistic, reverts on error.
  const handleToggleSave = useCallback(
    (post: FeedPost) => {
      const isSaved = savedIds.has(post.id);
      setSavedIds((s) => {
        const n = new Set(s);
        if (isSaved) n.delete(post.id);
        else n.add(post.id);
        return n;
      });
      flash(isSaved ? 'let go of that one' : 'kept close 🤍');
      toggleSave(sb, post.id, !isSaved).catch(() => {
        setSavedIds((s) => {
          const n = new Set(s);
          if (isSaved) n.add(post.id);
          else n.delete(post.id);
          return n;
        });
        flash('that slipped — try again in a moment');
      });
    },
    [sb, savedIds, flash],
  );

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
      <h1 className="sr-only">unsaid — the feed</h1>
      <div key={wave} className={`${styles.deckWave}${waving ? ` ${styles.deckWaveOut}` : ''}`}>
        <CardDeck
          posts={feeds[mode]}
          mode={mode}
          reactions={reactions}
          savedIds={savedIds}
          onReact={handleReact}
          onNotForMe={handleNotForMe}
          onReply={(post) => setCommentsPost(post)}
          onSwipeUp={(post) => setCommentsPost(post)}
          onLongPress={(post) => setActionPost(post)}
          onMore={(post) => setActionPost(post)}
          onToggleSave={handleToggleSave}
          onCommit={handleCommit}
          paused={overlayOpen}
        />
      </div>

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
      {(newCount > 0 || waving) && (
        <button
          type="button"
          className={`${styles.newDrops}${waving ? ` ${styles.newDropsBusy}` : ''}`}
          onClick={() => void acceptNew()}
          disabled={waving}
        >
          <span className={styles.newDropsDot} />
          {waving ? 'gathering…' : `${newCount} new ${newCount === 1 ? 'drop' : 'drops'}`}
        </button>
      )}

      {/* transient toast */}
      {toast && <div className={styles.toast}>{toast}</div>}

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
