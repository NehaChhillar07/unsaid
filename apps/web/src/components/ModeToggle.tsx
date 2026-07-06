'use client';

// the signature warm↔cool switch — ported from unsaid-screens.jsx ModeToggle.
import { WORLDS, type Mode } from '@unsaid/tokens';
import styles from './ModeToggle.module.css';

const OPTS: Mode[] = ['personal', 'professional'];

export function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className={styles.toggle} role="group" aria-label="world">
      <div className={styles.thumb} style={{ left: mode === 'personal' ? 4 : 'calc(50%)' }} />
      {OPTS.map((key) => (
        <button
          key={key}
          type="button"
          aria-pressed={mode === key}
          className={`${styles.opt}${mode === key ? ` ${styles.optActive}` : ''}`}
          onClick={() => onChange(key)}
        >
          <span
            className={styles.dot}
            style={{ background: WORLDS[key].accent, opacity: mode === key ? 1 : 0.5 }}
          />
          {WORLDS[key].label}
        </button>
      ))}
    </div>
  );
}
