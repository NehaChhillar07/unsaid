import type { Metadata } from 'next';
import Link from 'next/link';
import { worldVars } from '@/lib/theme';
import { MaskIcon } from '@/components/MaskIcon';
import styles from './status.module.css';

export const metadata: Metadata = {
  title: 'lost the thread',
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className={`themed ${styles.page}`} style={worldVars('personal')}>
      <div className={styles.panel}>
        <Link href="/" className={styles.brand}>
          <MaskIcon size={22} color="var(--accent)" />
          unsaid
        </Link>
        <div className={styles.code}>404</div>
        <h1 className={styles.title}>this one slipped away</h1>
        <p className={styles.copy}>
          the page you were looking for isn&rsquo;t here — maybe it was never said, or it&rsquo;s
          already been let go.
        </p>
        <Link href="/" className={styles.cta}>
          back to the feed
        </Link>
      </div>
    </div>
  );
}
