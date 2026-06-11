'use client';

// notifications ("felt") — ported from NotificationsScreen in unsaid-tabs.jsx.
// mode-filtered via the global toggle; rows are milestone / same / comment;
// marks everything read on view.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { relTime, type NotificationRow } from '@unsaid/tokens';
import { fetchNotifications, markNotificationsRead } from '@unsaid/api';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useApp } from '@/components/AppContext';
import { Chrome } from '@/components/Chrome';
import { RoleBadge } from '@/components/RoleBadge';
import styles from './felt.module.css';

export function FeltClient() {
  const app = useApp();
  const router = useRouter();
  const { mode } = app;
  const [rows, setRows] = useState<NotificationRow[] | null>(null);

  // signed-out visitors don't have a "felt" space
  useEffect(() => {
    if (app.authReady && !app.user) router.replace('/auth');
  }, [app.authReady, app.user, router]);

  useEffect(() => {
    if (!app.user) return;
    let on = true;
    const sb = createSupabaseBrowserClient();
    setRows(null);
    fetchNotifications(sb, mode)
      .then((list) => {
        if (!on) return;
        setRows(list);
        if (list.some((r) => !r.read)) {
          void markNotificationsRead(sb, mode)
            .then(() => app.clearUnread(mode))
            .catch(() => {});
        } else {
          app.clearUnread(mode);
        }
      })
      .catch(() => {
        if (on) setRows([]);
      });
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.user, mode]);

  return (
    <Chrome>
      <div className={styles.page}>
        <h1 className={styles.title}>felt</h1>
        <p className={styles.sub}>gentle, batched. who your {mode} world reached.</p>

        <div className={styles.list}>
          {rows === null && <div className={styles.quiet}>listening…</div>}
          {rows !== null && rows.length === 0 && (
            <div className={styles.empty}>
              nothing felt yet.
              <br />
              release something — someone out there gets it.
            </div>
          )}
          {rows?.map((n) => <NotifRow key={n.id} n={n} />)}
        </div>

        {rows !== null && rows.length > 0 && (
          <div className={styles.footer}>
            that&rsquo;s everything for now.
            <br />
            we&rsquo;ll only nudge you once a day, if at all. 🤍
          </div>
        )}
      </div>
    </Chrome>
  );
}

function lineFor(n: NotificationRow): string {
  const count = n.payload.count ?? 1;
  if (n.type === 'milestone') return `${count} people felt this`;
  if (n.type === 'same') return `${count} said “same” 🫂`;
  return 'a kind reply';
}

function NotifRow({ n }: { n: NotificationRow }) {
  return (
    <div className={`${styles.row}${n.read ? '' : ` ${styles.rowUnread}`}`}>
      <div className={styles.rowIcon}>
        {n.type === 'milestone' ? (
          <span className={styles.glyph}>🤍</span>
        ) : n.type === 'same' ? (
          <span className={styles.glyph}>🫂</span>
        ) : (
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M5 6h14v10H9l-4 3V6Z"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <div className={styles.rowBody}>
        <div className={styles.rowHead}>
          <span className={styles.rowLine}>{lineFor(n)}</span>
          <span className={styles.rowWhen} suppressHydrationWarning>
            {relTime(n.created_at)}
          </span>
        </div>
        {n.payload.snippet && <div className={styles.snippet}>&ldquo;{n.payload.snippet}&rdquo;</div>}
        {n.type === 'comment' && n.payload.comment_body && (
          <div className={styles.detail}>
            {n.payload.comment_role && (
              <div className={styles.detailRole}>
                <RoleBadge role={n.payload.comment_role} flat />
              </div>
            )}
            <div className={styles.detailBody}>{n.payload.comment_body}</div>
          </div>
        )}
      </div>
    </div>
  );
}
