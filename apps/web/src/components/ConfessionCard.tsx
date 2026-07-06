'use client';

// confession card — full design fidelity port of unsaid-feed.jsx ConfessionCard.
// works server-rendered too (rendered from server pages with interactive=false,
// which strips all handler-dependent buttons).
import { useState } from 'react';
import { useFeltBurst } from './FeltBurst';
import { formatCount, type FeedPost, type Mode, type ReactionType } from '@unsaid/tokens';
import { cardVars } from '@/lib/theme';
import { RoleBadge } from './RoleBadge';
import { MoodChip } from './MoodChip';
import styles from './ConfessionCard.module.css';

interface Props {
  post: FeedPost;
  mode: Mode;
  reacted?: ReactionType | null;
  interactive?: boolean;
  onFelt?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** "not for me" — private skip; advances + dismisses */
  onNotForMe?: () => void;
  onReply?: () => void;
  /** opens the save / report / mute action sheet (signed-in feed) */
  onMore?: () => void;
  /** whether this post is in the viewer's saved list */
  saved?: boolean;
  /** one-tap save / unsave from the card header (signed-in feed) */
  onToggleSave?: () => void;
  /** fixed-size card (swipe deck): fills its band, body font shrinks to fit */
  uniform?: boolean;
}

export function ConfessionCard({
  post,
  mode,
  reacted = null,
  interactive = true,
  onFelt,
  onNotForMe,
  onReply,
  onMore,
  saved = false,
  onToggleSave,
  uniform = false,
}: Props) {
  const feltActive = reacted === 'felt';
  // felt taps: bump a counter (re-keys the heartbeat + red-shadow pop on the
  // button) and spawn a screen-wide red-heart burst anchored at the button's
  // position, rendered in a <body> portal so it flies over the whole screen.
  const [burst, setBurst] = useState(0);
  const triggerBurst = useFeltBurst();
  const handleFelt = (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setBurst((b) => b + 1);
    // the celebration lives in a stable, app-lifetime layer (FeltBurstProvider),
    // not this card's subtree — so advancing/unmounting the card mid-burst can
    // never make React remove a portal node from a torn-down parent.
    triggerBurst(r.left + r.width / 2, r.top);
    onFelt?.(e);
  };
  const felted = feltActive || burst > 0;
  const feltCount = post.felt_count + (feltActive ? 1 : 0);
  const replyLabel = `${formatCount(post.comment_count)} ${post.comment_count === 1 ? 'reply' : 'replies'}`;
  return (
    <article className={`${styles.card}${uniform ? ` ${styles.uniform}` : ''}`} style={cardVars(mode, post.id)}>
      <div className={styles.sheen} />
      <header className={styles.header}>
        <div className={styles.headLeft}>
          <RoleBadge role={post.role_title} />
        </div>
        <div className={styles.headRight}>
          {post.mood && <MoodChip mood={post.mood} />}
          {interactive && onToggleSave && (
            <button
              type="button"
              className={`${styles.saveBtn}${saved ? ` ${styles.saveBtnOn}` : ''}`}
              onClick={onToggleSave}
              aria-pressed={saved}
              aria-label={saved ? 'saved — tap to unsave' : 'save this one'}
            >
              <span key={saved ? 'on' : 'off'} className={styles.saveGlyph}>
                <BookmarkIcon filled={saved} />
              </span>
            </button>
          )}
          {interactive && onMore && (
            <button type="button" className={styles.moreBtn} onClick={onMore} aria-label="more options">
              ···
            </button>
          )}
        </div>
      </header>
      <div className={styles.body}>
        <p
          className={!uniform && post.body.length > 130 ? styles.textLong : styles.text}
          style={uniform ? { fontSize: bodyFontSize(post.body.length) } : undefined}
        >
          {post.body}
        </p>
      </div>
      {interactive && onReply ? (
        <button type="button" className={styles.replyRow} onClick={onReply}>
          {replyLabel}
        </button>
      ) : (
        <div className={styles.replyRow}>{replyLabel}</div>
      )}
      <div className={styles.reactions}>
        {/* left — quiet private skip, no count, never shown to the author */}
        {interactive && onNotForMe ? (
          <button type="button" className={styles.skipBtn} onClick={onNotForMe}>
            not for me
          </button>
        ) : (
          <div className={styles.skipBtn}>not for me</div>
        )}
        {/* right — the one warm, public, counted reaction */}
        {interactive && onFelt ? (
          <button
            type="button"
            className={`${styles.feltBtn}${feltActive ? ` ${styles.feltActive}` : ''}`}
            onClick={handleFelt}
            aria-pressed={feltActive}
          >
            <span
              key={burst}
              className={`${styles.feltGlyph}${burst ? ` ${styles.feltGlyphBeat}` : ''}`}
              aria-hidden="true"
            >
              {felted ? '❤️' : '🤍'}
            </span>
            <span className={styles.feltLabel}>felt this</span>
            <span className={styles.feltCount}>{formatCount(feltCount)}</span>
            {burst > 0 && <span key={`glow-${burst}`} className={styles.feltGlow} aria-hidden="true" />}
          </button>
        ) : (
          <div className={`${styles.feltBtn}${feltActive ? ` ${styles.feltActive}` : ''}`}>
            <span className={styles.feltGlyph} aria-hidden="true">
              🤍
            </span>
            <span className={styles.feltLabel}>felt this</span>
            <span className={styles.feltCount}>{formatCount(feltCount)}</span>
          </div>
        )}
      </div>

    </article>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} aria-hidden="true">
      <path
        d="M6 4.5h12a1 1 0 0 1 1 1V20l-7-3.5L5 20V5.5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// body font shrinks in fixed-size (deck) cards so longer spills still fit the
// same card without changing its height.
function bodyFontSize(len: number): number {
  // keep the design's native confession sizes (27/24) for typical spills and
  // step down for longer ones — never below the 16px body-readability floor.
  if (len <= 80) return 27;
  if (len <= 140) return 24;
  if (len <= 210) return 21;
  if (len <= 280) return 18;
  return 16;
}
