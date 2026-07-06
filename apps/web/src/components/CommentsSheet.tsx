'use client';

// replies bottom sheet — ported from CommentsSheet in unsaid-feed.jsx.
// 74% height, rounded 28 top, one-level threading, live reply composer
// through the publish edge function (comment path, stricter moderation).
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { COMMENT_MAX_CHARS, type FeedPost, type PostComment } from '@unsaid/tokens';
import { fetchComments, publish } from '@unsaid/api';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useDialogA11y } from '@/lib/useDialogA11y';
import { sendPostEvent, subscribePostLive } from '@/lib/postLive';
import { useApp } from './AppContext';
import { RoleBadge } from './RoleBadge';
import styles from './CommentsSheet.module.css';

interface Props {
  post: FeedPost;
  onClose: () => void;
  /** a comment went live — lets the feed bump its count */
  onPosted?: (postId: string) => void;
}

interface Notice {
  kind: 'blocked' | 'crisis';
  message: string;
}

export function CommentsSheet({ post, onClose, onPosted }: Props) {
  const app = useApp();
  const [comments, setComments] = useState<PostComment[] | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);
  // ids that arrived live while the sheet is open — they pop in
  const [liveIds, setLiveIds] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useDialogA11y<HTMLDivElement>(onClose);

  useEffect(() => {
    let on = true;
    const sb = createSupabaseBrowserClient();
    fetchComments(sb, post.id)
      .then((rows) => {
        if (on) setComments(rows);
      })
      .catch(() => {
        if (on) setComments([]);
      });
    return () => {
      on = false;
    };
  }, [post.id]);

  // someone else replies while you're reading — it lands live
  useEffect(
    () =>
      subscribePostLive(post.id, {
        onComment: (fresh) => {
          setComments((c) => {
            if (!c) return c;
            if (c.some((x) => x.id === fresh.id)) return c;
            return [...c, fresh];
          });
          setLiveIds((ids) => new Set(ids).add(fresh.id));
          window.setTimeout(() => {
            listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
          }, 60);
        },
      }),
    [post.id],
  );

  const myRole =
    app.identities?.find((i) => i.mode === post.mode)?.role_title ?? 'anonymous';
  const remaining = COMMENT_MAX_CHARS - text.length;
  const canSend = text.trim().length > 0 && remaining >= 0 && !sending;

  const send = async (acknowledgedCrisis: boolean) => {
    if (!text.trim() || sending) return;
    setSending(true);
    setNotice(null);
    try {
      const sb = createSupabaseBrowserClient();
      const res = await publish(sb, {
        kind: 'comment',
        mode: post.mode,
        body: text.trim(),
        post_id: post.id,
        parent_id: replyTo?.id ?? null,
        acknowledged_crisis: acknowledgedCrisis,
      });
      if (res.verdict === 'published') {
        const fresh: PostComment = {
          id: res.id ?? `local-${Date.now()}`,
          post_id: post.id,
          body: text.trim(),
          role_title: myRole,
          parent_id: replyTo?.id ?? null,
          created_at: new Date().toISOString(),
        };
        setComments((c) => [...(c ?? []), fresh]);
        setText('');
        setReplyTo(null);
        onPosted?.(post.id);
        // let everyone else reading this card see it land
        sendPostEvent(post.id, 'comment', fresh);
        window.setTimeout(() => {
          listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
        }, 30);
      } else if (res.verdict === 'crisis') {
        setNotice({
          kind: 'crisis',
          message:
            res.message ??
            "this sounds heavy. if it's just a feeling, you can still release it — but you deserve someone real too. tele-manas: 14416, free, 24/7.",
        });
      } else {
        setNotice({
          kind: 'blocked',
          message:
            res.message ??
            'that one crossed a line we hold for everyone here. try saying it a little softer 🤍',
        });
      }
    } catch {
      setNotice({
        kind: 'blocked',
        message: 'something slipped — your words are safe, try again in a moment.',
      });
    } finally {
      setSending(false);
    }
  };

  const topLevel = (comments ?? []).filter((c) => !c.parent_id);
  const childrenOf = (id: string) => (comments ?? []).filter((c) => c.parent_id === id);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="replies">
      <div className={styles.scrim} onClick={onClose} />
      <div className={styles.sheet} ref={panelRef}>
        <div className={styles.grabber} />
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="close replies">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
        <div className={styles.title}>replies</div>
        <div className={styles.sub}>kindness only. anonymous, role-tagged, stricter rules than posts.</div>

        <div className={styles.list} ref={listRef}>
          {comments === null && (
            <div className={styles.loading} role="status">
              listening…
            </div>
          )}
          {comments !== null && topLevel.length === 0 && (
            <div className={styles.empty}>
              no replies yet.
              <br />
              be the first to say &ldquo;same.&rdquo;
            </div>
          )}
          {topLevel.map((c) => (
            <div key={c.id}>
              <CommentRow
                comment={c}
                live={liveIds.has(c.id)}
                onReply={post.comments_enabled ? () => setReplyTo(c) : undefined}
              />
              {childrenOf(c.id).map((child) => (
                <div key={child.id} className={styles.nested}>
                  <CommentRow comment={child} live={liveIds.has(child.id)} />
                </div>
              ))}
            </div>
          ))}
        </div>

        {notice && (
          <div
            className={`${styles.notice}${notice.kind === 'crisis' ? ` ${styles.noticeCrisis}` : ''}`}
            role="alert"
          >
            <span>{notice.message}</span>
            {notice.kind === 'crisis' && (
              <button type="button" className={styles.noticeAction} onClick={() => void send(true)}>
                it&rsquo;s just a feeling — release it anyway
              </button>
            )}
          </div>
        )}

        {!post.comments_enabled ? (
          <div className={styles.repliesOff}>replies are off for this one</div>
        ) : !app.user ? (
          <Link href="/auth" className={styles.signInRow}>
            get in quietly to reply 🤍
          </Link>
        ) : !app.onboarded ? (
          <Link href="/welcome" className={styles.signInRow}>
            set up your two selves to reply 🤍
          </Link>
        ) : (
          <>
            {replyTo && (
              <div className={styles.replyingTo}>
                replying to <em>{replyTo.role_title}</em>
                <button type="button" className={styles.replyingCancel} onClick={() => setReplyTo(null)}>
                  cancel
                </button>
              </div>
            )}
            <div className={styles.composer}>
              <input
                className={styles.input}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="reply with care…"
                aria-label="write a reply"
                maxLength={COMMENT_MAX_CHARS + 40}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canSend) void send(false);
                }}
              />
              {remaining < 60 && (
                <span className={`${styles.counter}${remaining < 0 ? ` ${styles.counterOver}` : ''}`}>
                  {remaining}
                </span>
              )}
              <button
                type="button"
                className={styles.sendBtn}
                disabled={!canSend}
                onClick={() => void send(false)}
                aria-label="send reply"
              >
                ↑
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CommentRow({
  comment,
  live = false,
  onReply,
}: {
  comment: PostComment;
  live?: boolean;
  onReply?: () => void;
}) {
  return (
    <div className={`${styles.comment}${live ? ` ${styles.commentLive}` : ''}`}>
      <div className={styles.commentHead}>
        <RoleBadge role={comment.role_title} flat />
      </div>
      <p className={styles.commentBody}>{comment.body}</p>
      {onReply && (
        <button type="button" className={styles.replyLink} onClick={onReply}>
          reply
        </button>
      )}
    </div>
  );
}
