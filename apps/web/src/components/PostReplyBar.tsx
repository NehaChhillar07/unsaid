'use client';

// reply affordance on the share page — signed-in (onboarded) visitors get the
// live CommentsSheet; everyone else gets a quiet path in.
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FeedPost } from '@unsaid/tokens';
import { useApp } from './AppContext';
import { CommentsSheet } from './CommentsSheet';
import styles from './PostReplyBar.module.css';

export function PostReplyBar({ post }: { post: FeedPost }) {
  const app = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!post.comments_enabled) {
    return <div className={styles.off}>replies are off for this one</div>;
  }

  if (!app.user) {
    return (
      <Link href="/auth" className={styles.bar}>
        <span className={styles.placeholder}>reply with care…</span>
        <span className={styles.hint}>get in quietly →</span>
      </Link>
    );
  }

  if (!app.onboarded) {
    return (
      <Link href="/welcome" className={styles.bar}>
        <span className={styles.placeholder}>reply with care…</span>
        <span className={styles.hint}>set up your two selves →</span>
      </Link>
    );
  }

  return (
    <>
      <button type="button" className={styles.bar} onClick={() => setOpen(true)}>
        <span className={styles.placeholder}>reply with care…</span>
        <span className={styles.send} aria-hidden="true">
          ↑
        </span>
      </button>
      {open && (
        <CommentsSheet
          post={post}
          onClose={() => {
            setOpen(false);
            router.refresh();
          }}
          onPosted={() => router.refresh()}
        />
      )}
    </>
  );
}
