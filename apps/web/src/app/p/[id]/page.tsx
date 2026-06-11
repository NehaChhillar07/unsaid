import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchComments, fetchPost } from '@unsaid/api';
import { formatCount, type FeedPost, type PostComment } from '@unsaid/tokens';
import { createAnonReadClient } from '@/lib/supabase/server';
import { worldVars } from '@/lib/theme';
import { ConfessionCard } from '@/components/ConfessionCard';
import { RoleBadge } from '@/components/RoleBadge';
import { MaskIcon } from '@/components/MaskIcon';
import { PostReplyBar } from '@/components/PostReplyBar';
import styles from './post.module.css';

export const revalidate = 60;

interface Params {
  params: Promise<{ id: string }>;
}

async function getPost(id: string): Promise<FeedPost | null> {
  try {
    return await fetchPost(createAnonReadClient(), id);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) return { title: 'unsaid' };
  const snippet = post.body.length > 60 ? `${post.body.slice(0, 60).trimEnd()}…` : post.body;
  const title = `an unsaid confession — "${snippet}"`;
  const description = `felt by ${formatCount(post.felt_count)} strangers. nobody knows who said it. say yours — anonymously.`;
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function PostPage({ params }: Params) {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) notFound();

  let comments: PostComment[] = [];
  if (post.comments_enabled && post.comment_count > 0) {
    try {
      comments = await fetchComments(createAnonReadClient(), post.id);
    } catch {
      comments = [];
    }
  }

  const topLevel = comments.filter((c) => !c.parent_id);
  const childrenOf = (parentId: string) => comments.filter((c) => c.parent_id === parentId);

  return (
    <div className={`themed ${styles.page}`} style={worldVars(post.mode)}>
      <div className={styles.column}>
        <Link href="/" className={styles.brandLink}>
          <MaskIcon size={18} color="var(--accent)" />
          unsaid
        </Link>

        <div className={styles.cardWrap}>
          <ConfessionCard post={post} mode={post.mode} interactive={false} />
        </div>

        <Link href="/" className={styles.cta}>
          say yours — anonymously
        </Link>

        <section className={styles.replies} aria-label="replies">
          <h2 className={styles.repliesTitle}>replies</h2>
          <p className={styles.repliesSub}>kindness only. anonymous, role-tagged, stricter rules than posts.</p>
          <PostReplyBar post={post} />
          {topLevel.length === 0 && (
            <p className={styles.emptyReplies}>
              no replies yet.
              <br />
              be the first to say &ldquo;same.&rdquo;
            </p>
          )}
          {topLevel.map((c) => (
            <div key={c.id}>
              <Comment comment={c} />
              {childrenOf(c.id).map((child) => (
                <div key={child.id} className={styles.nested}>
                  <Comment comment={child} />
                </div>
              ))}
            </div>
          ))}
        </section>

        <footer className={styles.footer}>
          <Link href="/legal/privacy">privacy</Link>
          <span aria-hidden="true">·</span>
          <Link href="/legal/anonymous">what anonymous means here</Link>
        </footer>
      </div>
    </div>
  );
}

function Comment({ comment }: { comment: PostComment }) {
  return (
    <div className={styles.comment}>
      <div className={styles.commentHead}>
        <RoleBadge role={comment.role_title} flat />
      </div>
      <p className={styles.commentBody}>{comment.body}</p>
    </div>
  );
}
