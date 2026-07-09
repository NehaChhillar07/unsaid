'use client';

// optional "make it yours" sheet — surfaced after a little browsing, or when
// the visitor first tries to spill. asks only for a title + a few feelings.
// dismissable; if closed it never auto-shows again (it lives in /you). on save
// it creates both selves with the same title so posting works in either world.
import { useState } from 'react';
import { TOPICS, type TopicId } from '@unsaid/tokens';
import { ensureProfile, upsertIdentity } from '@unsaid/api';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useDialogA11y } from '@/lib/useDialogA11y';
import { ROLE_HELPER, useRoleWarning } from '@/lib/useRoleWarning';
import { roleGuardMessage } from '@/lib/roleError';
import { useApp } from './AppContext';
import styles from './PersonalizePrompt.module.css';

const MIN_TOPICS = 3;

export function PersonalizePrompt() {
  const app = useApp();
  const [role, setRole] = useState('');
  const [picked, setPicked] = useState<TopicId[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const warning = useRoleWarning(role);
  const panelRef = useDialogA11y<HTMLDivElement>(() => app.dismissPersonalize());

  if (!app.personalizeOpen) return null;

  const toggle = (id: TopicId) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const save = async () => {
    if (saving || !role.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const sb = createSupabaseBrowserClient();
      await ensureProfile(sb);
      // one title, both selves — they can split them later in /you
      await upsertIdentity(sb, 'personal', role.trim(), picked);
      await upsertIdentity(sb, 'professional', role.trim(), picked);
      const rows = await app.refreshIdentities();
      if (!rows || rows.length < 2) {
        setError('that didn’t stick — give it another go in a moment.');
        setSaving(false);
        return;
      }
      app.completePersonalize();
    } catch (err) {
      setError(roleGuardMessage(err) ?? 'that didn’t stick — give it another go in a moment.');
      setSaving(false);
    }
  };

  const canSave = role.trim().length > 0 && picked.length >= MIN_TOPICS && !saving;
  const left = MIN_TOPICS - picked.length;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="make it yours">
      <div className={styles.scrim} onClick={() => app.dismissPersonalize()} />
      <div className={styles.sheet} ref={panelRef}>
        <div className={styles.grabber} />
        <button
          type="button"
          className={styles.skip}
          onClick={() => app.dismissPersonalize()}
          data-dialog-focus
        >
          skip for now
        </button>

        <h2 className={styles.title}>make it yours</h2>
        <p className={styles.copy}>
          totally optional — a title and a few feelings so the feed knows what to bring you. no
          name, ever. you can change it any time in your space.
        </p>

        <div className={styles.fieldWrap}>
          <input
            className={`${styles.input}${warning ? ` ${styles.inputWarn}` : ''}`}
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="what should we call you? — a feeling, not a name"
            aria-label="your title"
            maxLength={48}
          />
          <div className={`${styles.helper}${warning ? ` ${styles.helperWarn}` : ''}`} role={warning ? 'alert' : undefined}>
            {warning ?? ROLE_HELPER}
          </div>
        </div>

        <div className={styles.topicsLabel}>what&rsquo;s been on your mind?</div>
        <div className={styles.topics}>
          {TOPICS.map((t) => {
            const on = picked.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                className={`${styles.chip}${on ? ` ${styles.chipOn}` : ''}`}
                aria-pressed={on}
                onClick={() => toggle(t.id)}
              >
                <span aria-hidden="true">{t.glyph}</span>
                {t.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}
        <div className={styles.counter}>
          {left > 0 ? `pick ${left} more` : 'a feed is already waiting for you'}
        </div>
        <button type="button" className={styles.save} disabled={!canSave} onClick={() => void save()}>
          {saving ? 'saving…' : 'save'}
        </button>
      </div>
    </div>
  );
}
