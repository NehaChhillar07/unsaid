'use client';

// the private you space — ported from YouSpace in unsaid-tabs.jsx.
// stats, posts | saved | drafts segments, role-title editing, and the
// "gone means gone" delete flows.
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatCount, relTime, type FeedPost, type Mode, type OwnPost } from '@unsaid/tokens';
import {
  deleteOwnPost,
  fetchDraft,
  fetchOwnPosts,
  fetchSaved,
  toggleSave,
  upsertIdentity,
  wipeAccount,
  type Draft,
} from '@unsaid/api';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useApp } from '@/components/AppContext';
import { Chrome } from '@/components/Chrome';
import { RoleBadge } from '@/components/RoleBadge';
import { MoodChip } from '@/components/MoodChip';
import { ROLE_HELPER, useRoleWarning } from '@/lib/useRoleWarning';
import { roleGuardMessage } from '@/lib/roleError';
import { useDialogA11y } from '@/lib/useDialogA11y';
import styles from './you.module.css';

type Seg = 'posts' | 'saved' | 'drafts';

export function YouClient() {
  const app = useApp();
  const router = useRouter();
  const { mode } = app;
  const [seg, setSeg] = useState<Seg>('posts');
  const [posts, setPosts] = useState<OwnPost[] | null>(null);
  const [saved, setSaved] = useState<FeedPost[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<OwnPost | null>(null);
  const [showRoles, setShowRoles] = useState(false);
  const [wipeStep, setWipeStep] = useState<0 | 1 | 2>(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (app.authReady && !app.user) router.replace('/auth');
  }, [app.authReady, app.user, router]);

  // per-mode data
  useEffect(() => {
    if (!app.user) return;
    let on = true;
    const sb = createSupabaseBrowserClient();
    setPosts(null);
    setSaved(null);
    setDraftLoaded(false);
    fetchOwnPosts(sb, mode)
      .then((r) => on && setPosts(r))
      .catch(() => on && setPosts([]));
    fetchSaved(sb, mode)
      .then((r) => on && setSaved(r))
      .catch(() => on && setSaved([]));
    fetchDraft(sb, mode)
      .then((d) => {
        if (!on) return;
        setDraft(d);
        setDraftLoaded(true);
      })
      .catch(() => {
        if (!on) return;
        setDraft(null);
        setDraftLoaded(true);
      });
    return () => {
      on = false;
    };
  }, [app.user, mode, app.feedVersion]);

  const identity = app.identities?.find((i) => i.mode === mode) ?? null;
  const totalFelt = (posts ?? []).reduce((s, p) => s + p.felt_count, 0);
  const totalReplies = (posts ?? []).reduce((s, p) => s + p.comment_count, 0);

  const doDelete = useCallback(async () => {
    const target = confirmDelete;
    if (!target || busy) return;
    setBusy(true);
    try {
      await deleteOwnPost(createSupabaseBrowserClient(), target.id);
      setPosts((p) => (p ? p.filter((x) => x.id !== target.id) : p));
      setConfirmDelete(null);
    } catch {
      // keep the sheet open — they can retry
    } finally {
      setBusy(false);
    }
  }, [confirmDelete, busy]);

  const unsave = useCallback(async (post: FeedPost) => {
    setSaved((s) => (s ? s.filter((x) => x.id !== post.id) : s));
    try {
      await toggleSave(createSupabaseBrowserClient(), post.id, false);
    } catch {
      setSaved((s) => (s ? [post, ...s] : s));
    }
  }, []);

  const doWipe = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const sb = createSupabaseBrowserClient();
      await wipeAccount(sb);
      await sb.auth.signOut();
      window.location.assign('/');
    } catch {
      setBusy(false);
      setWipeStep(0);
    }
  }, [busy]);

  return (
    <Chrome>
      <div className={styles.page}>
        <div className={styles.head}>
          <h1 className={styles.title}>your space</h1>
          <div className={styles.headRole}>
            {identity && <RoleBadge role={identity.role_title} />}
            <span className={styles.headNote}>your {mode} self · private to you</span>
          </div>
        </div>

        {/* stats */}
        <div className={styles.stats}>
          <Stat value={formatCount(totalFelt)} label="felt received" />
          <Stat value={formatCount(totalReplies)} label="replies received" />
          <Stat value={String(posts?.length ?? 0)} label="spills" />
        </div>

        {/* segments */}
        <div className={styles.segs} role="group" aria-label="your things">
          {(['posts', 'saved', 'drafts'] as Seg[]).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={seg === s}
              className={`${styles.segBtn}${seg === s ? ` ${styles.segOn}` : ''}`}
              onClick={() => setSeg(s)}
            >
              {s}
            </button>
          ))}
        </div>

        <div className={styles.list}>
          {seg === 'posts' && (
            <>
              {posts === null && <div className={styles.quiet}>gathering your spills…</div>}
              {posts !== null && posts.length === 0 && (
                <div className={styles.empty}>nothing spilled in this world yet.</div>
              )}
              {posts?.map((p) => (
                <div key={p.id} className={styles.miniCard}>
                  <div className={styles.miniHead}>
                    {p.mood ? <MoodChip mood={p.mood} /> : <span />}
                    <span className={styles.miniWhen} suppressHydrationWarning>
                      {relTime(p.created_at)}
                    </span>
                  </div>
                  <div className={styles.miniBody}>{p.body}</div>
                  <div className={styles.miniFoot}>
                    <span className={styles.miniCounts}>
                      <span>🤍 {formatCount(p.felt_count)}</span>
                      <span>💬 {formatCount(p.comment_count)}</span>
                      {p.status !== 'live' && <span className={styles.hiddenTag}>hidden</span>}
                    </span>
                    <button type="button" className={styles.deleteBtn} onClick={() => setConfirmDelete(p)}>
                      delete
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {seg === 'saved' && (
            <>
              {saved === null && <div className={styles.quiet}>finding what you kept…</div>}
              {saved !== null && saved.length === 0 && (
                <div className={styles.empty}>nothing saved yet — long-press a card to keep it close.</div>
              )}
              {saved?.map((p) => (
                <div key={p.id} className={styles.miniCard}>
                  <div className={styles.miniHead}>
                    <RoleBadge role={p.role_title} flat />
                    {p.mood && <MoodChip mood={p.mood} />}
                  </div>
                  <div className={styles.miniBody}>{p.body}</div>
                  <div className={styles.miniFoot}>
                    <Link href={`/p/${p.id}`} className={styles.openLink}>
                      open →
                    </Link>
                    <button type="button" className={styles.deleteBtn} onClick={() => void unsave(p)}>
                      unsave
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {seg === 'drafts' && (
            <>
              {!draftLoaded && <div className={styles.quiet}>checking for half feelings…</div>}
              {draftLoaded && !draft && (
                <div className={styles.empty}>nothing half-said in this world. that&rsquo;s okay too.</div>
              )}
              {draftLoaded && draft && (
                <button
                  type="button"
                  className={`${styles.miniCard} ${styles.draftCard}`}
                  onClick={() =>
                    app.openCompose({ mode, initialBody: draft.body, initialMood: draft.mood })
                  }
                >
                  {draft.mood && (
                    <div className={styles.miniHead}>
                      <MoodChip mood={draft.mood} />
                    </div>
                  )}
                  <div className={styles.draftBody}>&ldquo;{draft.body}&rdquo;</div>
                  <div className={styles.draftNote}>auto-saved · half a feeling is still a feeling</div>
                </button>
              )}
            </>
          )}
        </div>

        {/* account controls */}
        <div className={styles.accountCard}>
          <button type="button" className={styles.accountRow} onClick={() => setShowRoles(true)}>
            <span>change your role titles</span>
            <span className={styles.chev}>›</span>
          </button>
          <Link href="/legal/anonymous" className={styles.accountRow}>
            <span>anonymity &amp; data — what we keep</span>
            <span className={styles.chev}>›</span>
          </Link>
          <Link href="/legal/moderation" className={styles.accountRow}>
            <span>moderation &amp; safety</span>
            <span className={styles.chev}>›</span>
          </Link>
          <button
            type="button"
            className={`${styles.accountRow} ${styles.accountDanger}`}
            onClick={() => setWipeStep(1)}
          >
            <span>delete account &amp; wipe everything</span>
            <span className={styles.chev}>›</span>
          </button>
        </div>

        <button type="button" className={styles.signOut} onClick={() => void app.signOut()}>
          slip out quietly
        </button>

        <p className={styles.footNote}>
          deleting really deletes. no shadow copy, no &ldquo;are you sure we can win you
          back.&rdquo; gone means gone.
        </p>
      </div>

      {/* delete one post */}
      {confirmDelete && (
        <ConfirmSheet
          title="delete this spill?"
          copy="gone means gone — no archive, no undo. the feeling was still real."
          confirmLabel={busy ? 'letting go…' : 'yes, delete it'}
          danger
          busy={busy}
          onConfirm={() => void doDelete()}
          onClose={() => setConfirmDelete(null)}
        />
      )}

      {/* wipe account — explicit double confirm */}
      {wipeStep === 1 && (
        <ConfirmSheet
          title="delete your account?"
          copy="this wipes everything — both selves, every post, every reply, every save. nothing is kept, nothing can be recovered."
          confirmLabel="i understand — keep going"
          danger
          onConfirm={() => setWipeStep(2)}
          onClose={() => setWipeStep(0)}
        />
      )}
      {wipeStep === 2 && (
        <ConfirmSheet
          title="last quiet word."
          copy="there's no inbox email, no grace period, no way back. gone means gone."
          confirmLabel={busy ? 'wiping…' : 'wipe everything'}
          danger
          busy={busy}
          onConfirm={() => void doWipe()}
          onClose={() => setWipeStep(0)}
        />
      )}

      {showRoles && <RoleTitlesModal onClose={() => setShowRoles(false)} />}
    </Chrome>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className={styles.stat}>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

function ConfirmSheet({
  title,
  copy,
  confirmLabel,
  danger = false,
  busy = false,
  onConfirm,
  onClose,
}: {
  title: string;
  copy: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const panelRef = useDialogA11y<HTMLDivElement>(onClose);
  return (
    <div className={styles.overlay} role="alertdialog" aria-modal="true" aria-label={title}>
      <div className={styles.scrim} onClick={busy ? undefined : onClose} />
      <div className={styles.sheet} ref={panelRef}>
        <h2 className={styles.sheetTitle}>{title}</h2>
        <p className={styles.sheetCopy}>{copy}</p>
        <button
          type="button"
          className={`${styles.sheetConfirm}${danger ? ` ${styles.sheetDanger}` : ''}`}
          disabled={busy}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          className={styles.sheetCancel}
          disabled={busy}
          onClick={onClose}
          data-dialog-focus
        >
          never mind
        </button>
      </div>
    </div>
  );
}

function RoleTitlesModal({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const personalIdent = app.identities?.find((i) => i.mode === 'personal');
  const proIdent = app.identities?.find((i) => i.mode === 'professional');
  const [personalRole, setPersonalRole] = useState(personalIdent?.role_title ?? '');
  const [proRole, setProRole] = useState(proIdent?.role_title ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const personalWarning = useRoleWarning(personalRole);
  const proWarning = useRoleWarning(proRole);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const sb = createSupabaseBrowserClient();
      const jobs: Promise<void>[] = [];
      if (personalRole.trim() && personalRole.trim() !== personalIdent?.role_title) {
        jobs.push(upsertIdentity(sb, 'personal', personalRole.trim(), personalIdent?.topics ?? []));
      }
      if (proRole.trim() && proRole.trim() !== proIdent?.role_title) {
        jobs.push(upsertIdentity(sb, 'professional', proRole.trim(), proIdent?.topics ?? []));
      }
      await Promise.all(jobs);
      await app.refreshIdentities();
      onClose();
    } catch (err) {
      setError(roleGuardMessage(err) ?? 'that didn’t stick — try again in a moment.');
      setSaving(false);
    }
  };

  const field = (
    mode: Mode,
    value: string,
    set: (v: string) => void,
    warning: string | null,
  ) => (
    <div className={styles.roleFieldWrap}>
      <label className={styles.roleFieldLabel} htmlFor={`role-${mode}`}>
        <span
          className={styles.roleDot}
          style={{ background: mode === 'personal' ? '#B06A48' : '#5A7388' }}
          aria-hidden="true"
        />
        {mode} self
      </label>
      <input
        id={`role-${mode}`}
        className={`${styles.roleInput}${warning ? ` ${styles.roleInputWarn}` : ''}`}
        value={value}
        onChange={(e) => set(e.target.value)}
        maxLength={48}
        placeholder={mode === 'personal' ? 'eldest daughter, 24' : 'intern at a big4'}
      />
      <div
        className={`${styles.roleHelper}${warning ? ` ${styles.roleHelperWarn}` : ''}`}
        role={warning ? 'alert' : undefined}
      >
        {warning ?? ROLE_HELPER}
      </div>
    </div>
  );

  const panelRef = useDialogA11y<HTMLDivElement>(onClose);
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="change your role titles">
      <div className={styles.scrim} onClick={saving ? undefined : onClose} />
      <div className={styles.sheet} ref={panelRef}>
        <h2 className={styles.sheetTitle}>change your role titles</h2>
        <p className={styles.sheetCopy}>
          old posts get the new title too — a role is a mood, not a record.
        </p>
        {field('personal', personalRole, setPersonalRole, personalWarning)}
        {field('professional', proRole, setProRole, proWarning)}
        {error && (
          <p className={styles.sheetError} role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          className={styles.sheetConfirm}
          disabled={saving || !personalRole.trim() || !proRole.trim()}
          onClick={() => void save()}
        >
          {saving ? 'saving…' : 'save your selves'}
        </button>
        <button type="button" className={styles.sheetCancel} disabled={saving} onClick={onClose}>
          never mind
        </button>
      </div>
    </div>
  );
}
