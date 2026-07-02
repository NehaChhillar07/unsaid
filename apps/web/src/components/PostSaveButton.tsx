'use client';

// save affordance on the share / detail page. signed-in visitors toggle save
// (optimistic); signed-out visitors get the same quiet path in as PostReplyBar.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchSaved, toggleSave } from '@unsaid/api';
import type { FeedPost } from '@unsaid/tokens';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useApp } from './AppContext';
import styles from './PostSaveButton.module.css';

export function PostSaveButton({ post }: { post: FeedPost }) {
  const app = useApp();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  // reflect existing saved state once we know who's looking
  useEffect(() => {
    if (!app.user) {
      setSaved(false);
      return;
    }
    let on = true;
    fetchSaved(createSupabaseBrowserClient(), post.mode)
      .then((list) => {
        if (on) setSaved(list.some((p) => p.id === post.id));
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, [app.user, post.id, post.mode]);

  const onClick = async () => {
    if (!app.user) {
      router.push('/auth');
      return;
    }
    if (busy) return;
    const next = !saved;
    setSaved(next); // optimistic
    setBusy(true);
    try {
      await toggleSave(createSupabaseBrowserClient(), post.id, next);
    } catch {
      setSaved(!next); // revert
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={`${styles.btn}${saved ? ` ${styles.on}` : ''}`}
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? 'saved — tap to unsave' : 'save this confession'}
    >
      <span key={saved ? 'on' : 'off'} className={styles.glyph}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} aria-hidden="true">
          <path
            d="M6 4.5h12a1 1 0 0 1 1 1V20l-7-3.5L5 20V5.5a1 1 0 0 1 1-1Z"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {app.user ? (saved ? 'saved' : 'save this') : 'save this'}
    </button>
  );
}
