// @unsaid/api — typed Supabase access shared by mobile + web.
// Anonymity rule: reads go through the public views (feed_posts, post_comments);
// all writes that touch posts/comments/reactions go through edge functions.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  FeedPost, PostComment, OwnPost, NotificationRow, Identity,
  Mode, MoodKey, TopicId, PublishRequest, PublishResponse,
  ReactionType, RoleCheckResponse,
} from '@unsaid/tokens';

export type UnsaidClient = SupabaseClient;

export interface ClientOptions {
  url: string;
  anonKey: string;
  /** AsyncStorage-compatible storage for React Native; omit on web */
  storage?: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  };
}

export function createUnsaidClient({ url, anonKey, storage }: ClientOptions): UnsaidClient {
  return createClient(url, anonKey, {
    auth: {
      ...(storage ? { storage } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: !storage,
    },
  });
}

const FEED_PAGE = 12;

export interface FeedPage {
  posts: FeedPost[];
  nextCursor: string | null;
}

export interface FeedOptions {
  /**
   * The viewer's interest topics for this mode (from onboarding). When set,
   * on-topic posts lead the opening page so the feed reflects "you'll see
   * people who get it"; the rest fill in so the feed is never starved.
   */
  topics?: TopicId[];
}

/**
 * Cursor-paged feed for a mode. The feed_posts view already excludes
 * hidden/removed posts, the caller's own seen posts, and muted authors.
 *
 * Personalization: on the opening page (no cursor), if `topics` are supplied,
 * posts tagged with one of those topics are ranked first, then the newest of
 * the rest fill the remaining slots. Deeper pages stay purely chronological.
 */
export async function fetchFeed(
  sb: UnsaidClient,
  mode: Mode,
  sort: 'newest' | 'felt',
  cursor?: string | null,
  opts?: FeedOptions,
): Promise<FeedPage> {
  const topics = (opts?.topics ?? []).filter(Boolean);

  // ── personalized opening page ──
  if (topics.length > 0 && !cursor) {
    let leadQ = sb.from('feed_posts').select('*').eq('mode', mode).in('topic', topics).limit(FEED_PAGE);
    leadQ =
      sort === 'felt'
        ? leadQ.order('felt_count', { ascending: false }).order('created_at', { ascending: false })
        : leadQ.order('created_at', { ascending: false });
    const { data: leadData, error: leadErr } = await leadQ;
    if (leadErr) throw leadErr;
    const lead = (leadData ?? []) as FeedPost[];

    if (lead.length >= FEED_PAGE) {
      const last = lead[lead.length - 1];
      return { posts: lead, nextCursor: last ? last.created_at : null };
    }

    // fill the remaining slots with the newest of everything else
    let restQ = sb.from('feed_posts').select('*').eq('mode', mode).limit(FEED_PAGE + lead.length);
    restQ =
      sort === 'felt'
        ? restQ.order('felt_count', { ascending: false }).order('created_at', { ascending: false })
        : restQ.order('created_at', { ascending: false });
    const { data: restData, error: restErr } = await restQ;
    if (restErr) throw restErr;
    const seen = new Set(lead.map((p) => p.id));
    const fillers = ((restData ?? []) as FeedPost[])
      .filter((p) => !seen.has(p.id))
      .slice(0, FEED_PAGE - lead.length);
    const posts = [...lead, ...fillers];
    const last = posts[posts.length - 1];
    return { posts, nextCursor: posts.length === FEED_PAGE && last ? last.created_at : null };
  }

  // ── default chronological / felt page (also used for pagination) ──
  let q = sb.from('feed_posts').select('*').eq('mode', mode).limit(FEED_PAGE);
  if (sort === 'felt') q = q.order('felt_count', { ascending: false }).order('created_at', { ascending: false });
  else q = q.order('created_at', { ascending: false });
  if (cursor && sort === 'newest') q = q.lt('created_at', cursor);
  const { data, error } = await q;
  if (error) throw error;
  const posts = (data ?? []) as FeedPost[];
  const last = posts[posts.length - 1];
  return {
    posts,
    nextCursor: posts.length === FEED_PAGE && last ? last.created_at : null,
  };
}

/** count of live posts newer than the newest the client has — powers the "new drops" pill */
export async function countNewSince(sb: UnsaidClient, mode: Mode, sinceIso: string): Promise<number> {
  const { count, error } = await sb
    .from('feed_posts')
    .select('id', { count: 'exact', head: true })
    .eq('mode', mode)
    .gt('created_at', sinceIso);
  if (error) throw error;
  return count ?? 0;
}

export async function fetchComments(sb: UnsaidClient, postId: string): Promise<PostComment[]> {
  const { data, error } = await sb
    .from('post_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PostComment[];
}

export async function fetchPost(sb: UnsaidClient, postId: string): Promise<FeedPost | null> {
  const { data, error } = await sb.from('feed_posts').select('*').eq('id', postId).maybeSingle();
  if (error) throw error;
  return data as FeedPost | null;
}

// ── edge function calls ───────────────────────────────────────

async function invoke<T>(sb: UnsaidClient, fn: string, body: object): Promise<T> {
  const { data, error } = await sb.functions.invoke(fn, { body: body as Record<string, unknown> });
  if (error) throw error;
  return data as T;
}

export function publish(sb: UnsaidClient, req: PublishRequest): Promise<PublishResponse> {
  return invoke(sb, 'publish', req);
}

export function react(sb: UnsaidClient, postId: string, type: ReactionType): Promise<{ active: boolean }> {
  return invoke(sb, 'react', { post_id: postId, type });
}

/**
 * The caller's own reactions for a set of posts — used to seed the feed so
 * returning users see correct felt state (no inverted toggle on reload).
 * RLS limits this to the caller's own rows; nothing about other users leaks.
 */
export async function fetchMyReactions(
  sb: UnsaidClient,
  postIds: string[],
): Promise<Record<string, ReactionType>> {
  if (!postIds.length) return {};
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return {};
  const { data, error } = await sb
    .from('reactions')
    .select('post_id, type')
    .in('post_id', postIds);
  if (error) throw error;
  const out: Record<string, ReactionType> = {};
  for (const r of (data ?? []) as { post_id: string; type: ReactionType }[]) {
    out[r.post_id] = r.type;
  }
  return out;
}

export function report(
  sb: UnsaidClient,
  target: { type: 'post' | 'comment'; id: string },
  reason: string,
  muteAuthor = false,
): Promise<{ ok: boolean }> {
  return invoke(sb, 'report', {
    target_type: target.type, target_id: target.id, reason, mute_author: muteAuthor,
  });
}

export function muteAuthorOf(sb: UnsaidClient, target: { type: 'post' | 'comment'; id: string }): Promise<{ ok: boolean }> {
  return invoke(sb, 'mute', { target_type: target.type, target_id: target.id });
}

export function roleCheck(sb: UnsaidClient, roleTitle: string): Promise<RoleCheckResponse> {
  return invoke(sb, 'role-check', { role_title: roleTitle });
}

export function wipeAccount(sb: UnsaidClient): Promise<{ ok: boolean }> {
  return invoke(sb, 'wipe-account', {});
}

// ── own-data reads/writes (RLS-protected, direct) ─────────────

export async function markSeen(sb: UnsaidClient, postId: string): Promise<void> {
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return;
  await sb.from('seen').upsert(
    { user_id: u.user.id, post_id: postId },
    { onConflict: 'user_id,post_id', ignoreDuplicates: true },
  );
}

/**
 * "not for me" — a private skip. Records a dismissal (with mood/topic for future
 * feed-tuning) and marks the post seen so it never recurs. No public count, no
 * author notification — invisible to everyone but the user.
 */
export async function dismiss(sb: UnsaidClient, post: FeedPost): Promise<void> {
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return;
  await sb.from('dismissals').upsert(
    { user_id: u.user.id, post_id: post.id, mood: post.mood, topic: post.topic },
    { onConflict: 'user_id,post_id', ignoreDuplicates: true },
  );
  await markSeen(sb, post.id);
}

export async function toggleSave(sb: UnsaidClient, postId: string, on: boolean): Promise<void> {
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return;
  if (on) {
    await sb.from('saves').upsert(
      { user_id: u.user.id, post_id: postId },
      { onConflict: 'user_id,post_id', ignoreDuplicates: true },
    );
  } else {
    await sb.from('saves').delete().eq('user_id', u.user.id).eq('post_id', postId);
  }
}

export async function fetchSaved(sb: UnsaidClient, mode: Mode): Promise<FeedPost[]> {
  const { data, error } = await sb
    .from('saved_posts')
    .select('*')
    .eq('mode', mode)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as FeedPost[];
}

export async function fetchOwnPosts(sb: UnsaidClient, mode: Mode): Promise<OwnPost[]> {
  const { data, error } = await sb
    .from('posts')
    .select('id, mode, body, mood, status, felt_count, same_count, comment_count, comments_enabled, created_at')
    .eq('mode', mode)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as OwnPost[];
}

export async function deleteOwnPost(sb: UnsaidClient, postId: string): Promise<void> {
  const { error } = await sb.from('posts').delete().eq('id', postId);
  if (error) throw error;
}

export interface Draft { mode: Mode; body: string; mood: MoodKey | null; updated_at: string }

export async function saveDraft(sb: UnsaidClient, mode: Mode, body: string, mood: MoodKey | null): Promise<void> {
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return;
  if (!body.trim()) {
    await sb.from('drafts').delete().eq('user_id', u.user.id).eq('mode', mode);
    return;
  }
  await sb.from('drafts').upsert(
    { user_id: u.user.id, mode, body, mood, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,mode' },
  );
}

export async function fetchDraft(sb: UnsaidClient, mode: Mode): Promise<Draft | null> {
  const { data, error } = await sb.from('drafts').select('*').eq('mode', mode).maybeSingle();
  if (error) throw error;
  return data as Draft | null;
}

export async function fetchIdentities(sb: UnsaidClient): Promise<Identity[]> {
  const { data, error } = await sb.from('identities').select('id, mode, role_title, topics');
  if (error) throw error;
  return (data ?? []) as Identity[];
}

export async function upsertIdentity(
  sb: UnsaidClient, mode: Mode, roleTitle: string, topics: TopicId[],
): Promise<void> {
  const { data: u } = await sb.auth.getUser();
  if (!u.user) throw new Error('not signed in');
  const { error } = await sb.from('identities').upsert(
    { user_id: u.user.id, mode, role_title: roleTitle, topics },
    { onConflict: 'user_id,mode' },
  );
  if (error) throw error;
}

export async function ensureProfile(sb: UnsaidClient): Promise<void> {
  const { data: u } = await sb.auth.getUser();
  if (!u.user) throw new Error('not signed in');
  await sb.from('profiles').upsert(
    { user_id: u.user.id },
    { onConflict: 'user_id', ignoreDuplicates: true },
  );
}

export async function fetchNotifications(sb: UnsaidClient, mode: Mode): Promise<NotificationRow[]> {
  const { data, error } = await sb
    .from('notifications')
    .select('id, mode, type, payload, read, created_at')
    .eq('mode', mode)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as NotificationRow[];
}

export async function markNotificationsRead(sb: UnsaidClient, mode: Mode): Promise<void> {
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return;
  await sb.from('notifications').update({ read: true }).eq('user_id', u.user.id).eq('mode', mode).eq('read', false);
}
