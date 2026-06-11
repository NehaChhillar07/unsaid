import type { Metadata } from 'next';
import Link from 'next/link';
import { loadDoc, renderMarkdown } from '@/lib/markdown';
import { worldVars } from '@/lib/theme';
import { MaskIcon } from '@/components/MaskIcon';
import styles from '../legal.module.css';

export const metadata: Metadata = {
  title: 'privacy policy',
  description: 'what unsaid collects, what it never does, and how deletion really deletes.',
};

export default function PrivacyPage() {
  const md = loadDoc('privacy-policy.md');
  return (
    <div className={`themed ${styles.page}`} style={worldVars('personal')}>
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
