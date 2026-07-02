'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { worldVars } from '@/lib/theme';
import { MaskIcon } from '@/components/MaskIcon';
import styles from './status.module.css';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // hook for client error monitoring; details are never shown to the user
  }, [error]);

  return (
    <div className={`themed ${styles.page}`} style={worldVars('personal')}>
      <div className={styles.panel}>
        <Link href="/" className={styles.brand}>
          <MaskIcon size={22} color="var(--accent)" />
          unsaid
        </Link>
        <div className={styles.code}>oh</div>
        <h1 className={styles.title}>something caught</h1>
        <p className={styles.copy}>
          a small hiccup on our end — nothing you did. take a breath and try again.
        </p>
        <button type="button" className={styles.cta} onClick={reset}>
          try again
        </button>
        <Link href="/" className={styles.ghost}>
          back to the feed
        </Link>
      </div>
    </div>
  );
}
