'use client';

// gentle gate for anonymous visitors who try to react or reply.
import Link from 'next/link';
import styles from './modals.module.css';

export function SignInModal({ onClose }: { onClose: () => void }) {
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="sign in">
      <div className={styles.scrim} onClick={onClose} />
      <div className={styles.sheet}>
        <div className={styles.grabber} />
        <h2 className={styles.title}>feel it for real 🤍</h2>
        <p className={styles.copy}>
          get in quietly with a magic link — no password, no profile, no real name. nobody will ever
          know it&rsquo;s you.
        </p>
        <Link href="/auth" className={styles.primaryBtn}>
          get in quietly
        </Link>
        <button type="button" className={styles.ghostBtn} onClick={onClose}>
          keep reading for now
        </button>
      </div>
    </div>
  );
}
