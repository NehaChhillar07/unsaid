'use client';

// gentle gate for visitors who try to react or reply.
// primary path: anonymous session — no email, no password, nothing.
// (magic-link email stays available as the recovery-friendly option.)
import { useState } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { MaskIcon } from './MaskIcon';
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
    } catch (e) {
      // a network/DNS failure ("Failed to fetch") means the backend isn't
      // reachable yet (e.g. the Supabase project isn't set up) — say so plainly
      // rather than implying it's a transient blip.
      const unreachable =
        e instanceof TypeError || (e instanceof Error && /fetch|network/i.test(e.message));
      setError(
        unreachable
          ? "this space isn’t connected yet — sign-in goes live once the backend is set up 🤍"
          : "couldn’t slip you in just now — try again in a moment 🤍",
      );
      setBusy(false);
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="sign in">
      <div className={styles.scrim} onClick={onClose} />
      <div className={`${styles.sheet} ${styles.sheetGlass}`}>
        <div className={styles.grabber} />
        <div className={styles.signInEmblem}>
          <MaskIcon size={28} color="var(--accent)" />
        </div>
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
