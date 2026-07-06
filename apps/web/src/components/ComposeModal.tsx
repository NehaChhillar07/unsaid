'use client';

// compose — full parity with the app's ComposeSheet (unsaid-screens.jsx):
// 500 chars, mood picker, "replies on" toggle, debounced draft autosave,
// paper-plane publish moment. crisis verdict → helpline panel; blocked →
// kind message.
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import {
  HELPLINES,
  MOODS,
  MOOD_LIST,
  POST_MAX_CHARS,
  type Mode,
  type MoodKey,
} from '@unsaid/tokens';
import { fetchDraft, publish, saveDraft } from '@unsaid/api';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useDialogA11y } from '@/lib/useDialogA11y';
import styles from './modals.module.css';

type Stage = 'write' | 'sending' | 'crisis' | 'blocked' | 'released';

const DRAFT_DEBOUNCE_MS = 800;

interface Props {
  mode: Mode;
  onClose: () => void;
  /** prefill (e.g. tapping a draft in the you space) — skips draft loading */
  initialBody?: string;
  initialMood?: MoodKey | null;
  /** called after the release moment finishes (refresh feeds etc.) */
  onPublished?: () => void;
}

export function ComposeModal({ mode, onClose, initialBody, initialMood, onPublished }: Props) {
  const router = useRouter();
  const [text, setText] = useState(initialBody ?? '');
  const [mood, setMood] = useState<MoodKey | null>(initialMood ?? null);
  const [commentsOn, setCommentsOn] = useState(true);
  const [stage, setStage] = useState<Stage>('write');
  const [blockedMsg, setBlockedMsg] = useState<string | null>(null);
  const [draftLine, setDraftLine] = useState<string | null>(null);

  const hydrated = useRef(false); // draft loaded (or skipped) — autosave armed
  const touched = useRef(false); // user typed since open
  const draftTimer = useRef(0);
  const published = useRef(false);
  const panelRef = useDialogA11y<HTMLDivElement>(onClose);

  // load the per-mode draft on open (unless prefilled)
  useEffect(() => {
    if (initialBody !== undefined) {
      hydrated.current = true;
      return;
    }
    let on = true;
    const sb = createSupabaseBrowserClient();
    fetchDraft(sb, mode)
      .then((d) => {
        if (!on) return;
        if (d && !touched.current) {
          setText(d.body);
          setMood(d.mood);
          setDraftLine('picked up where you left off · half a feeling is still a feeling');
        }
      })
      .catch(() => {})
      .finally(() => {
        hydrated.current = true;
      });
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // final save on close — don't lose the last keystrokes to the debounce
  const latest = useRef<{ text: string; mood: MoodKey | null }>({ text: '', mood: null });
  latest.current = { text, mood };
  useEffect(
    () => () => {
      if (touched.current && !published.current) {
        const sb = createSupabaseBrowserClient();
        void saveDraft(sb, mode, latest.current.text, latest.current.mood).catch(() => {});
      }
    },
    [mode],
  );

  // debounced autosave
  useEffect(() => {
    if (!hydrated.current || !touched.current || published.current) return;
    window.clearTimeout(draftTimer.current);
    draftTimer.current = window.setTimeout(() => {
      const sb = createSupabaseBrowserClient();
      void saveDraft(sb, mode, text, mood).catch(() => {});
    }, DRAFT_DEBOUNCE_MS);
    return () => window.clearTimeout(draftTimer.current);
  }, [text, mood, mode]);

  const remaining = POST_MAX_CHARS - text.length;
  const over = remaining < 0;
  const canRelease = text.trim().length > 0 && !over;

  const release = useCallback(
    async (acknowledgedCrisis: boolean) => {
      setStage('sending');
      try {
        const sb = createSupabaseBrowserClient();
        const res = await publish(sb, {
          kind: 'post',
          mode,
          body: text.trim(),
          mood,
          comments_enabled: commentsOn,
          acknowledged_crisis: acknowledgedCrisis,
        });
        if (res.verdict === 'published') {
          published.current = true;
          window.clearTimeout(draftTimer.current);
          // the words made it out — the draft has done its job
          void saveDraft(sb, mode, '', null).catch(() => {});
          setStage('released');
          window.setTimeout(() => {
            if (onPublished) onPublished();
            else {
              onClose();
              router.refresh();
            }
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
    },
    [mode, text, mood, commentsOn, onClose, onPublished, router],
  );

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="spill it">
      <div className={styles.scrim} onClick={stage === 'sending' ? undefined : onClose} />
      <div className={styles.sheet} ref={panelRef}>
        <div className={styles.grabber} />

        {stage === 'released' && (
          <div className={styles.released} role="status">
            <span className={styles.releasedPlane} aria-hidden="true">
              ✈️
            </span>
            <div className={styles.releasedText}>released into the feed 🤍</div>
          </div>
        )}

        {stage === 'crisis' && (
          <div role="alert">
            <div style={{ fontSize: 30, marginBottom: 14 }} aria-hidden="true">
              🤍
            </div>
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
          </div>
        )}

        {stage === 'blocked' && (
          <div role="alert">
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
          </div>
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
            {draftLine && <div className={styles.draftLine}>{draftLine}</div>}
            <textarea
              className={styles.textarea}
              value={text}
              onChange={(e) => {
                touched.current = true;
                if (draftLine) setDraftLine(null);
                setText(e.target.value);
              }}
              placeholder="say the thing you've never said…"
              aria-label="your confession"
              autoFocus
              maxLength={POST_MAX_CHARS}
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
                    aria-pressed={on}
                    onClick={() => {
                      touched.current = true;
                      setMood(on ? null : mk);
                    }}
                  >
                    <span className={styles.moodDot} aria-hidden="true" />
                    {m.label}
                  </button>
                );
              })}
            </div>
            <div className={styles.composeFoot}>
              <button
                type="button"
                className={styles.repliesToggle}
                onClick={() => setCommentsOn((v) => !v)}
                role="switch"
                aria-checked={commentsOn}
              >
                <span className={`${styles.switchTrack}${commentsOn ? ` ${styles.switchTrackOn}` : ''}`}>
                  <span className={styles.switchThumb} />
                </span>
                <span className={styles.repliesToggleLabel}>replies on</span>
              </button>
              <span
                className={`${styles.counter}${over ? ` ${styles.counterOver}` : remaining < 60 ? ` ${styles.counterWarn}` : ''}`}
                role={remaining < 20 ? 'status' : undefined}
                aria-label={`${remaining} characters left`}
              >
                {remaining}
              </span>
            </div>
            <div className={styles.composeFinePrint}>
              auto-saved as you type · gone means gone — you can delete it any time in your space.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
