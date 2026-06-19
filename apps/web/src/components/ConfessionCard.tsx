'use client';

// confession card — full design fidelity port of unsaid-feed.jsx ConfessionCard.
// works server-rendered too (rendered from server pages with interactive=false,
// which strips all handler-dependent buttons).
import { formatCount, relTime, type FeedPost, type Mode, type ReactionType } from '@unsaid/tokens';
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
}: Props) {
  const feltActive = reacted === 'felt';
  const feltCount = post.felt_count + (feltActive ? 1 : 0);
  const replyLabel = `${formatCount(post.comment_count)} ${post.comment_count === 1 ? 'reply' : 'replies'}`;
  return (
    <article className={styles.card} style={cardVars(mode, post.id)}>
      <div className={styles.sheen} />
      <header className={styles.header}>
        <div className={styles.headLeft}>
          <RoleBadge role={post.role_title} />
          <span className={styles.time} suppressHydrationWarning>
            {relTime(post.created_at)}
          </span>
        </div>
        <div className={styles.headRight}>
          {post.mood && <MoodChip mood={post.mood} />}
          {interactive && onMore && (
            <button type="button" className={styles.moreBtn} onClick={onMore} aria-label="more options">
              ···
            </button>
          )}
        </div>
      </header>
      <div className={styles.body}>
        <p className={post.body.length > 130 ? styles.textLong : styles.text}>{post.body}</p>
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
            onClick={onFelt}
            aria-pressed={feltActive}
          >
            <span className={styles.feltGlyph}>🤍</span>
            <span className={styles.feltLabel}>felt this</span>
            <span className={styles.feltCount}>{formatCount(feltCount)}</span>
          </button>
        ) : (
          <div className={`${styles.feltBtn}${feltActive ? ` ${styles.feltActive}` : ''}`}>
            <span className={styles.feltGlyph}>🤍</span>
            <span className={styles.feltLabel}>felt this</span>
            <span className={styles.feltCount}>{formatCount(feltCount)}</span>
          </div>
        )}
      </div>
    </article>
  );
}
