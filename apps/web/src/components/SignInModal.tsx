'use client';

// gentle gate for visitors who try to react or reply.
// primary path: anonymous session — no email, no password, nothing.
// (magic-link email stays available as the recovery-friendly option.)
import { useState } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import styles from './modals.module.css';

export function SignInModal({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slipIn = async () => {
    setBusy(true);
    setError(null);
    try {
      const sb = createSupabaseBrowserClient();
      const { error: err } = await sb.auth.signInAnonymously();
      if (err) throw err;
      onClose(); // session lands via onAuthStateChange; the gate routes to /welcome
    } catch {
      setError("couldn't slip you in just now — try again in a moment 🤍");
      setBusy(false);
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="sign in">
      <div className={styles.scrim} onClick={onClose} />
      <div className={styles.sheet}>
        <div className={styles.grabber} />
        <h2 className={styles.title}>feel it for real 🤍</h2>
        <p className={styles.copy}>
          slip in anonymously — no email, no password, no profile. nobody will ever know
          it&rsquo;s you.
        </p>
        <button type="button" className={styles.primaryBtn} onClick={slipIn} disabled={busy}>
          {busy ? 'slipping you in…' : 'slip in anonymously'}
        </button>
        {error && <p className={styles.copy}>{error}</p>}
        <Link href="/auth" className={styles.ghostBtn}>
          prefer email? get a magic link
        </Link>
        <button type="button" className={styles.ghostBtn} onClick={onClose}>
          keep reading for now
        </button>
      </div>
    </div>
  );
}
