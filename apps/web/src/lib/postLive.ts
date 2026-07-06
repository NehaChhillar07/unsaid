'use client';

// per-post realtime presence — a broadcast channel per post carries 'felt'
// and 'comment' events so everyone looking at the same card sees reactions
// and replies land live. broadcast-only (no postgres change feed): nothing
// identifying crosses the wire, just the same view-data everyone already sees.
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { PostComment } from '@unsaid/tokens';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export interface PostLiveHandlers {
  onFelt?: (e: { delta: number }) => void;
  onComment?: (c: PostComment) => void;
}

interface Entry {
  ch: RealtimeChannel;
  subs: Set<PostLiveHandlers>;
  ready: Promise<void>;
  teardown: number;
}

// one shared client + one channel per post, no matter how many components listen
let sb: ReturnType<typeof createSupabaseBrowserClient> | null = null;
const registry = new Map<string, Entry>();

function client() {
  sb ??= createSupabaseBrowserClient();
  return sb;
}

function acquire(postId: string): Entry {
  const topic = `post-${postId}`;
  let entry = registry.get(topic);
  if (entry) {
    window.clearTimeout(entry.teardown);
    return entry;
  }
  const ch = client().channel(topic);
  const subs = new Set<PostLiveHandlers>();
  ch.on('broadcast', { event: 'felt' }, ({ payload }) => {
    const delta = typeof payload?.delta === 'number' ? Math.sign(payload.delta) : 1;
    for (const s of subs) s.onFelt?.({ delta });
  });
  ch.on('broadcast', { event: 'comment' }, ({ payload }) => {
    if (!payload?.id || typeof payload.body !== 'string') return;
    for (const s of subs) s.onComment?.(payload as PostComment);
  });
  const ready = new Promise<void>((resolve) => {
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') resolve();
    });
  });
  entry = { ch, subs, ready, teardown: 0 };
  registry.set(topic, entry);
  return entry;
}

function release(postId: string, handlers?: PostLiveHandlers) {
  const topic = `post-${postId}`;
  const entry = registry.get(topic);
  if (!entry) return;
  if (handlers) entry.subs.delete(handlers);
  if (entry.subs.size > 0) return;
  // linger briefly — card swaps and sheet opens re-acquire the same channel
  window.clearTimeout(entry.teardown);
  entry.teardown = window.setTimeout(() => {
    if (entry.subs.size === 0) {
      registry.delete(topic);
      void client().removeChannel(entry.ch);
    }
  }, 15_000);
}

/** listen to a post's live events; returns a cleanup function */
export function subscribePostLive(postId: string, handlers: PostLiveHandlers): () => void {
  const entry = acquire(postId);
  entry.subs.add(handlers);
  return () => release(postId, handlers);
}

/** fire-and-forget broadcast to everyone watching this post (not to self) */
export function sendPostEvent(
  postId: string,
  event: 'felt' | 'comment',
  payload: { delta: number } | PostComment,
): void {
  const entry = acquire(postId);
  void entry.ready.then(() =>
    entry.ch
      .send({ type: 'broadcast', event, payload })
      .catch(() => {})
      .finally(() => release(postId)),
  );
}
