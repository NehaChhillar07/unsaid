'use client';

// one-tap anonymous session — the no-email way in.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import styles from './auth.module.css';

export function AnonSignInButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slipIn = async () => {
    setBusy(true);
    setError(null);
    try {
      const sb = createSupabaseBrowserClient();
      const { error: err } = await sb.auth.signInAnonymously();
      if (err) throw err;
      router.replace('/welcome');
      router.refresh();
    } catch {
      setError("couldn't slip you in just now — try again in a moment 🤍");
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className={styles.submit} onClick={slipIn} disabled={busy}>
        {busy ? 'slipping you in…' : 'slip in anonymously — no email'}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </>
  );
}
