// basic safety metrics — posts today, open reports, report rate per 1k posts,
// pre-publish blocks by rule.
import { createServiceClient } from '@/lib/supabase/service';
import styles from '../admin.module.css';

export const dynamic = 'force-dynamic';

export default async function Metrics() {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const since = startOfDay.toISOString();

  const svc = createServiceClient();
  const [postsToday, postsTotal, reportsOpen, reportsTotal, blockedRows] = await Promise.all([
    svc.from('posts').select('id', { count: 'exact', head: true }).gte('created_at', since),
    svc.from('posts').select('id', { count: 'exact', head: true }),
    svc.from('reports').select('id', { count: 'exact', head: true }).eq('state', 'open'),
    svc.from('reports').select('id', { count: 'exact', head: true }),
    svc
      .from('moderation_log')
      .select('rule_hits')
      .eq('verdict', 'blocked')
      .order('created_at', { ascending: false })
      .limit(1000),
  ]);

  const nPostsToday = postsToday.count ?? 0;
  const nPostsTotal = postsTotal.count ?? 0;
  const nReportsOpen = reportsOpen.count ?? 0;
  const nReportsTotal = reportsTotal.count ?? 0;
  const reportRate = nPostsTotal > 0 ? ((nReportsTotal / nPostsTotal) * 1000).toFixed(1) : '0';

  const ruleCounts = new Map<string, number>();
  for (const row of (blockedRows.data ?? []) as { rule_hits: string[] | null }[]) {
    const hits = row.rule_hits && row.rule_hits.length > 0 ? row.rule_hits : ['(model only)'];
    for (const rule of hits) {
      ruleCounts.set(rule, (ruleCounts.get(rule) ?? 0) + 1);
    }
  }
  const rules = [...ruleCounts.entries()].sort(([, a], [, b]) => b - a);

  return (
    <main>
      <h1 className={styles.h1}>safety metrics</h1>
      <div className={styles.cards}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{nPostsToday}</div>
          <div className={styles.statLabel}>posts today (utc)</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{nReportsOpen}</div>
          <div className={styles.statLabel}>reports open</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{reportRate}</div>
          <div className={styles.statLabel}>reports per 1k posts (all time)</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{nPostsTotal}</div>
          <div className={styles.statLabel}>posts total</div>
        </div>
      </div>

      <h1 className={styles.h1}>blocks by rule (last 1000 blocks)</h1>
      {rules.length === 0 ? (
        <p className={styles.empty}>no blocks logged yet.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>rule</th>
              <th>blocks</th>
            </tr>
          </thead>
          <tbody>
            {rules.map(([rule, n]) => (
              <tr key={rule}>
                <td>{rule}</td>
                <td className={styles.meta}>{n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
