// open report queue — grouped per target, with content fetched via service role.
import { authorTag } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/service';
import {
  banAuthor,
  dismissReports,
  removeContent,
  shadowAuthor,
  unhideContent,
  type TargetType,
} from './actions';
import styles from './admin.module.css';

export const dynamic = 'force-dynamic';

interface ReportRow {
  id: string;
  target_type: TargetType;
  target_id: string;
  reporter_id: string;
  reason: string;
  state: string;
  created_at: string;
}

interface ContentRow {
  id: string;
  body: string;
  status: 'live' | 'hidden' | 'removed';
  author_id: string;
}

interface QueueItem {
  targetType: TargetType;
  targetId: string;
  reports: ReportRow[];
  content: ContentRow | null;
}

async function loadQueue(): Promise<QueueItem[]> {
  const svc = createServiceClient();
  const { data: reports } = await svc
    .from('reports')
    .select('id, target_type, target_id, reporter_id, reason, state, created_at')
    .eq('state', 'open')
    .order('created_at', { ascending: false })
    .limit(300);

  const rows = (reports ?? []) as ReportRow[];
  const groups = new Map<string, QueueItem>();
  for (const r of rows) {
    const key = `${r.target_type}:${r.target_id}`;
    const g = groups.get(key);
    if (g) g.reports.push(r);
    else groups.set(key, { targetType: r.target_type, targetId: r.target_id, reports: [r], content: null });
  }

  const postIds = [...groups.values()].filter((g) => g.targetType === 'post').map((g) => g.targetId);
  const commentIds = [...groups.values()].filter((g) => g.targetType === 'comment').map((g) => g.targetId);

  const [posts, comments] = await Promise.all([
    postIds.length
      ? svc.from('posts').select('id, body, status, author_id').in('id', postIds)
      : Promise.resolve({ data: [] as ContentRow[] }),
    commentIds.length
      ? svc.from('comments').select('id, body, status, author_id').in('id', commentIds)
      : Promise.resolve({ data: [] as ContentRow[] }),
  ]);

  for (const p of (posts.data ?? []) as ContentRow[]) {
    const g = groups.get(`post:${p.id}`);
    if (g) g.content = p;
  }
  for (const c of (comments.data ?? []) as ContentRow[]) {
    const g = groups.get(`comment:${c.id}`);
    if (g) g.content = c;
  }
  return [...groups.values()];
}

function statusPill(status: string | undefined) {
  const cls =
    status === 'live' ? styles.pillLive : status === 'hidden' ? styles.pillHidden : styles.pillRemoved;
  return <span className={`${styles.pill} ${cls}`}>{status ?? 'gone'}</span>;
}

export default async function AdminQueue() {
  const queue = await loadQueue();

  return (
    <main>
      <h1 className={styles.h1}>open reports ({queue.length})</h1>
      {queue.length === 0 ? (
        <p className={styles.empty}>queue is clear. nothing needs you right now.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>target</th>
              <th>content</th>
              <th>reasons</th>
              <th>reports</th>
              <th>latest</th>
              <th>status</th>
              <th>actions</th>
            </tr>
          </thead>
          <tbody>
            {queue.map((item) => {
              const reasons = [...new Set(item.reports.map((r) => r.reason))].join(', ');
              const reporterCount = new Set(item.reports.map((r) => r.reporter_id)).size;
              const latest = item.reports[0]?.created_at;
              return (
                <tr key={`${item.targetType}:${item.targetId}`}>
                  <td className={styles.meta}>
                    {item.targetType}
                    <br />
                    {item.content ? authorTag(item.content.author_id) : '—'}
                  </td>
                  <td className={styles.body}>{item.content?.body ?? '(content no longer exists)'}</td>
                  <td>{reasons}</td>
                  <td className={styles.meta}>{reporterCount}</td>
                  <td className={styles.meta}>{latest ? new Date(latest).toLocaleString() : '—'}</td>
                  <td>{statusPill(item.content?.status)}</td>
                  <td>
                    <div className={styles.actions}>
                      <form action={dismissReports.bind(null, item.targetType, item.targetId)}>
                        <button type="submit" className={styles.actionBtn}>
                          dismiss
                        </button>
                      </form>
                      {item.content && item.content.status !== 'removed' && (
                        <form action={removeContent.bind(null, item.targetType, item.targetId)}>
                          <button type="submit" className={`${styles.actionBtn} ${styles.danger}`}>
                            remove
                          </button>
                        </form>
                      )}
                      {item.content && item.content.status !== 'live' && (
                        <form action={unhideContent.bind(null, item.targetType, item.targetId)}>
                          <button type="submit" className={styles.actionBtn}>
                            unhide
                          </button>
                        </form>
                      )}
                      {item.content && (
                        <>
                          <form action={shadowAuthor.bind(null, item.targetType, item.targetId)}>
                            <button type="submit" className={`${styles.actionBtn} ${styles.danger}`}>
                              shadow author
                            </button>
                          </form>
                          <form action={banAuthor.bind(null, item.targetType, item.targetId)}>
                            <button type="submit" className={`${styles.actionBtn} ${styles.danger}`}>
                              ban author
                            </button>
                          </form>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}
