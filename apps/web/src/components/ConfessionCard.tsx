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
  onSame?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onReply?: () => void;
  /** opens the save / report / mute action sheet (signed-in feed) */
  onMore?: () => void;
}

function ReactStat({
  glyph,
  label,
  count,
  active,
  onClick,
}: {
  glyph: string;
  label: string;
  count: number;
  active: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const cls = `${styles.reactBtn}${active ? ` ${styles.reactActive}` : ''}`;
  const inner = (
    <>
      <span className={styles.reactGlyph}>{glyph}</span>
      <span className={styles.reactLabel}>{label}</span>
      <span className={styles.reactCount}>{formatCount(count)}</span>
    </>
  );
  if (!onClick) return <div className={cls}>{inner}</div>;
  return (
    <button type="button" className={cls} onClick={onClick} aria-pressed={active}>
      {inner}
    </button>
  );
}

export function ConfessionCard({
  post,
  mode,
  reacted = null,
  interactive = true,
  onFelt,
  onSame,
  onReply,
  onMore,
}: Props) {
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
        <ReactStat
          glyph="🤍"
          label="felt this"
          count={post.felt_count + (reacted === 'felt' ? 1 : 0)}
          active={reacted === 'felt'}
          onClick={interactive ? onFelt : undefined}
        />
        <ReactStat
          glyph="🫂"
          label="same"
          count={post.same_count + (reacted === 'same' ? 1 : 0)}
          active={reacted === 'same'}
          onClick={interactive ? onSame : undefined}
        />
      </div>
    </article>
  );
}
