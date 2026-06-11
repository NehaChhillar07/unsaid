'use client';

// post-auth onboarding — ported from unsaid-onboarding.jsx steps 2–3.
// "your two selves" (role per world, de-anon guard via the role-check edge
// function) → "what's been heavy?" (topic chips, min 3) → start feeling.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WORLDS, TOPICS, type TopicId } from '@unsaid/tokens';
import { ensureProfile, upsertIdentity } from '@unsaid/api';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useApp } from '@/components/AppContext';
import { MaskIcon } from '@/components/MaskIcon';
import { worldVars } from '@/lib/theme';
import { ROLE_HELPER, useRoleWarning } from '@/lib/useRoleWarning';
import styles from './welcome.module.css';

const MIN_TOPICS = 3;

export function WelcomeClient() {
  const app = useApp();
  const router = useRouter();
  const [step, setStep] = useState<0 | 1>(0);
  const [personalRole, setPersonalRole] = useState('');
  const [proRole, setProRole] = useState('');
  const [picked, setPicked] = useState<TopicId[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prefilled = useRef(false);

  const personalWarning = useRoleWarning(personalRole);
  const proWarning = useRoleWarning(proRole);

  // guards: must be signed in; already-onboarded users go home
  useEffect(() => {
    if (app.authReady && !app.user) router.replace('/auth');
  }, [app.authReady, app.user, router]);

  useEffect(() => {
    if (!saving && app.onboarded) router.replace('/');
  }, [app.onboarded, saving, router]);

  // prefill if one self already exists
  useEffect(() => {
    if (prefilled.current || !app.identities?.length) return;
    prefilled.current = true;
    for (const ident of app.identities) {
      if (ident.mode === 'personal') {
        setPersonalRole((v) => v || ident.role_title);
        if (ident.topics.length) setPicked((p) => (p.length ? p : ident.topics));
      } else {
        setProRole((v) => v || ident.role_title);
      }
    }
  }, [app.identities]);

  const toggleTopic = (id: TopicId) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const finish = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const sb = createSupabaseBrowserClient();
      await ensureProfile(sb);
      await upsertIdentity(sb, 'personal', personalRole.trim(), picked);
      await upsertIdentity(sb, 'professional', proRole.trim(), picked);
      await app.refreshIdentities();
      router.replace('/');
    } catch {
      setError('that didn’t stick — give it another go in a moment.');
      setSaving(false);
    }
  }, [saving, personalRole, proRole, picked, app, router]);

  const rolesOk = personalRole.trim().length > 0 && proRole.trim().length > 0;
  const left = MIN_TOPICS - picked.length;

  return (
    <div className={`themed ${styles.page}`} style={worldVars('personal')}>
      <div className={styles.orbTop} aria-hidden="true" />
      <div className={styles.orbBottom} aria-hidden="true" />

      <div className={styles.sheet}>
        <div className={styles.dots} aria-hidden="true">
          {[0, 1].map((i) => (
            <span key={i} className={`${styles.dot}${i === step ? ` ${styles.dotOn}` : ''}`} />
          ))}
        </div>

        {step === 0 ? (
          <>
            <h1 className={styles.title}>your two selves</h1>
            <p className={styles.lede}>
              pick a role for each world. it&rsquo;s all anyone sees — a feeling needs weight, not a
              name.
            </p>

            <div className={styles.worldLabel}>
              <span className={styles.worldDot} style={{ background: WORLDS.personal.accent }} />
              personal · warm world
            </div>
            <RoleField
              value={personalRole}
              onChange={setPersonalRole}
              placeholder="eldest daughter, 24"
              warning={personalWarning}
            />

            <div className={styles.worldLabel} style={{ marginTop: 14 }}>
              <span className={styles.worldDot} style={{ background: WORLDS.professional.accent }} />
              professional · cool world
            </div>
            <RoleField
              value={proRole}
              onChange={setProRole}
              placeholder="intern at a big4"
              warning={proWarning}
            />

            <div className={styles.foot}>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={!rolesOk}
                onClick={() => setStep(1)}
              >
                next
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className={styles.title}>what&rsquo;s been heavy?</h1>
            <p className={styles.lede}>pick a few to seed your feed. you&rsquo;ll see people who get it.</p>

            <div className={styles.topics}>
              {TOPICS.map((t) => {
                const on = picked.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`${styles.topicChip}${on ? ` ${styles.topicChipOn}` : ''}`}
                    aria-pressed={on}
                    onClick={() => toggleTopic(t.id)}
                  >
                    <span className={styles.topicGlyph}>{t.glyph}</span>
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className={styles.foot}>
              <div className={styles.counterLine}>
                {left > 0 ? `pick ${left} more` : 'a feed is already waiting for you'}
              </div>
              {error && <div className={styles.error}>{error}</div>}
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={picked.length < MIN_TOPICS || saving}
                onClick={() => void finish()}
              >
                {saving ? 'opening the feed…' : 'start feeling'}
              </button>
              <button type="button" className={styles.backBtn} onClick={() => setStep(0)}>
                back to your selves
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RoleField({
  value,
  onChange,
  placeholder,
  warning,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  warning: string | null;
}) {
  return (
    <div className={styles.fieldWrap}>
      <div className={`${styles.field}${warning ? ` ${styles.fieldWarn}` : ''}`}>
        <MaskIcon size={17} color="var(--accent)" />
        <input
          className={styles.input}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={48}
        />
      </div>
      <div className={`${styles.helper}${warning ? ` ${styles.helperWarn}` : ''}`}>
        {warning ?? ROLE_HELPER}
      </div>
    </div>
  );
}
