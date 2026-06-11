import { MOODS, type MoodKey } from '@unsaid/tokens';
import type { CSSProperties } from 'react';
import styles from './badges.module.css';

export function MoodChip({ mood }: { mood: MoodKey }) {
  const m = MOODS[mood];
  return (
    <span className={styles.moodChip} style={{ '--tint': m.tint } as CSSProperties}>
      <span className={styles.moodDot} />
      {m.label}
    </span>
  );
}
