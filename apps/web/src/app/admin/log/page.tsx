// moderation_log browser — last 200 decisions, filterable by verdict.
import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/service';
import styles from '../admin.module.css';

export const dynamic = 'force-dynamic';

interface LogRow {
  id: string;
  target_type: string;
  target_id: string;
  verdict: string;
  scores: Record<string, number> | null;
  rule_hits: string[] | null;
  created_at: string;
}

const VERDICTS = ['all', 'published', 'crisis', 'blocked'] as const;

export default async function ModerationLog({
  searchParams,
}: {
  searchParams: Promise<{ verdict?: string }>;
}) {
  const { verdict } = await searchParams;
  const active = verdict && verdict !== 'all' ? verdict : null;

  const svc = createServiceClient();
  let q = svc
    .from('moderation_log')
    .select('id, target_type, target_id, verdict, scores, rule_hits, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (active) q = q.eq('verdict', active);
  const { data } = await q;
  const rows = (data ?? []) as LogRow[];

  return (
    <main>
      <h1 className={styles.h1}>moderation log</h1>
      <div className={styles.filterRow}>
        {VERDICTS.map((v) => (
          <Link
            key={v}
            href={v === 'all' ? '/admin/log' : `/admin/log?verdict=${v}`}
            className={(v === 'all' ? !active : active === v) ? styles.filterOn : undefined}
          >
            {v}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className={styles.empty}>no entries{active ? ` for "${active}"` : ''}.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>when</th>
              <th>target</th>
              <th>verdict</th>
              <th>rule hits</th>
              <th>top scores</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const topScores = r.scores
                ? Object.entries(r.scores)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 3)
                    .map(([k, v]) => `${k} ${(v * 100).toFixed(0)}%`)
                    .join(' · ')
                : '—';
              return (
                <tr key={r.id}>
                  <td className={styles.meta}>{new Date(r.created_at).toLocaleString()}</td>
                  <td className={styles.meta}>
                    {r.target_type} {r.target_id.slice(0, 8)}…
                  </td>
                  <td>
                    <span className={styles.pill}>{r.verdict}</span>
                  </td>
                  <td>{r.rule_hits?.length ? r.rule_hits.join(', ') : '—'}</td>
                  <td className={styles.meta}>{topScores}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}
