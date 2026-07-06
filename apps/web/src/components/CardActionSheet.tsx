'use client';

// long-press / "···" action sheet for a feed card: save 🤍, report (with a
// reason picker), and "mute this voice".
import { useState } from 'react';
import type { FeedPost } from '@unsaid/tokens';
import { useDialogA11y } from '@/lib/useDialogA11y';
import styles from './CardActionSheet.module.css';

export type ReportReason = 'harassment' | 'doxxing' | 'self-harm' | 'spam' | 'other';

const REASONS: { id: ReportReason; label: string }[] = [
  { id: 'harassment', label: 'harassment or cruelty' },
  { id: 'doxxing', label: 'doxxing — points at a real person' },
  { id: 'self-harm', label: 'self-harm method or encouragement' },
  { id: 'spam', label: 'spam or nonsense' },
  { id: 'other', label: 'something else' },
];

interface Props {
  post: FeedPost;
  saved: boolean;
  busy?: boolean;
  onSave: () => void;
  onReport: (reason: ReportReason) => void;
  onMute: () => void;
  onClose: () => void;
}

export function CardActionSheet({ post, saved, busy = false, onSave, onReport, onMute, onClose }: Props) {
  const [view, setView] = useState<'menu' | 'report'>('menu');
  const panelRef = useDialogA11y<HTMLDivElement>(onClose);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="card options">
      <div className={styles.scrim} onClick={busy ? undefined : onClose} />
      <div className={styles.sheet} ref={panelRef}>
        <div className={styles.grabber} />
        {view === 'menu' ? (
          <>
            <p className={styles.snippet}>&ldquo;{post.body.length > 72 ? `${post.body.slice(0, 72).trimEnd()}…` : post.body}&rdquo;</p>
            <button type="button" className={styles.row} disabled={busy} onClick={onSave}>
              <span className={styles.rowGlyph} aria-hidden="true">
                🤍
              </span>
              <span className={styles.rowLabel}>{saved ? 'saved — tap to unsave' : 'save this one'}</span>
            </button>
            <button type="button" className={styles.row} disabled={busy} onClick={() => setView('report')}>
              <span className={styles.rowGlyph}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 21V4m0 0h13l-2.5 4L18 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className={styles.rowLabel}>report</span>
            </button>
            <button type="button" className={`${styles.row} ${styles.rowMuted}`} disabled={busy} onClick={onMute}>
              <span className={styles.rowGlyph}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M11 5 6 9H3v6h3l5 4V5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  <path d="m16 9 5 6m0-6-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
              <span className={styles.rowLabel}>mute this voice</span>
              <span className={styles.rowHint}>you&rsquo;ll never see them again — they&rsquo;ll never know</span>
            </button>
            <button type="button" className={styles.cancel} onClick={onClose}>
              never mind
            </button>
          </>
        ) : (
          <>
            <div className={styles.reportTitle}>what&rsquo;s wrong with it?</div>
            <div className={styles.reportSub}>reports are anonymous. a human looks at every one.</div>
            {REASONS.map((r) => (
              <button
                key={r.id}
                type="button"
                className={styles.row}
                disabled={busy}
                onClick={() => onReport(r.id)}
              >
                <span className={styles.rowLabel}>{r.label}</span>
              </button>
            ))}
            <button type="button" className={styles.cancel} onClick={() => setView('menu')}>
              back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
