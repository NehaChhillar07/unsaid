// react — toggle a felt/same reaction on a post.
// One reaction per (post, user): sending the same type again toggles it off;
// sending the other type switches it. Milestone ('felt') and 'same'
// notifications are BATCHED: an unread notification for the same post is
// updated in place instead of inserting a new row. Never notifies self.

import { preflight, json, errorJson } from '../_shared/cors.ts';
import { serviceClient, getCaller } from '../_shared/supa.ts';
import { FELT_MILESTONES } from '../_shared/rules.ts';

interface ReactRequest {
  post_id: string;
  type: 'felt' | 'same';
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const caller = await getCaller(req);
    if (!caller) return errorJson('not signed in', 401);

    const input = (await req.json()) as ReactRequest;
    if (!input.post_id) return errorJson('post_id required', 400);
    if (input.type !== 'felt' && input.type !== 'same') return errorJson('bad type', 400);

    const supa = serviceClient();

    const { data: post, error: postErr } = await supa
      .from('posts')
      .select('id, author_id, mode, body, status')
      .eq('id', input.post_id)
      .maybeSingle();
    if (postErr) throw postErr;
    if (!post || post.status !== 'live') return errorJson('this one is gone', 404);

    const { data: existing, error: exErr } = await supa
      .from('reactions')
      .select('type')
      .eq('post_id', post.id)
      .eq('user_id', caller.id)
      .maybeSingle();
    if (exErr) throw exErr;

    // ── toggle off ──────────────────────────────────────────────────────
    if (existing && existing.type === input.type) {
      const { error: delErr } = await supa
        .from('reactions')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', caller.id);
      if (delErr) throw delErr;
      const { error: bumpErr } = await supa.rpc('bump_post_count', {
        p_post_id: post.id, p_kind: input.type, p_delta: -1,
      });
      if (bumpErr) throw bumpErr;
      return json({ active: false });
    }

    // ── switch type ─────────────────────────────────────────────────────
    if (existing) {
      const { error: updErr } = await supa
        .from('reactions')
        .update({ type: input.type })
        .eq('post_id', post.id)
        .eq('user_id', caller.id);
      if (updErr) throw updErr;
      const { error: decErr } = await supa.rpc('bump_post_count', {
        p_post_id: post.id, p_kind: existing.type, p_delta: -1,
      });
      if (decErr) throw decErr;
    } else {
      const { error: insErr } = await supa
        .from('reactions')
        .insert({ post_id: post.id, user_id: caller.id, type: input.type });
      if (insErr) throw insErr;
    }

    const { data: newCount, error: bumpErr } = await supa.rpc('bump_post_count', {
      p_post_id: post.id, p_kind: input.type, p_delta: 1,
    });
    if (bumpErr) throw bumpErr;

    // ── notifications (batched, never self) ─────────────────────────────
    if (post.author_id !== caller.id) {
      if (input.type === 'felt' && FELT_MILESTONES.includes(newCount as number)) {
        await upsertBatchedNotification(supa, post, 'milestone', newCount as number, true);
      } else if (input.type === 'same') {
        await upsertBatchedNotification(supa, post, 'same', 1, false);
      }
    }

    return json({ active: true });
  } catch (err) {
    console.error('[react]', err);
    return errorJson('something went wrong, try again', 500);
  }
});

/**
 * Batched notification: if an unread notification of this type for the same
 * post exists, update its payload.count (milestone: set to the new milestone;
 * same: increment). Otherwise insert a fresh one.
 */
async function upsertBatchedNotification(
  supa: ReturnType<typeof serviceClient>,
  post: { id: string; author_id: string; mode: string; body: string },
  type: 'milestone' | 'same',
  count: number,
  replaceCount: boolean,
): Promise<void> {
  const { data: rows, error: findErr } = await supa
    .from('notifications')
    .select('id, payload')
    .eq('user_id', post.author_id)
    .eq('type', type)
    .eq('read', false)
    .eq('payload->>post_id', post.id)
    .order('created_at', { ascending: false })
    .limit(1);
  if (findErr) throw findErr;

  const existing = rows?.[0];
  if (existing) {
    const prev = (existing.payload?.count as number) ?? 0;
    const nextCount = replaceCount ? count : prev + 1;
    const { error: updErr } = await supa
      .from('notifications')
      .update({
        payload: { ...existing.payload, count: nextCount },
        created_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    if (updErr) throw updErr;
    return;
  }

  const { error: insErr } = await supa.from('notifications').insert({
    user_id: post.author_id,
    mode: post.mode,
    type,
    payload: {
      post_id: post.id,
      snippet: post.body.slice(0, 60),
      count,
    },
  });
  if (insErr) throw insErr;
}
