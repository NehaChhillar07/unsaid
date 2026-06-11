'use client';

// minimal web compose — the app is the home; this is the magic-link bonus.
// 500 chars, mood chips, publish through the `publish` edge function.
// crisis verdict → helpline panel (expression is allowed, with care);
// blocked → kind message.
import { useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import {
  HELPLINES,
  MOODS,
  MOOD_LIST,
  POST_MAX_CHARS,
  type Mode,
  type MoodKey,
} from '@unsaid/tokens';
import { publish } from '@unsaid/api';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import styles from './modals.module.css';

type Stage = 'write' | 'sending' | 'crisis' | 'blocked' | 'released';

export function ComposeModal({ mode, onClose }: { mode: Mode; onClose: () => void }) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [mood, setMood] = useState<MoodKey | null>(null);
  const [stage, setStage] = useState<Stage>('write');
  const [blockedMsg, setBlockedMsg] = useState<string | null>(null);

  const remaining = POST_MAX_CHARS - text.length;
  const over = remaining < 0;
  const canRelease = text.trim().length > 0 && !over;

  const release = async (acknowledgedCrisis: boolean) => {
    setStage('sending');
    try {
      const sb = createSupabaseBrowserClient();
      const res = await publish(sb, {
        kind: 'post',
        mode,
        body: text.trim(),
        mood,
        comments_enabled: true,
        acknowledged_crisis: acknowledgedCrisis,
      });
      if (res.verdict === 'published') {
        setStage('released');
        window.setTimeout(() => {
          onClose();
          router.refresh();
        }, 1600);
      } else if (res.verdict === 'crisis') {
        setStage('crisis');
      } else {
        setBlockedMsg(res.message ?? null);
        setStage('blocked');
      }
    } catch {
      setBlockedMsg('something slipped — your words are safe here, try again in a moment.');
      setStage('blocked');
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="spill it">
      <div className={styles.scrim} onClick={stage === 'sending' ? undefined : onClose} />
      <div className={styles.sheet}>
        <div className={styles.grabber} />

        {stage === 'released' && (
          <div className={styles.released}>
            <span className={styles.releasedPlane}>✈️</span>
            <div className={styles.releasedText}>released into the feed 🤍</div>
          </div>
        )}

        {stage === 'crisis' && (
          <>
            <div style={{ fontSize: 30, marginBottom: 14 }}>🤍</div>
            <h2 className={styles.title}>it sounds like you&rsquo;re carrying something really heavy right now.</h2>
            <p className={styles.copy}>
              you deserve someone real on the other end. these people are kind, free, and ready to
              listen — no judgement.
            </p>
            <div className={styles.helplineList}>
              {HELPLINES.map((l) => (
                <a key={l.name} href={`tel:${l.tel}`} className={styles.helpline}>
                  <span>
                    <span className={styles.helplineName}>{l.name}</span>
                    <br />
                    <span className={styles.helplineDetail}>{l.detail}</span>
                  </span>
                  <span className={styles.helplineArrow}>→</span>
                </a>
              ))}
            </div>
            <button type="button" className={styles.primaryBtn} onClick={onClose}>
              talk to someone now
            </button>
            <button type="button" className={styles.ghostBtn} onClick={() => void release(true)}>
              it&rsquo;s just a feeling — release it anyway
            </button>
          </>
        )}

        {stage === 'blocked' && (
          <>
            <h2 className={styles.title}>this one can&rsquo;t go out as written.</h2>
            <p className={styles.copy}>
              {blockedMsg ??
                'it crossed a line we hold for everyone — try saying it a little softer. we want you here.'}
            </p>
            <button type="button" className={styles.primaryBtn} onClick={() => setStage('write')}>
              edit it
            </button>
            <button type="button" className={styles.ghostBtn} onClick={onClose}>
              let it go for now
            </button>
          </>
        )}

        {(stage === 'write' || stage === 'sending') && (
          <>
            <div className={styles.composeHead}>
              <button type="button" className={styles.cancelBtn} onClick={onClose}>
                cancel
              </button>
              <span className={styles.composeHeadTitle}>spill it</span>
              <button
                type="button"
                className={styles.releaseBtn}
                disabled={!canRelease || stage === 'sending'}
                onClick={() => void release(false)}
              >
                {stage === 'sending' ? 'releasing…' : 'release'}
              </button>
            </div>
            <div className={styles.roleRow}>
              <span>posting to your {mode} world · anonymous, role-tagged</span>
            </div>
            <textarea
              className={styles.textarea}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="say the thing you've never said…"
              autoFocus
              maxLength={POST_MAX_CHARS + 100}
            />
            <div className={styles.moodLabel}>how does it feel? (optional)</div>
            <div className={styles.moodRow}>
              {MOOD_LIST.map((mk) => {
                const m = MOODS[mk];
                const on = mood === mk;
                return (
                  <button
                    key={mk}
                    type="button"
                    className={`${styles.moodBtn}${on ? ` ${styles.moodBtnOn}` : ''}`}
                    style={{ '--tint': m.tint } as CSSProperties}
                    onClick={() => setMood(on ? null : mk)}
                  >
                    <span className={styles.moodDot} />
                    {m.label}
                  </button>
                );
              })}
            </div>
            <div className={styles.composeFoot}>
              <span className={styles.copy} style={{ margin: 0, fontSize: 12 }}>
                gone means gone — you can delete it any time in the app.
              </span>
              <span
                className={`${styles.counter}${over ? ` ${styles.counterOver}` : remaining < 60 ? ` ${styles.counterWarn}` : ''}`}
              >
                {remaining}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
