import type { Metadata } from 'next';
import Link from 'next/link';
import { loadDoc, renderMarkdown } from '@/lib/markdown';
import { worldVars } from '@/lib/theme';
import { MaskIcon } from '@/components/MaskIcon';
import styles from '../legal.module.css';

export const metadata: Metadata = {
  title: 'what anonymous means here',
  description: 'exactly how anonymous you are on unsaid — and the honest limits.',
};

export default function AnonymousPage() {
  const md = loadDoc('what-anonymous-means.md');
  return (
    <div className={`themed ${styles.page}`} style={worldVars('professional')}>
      <main className={styles.doc}>
        <Link href="/" className={styles.brand}>
          <MaskIcon size={18} color="var(--accent)" />
          unsaid
        </Link>
        {renderMarkdown(md)}
      </main>
    </div>
  );
}
