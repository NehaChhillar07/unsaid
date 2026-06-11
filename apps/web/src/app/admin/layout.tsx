import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import styles from './admin.module.css';

export const metadata = { title: 'admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { email } = await requireAdmin();
  return (
    <div className={styles.wrap}>
      <div className={styles.topbar}>
        <Link href="/admin" className={styles.brand}>
          unsaid · admin
        </Link>
        <nav className={styles.nav}>
          <Link href="/admin">report queue</Link>
          <Link href="/admin/log">moderation log</Link>
          <Link href="/admin/metrics">metrics</Link>
        </nav>
        <span className={styles.who}>{email}</span>
      </div>
      {children}
    </div>
  );
}
