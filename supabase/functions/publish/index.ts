// publish — single moderated write path for posts AND comments.
// Flow: auth → profile status → identity → target checks (comment path) →
// rate limit → rule layer (crisis method / crisis expression / de-anon /
// blocklist) → OpenAI moderation → insert → notify → moderation_log.

import { preflight, json, errorJson } from '../_shared/cors.ts';
import { serviceClient, getCaller } from '../_shared/supa.ts';
import {
  POST_MAX_CHARS, COMMENT_MAX_CHARS, MOOD_KEYS,
  CRISIS_EXPRESSION_RX, CRISIS_METHOD_RX,
  DEANON_RULES, deanonHits, slurHits, topicFor, MESSAGES,
} from '../_shared/rules.ts';
import { callOpenAIModeration, moderationBlocks } from '../_shared/moderation.ts';
import { checkRateLimit, limitFor } from '../_shared/ratelimit.ts';

interface PublishRequest {
  kind: 'post' | 'comment';
  mode: 'personal' | 'professional';
  body: string;
  mood?: string | null;
  comments_enabled?: boolean;
  post_id?: string;
  parent_id?: string | null;
  acknowledged_crisis?: boolean;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const caller = await getCaller(req);
    if (!caller) return errorJson('not signed in', 401);

    const input = (await req.json()) as PublishRequest;
    const kind = input.kind;
    const mode = input.mode;
    const body = (input.body ?? '').trim();

    // ── shape validation ────────────────────────────────────────────────
    if (kind !== 'post' && kind !== 'comment') return errorJson('bad kind', 400);
    if (mode !== 'personal' && mode !== 'professional') return errorJson('bad mode', 400);
    const maxChars = kind === 'post' ? POST_MAX_CHARS : COMMENT_MAX_CHARS;
    if (!body || body.length > maxChars) {
      return errorJson(`body must be 1–${maxChars} characters`, 400);
    }
    const mood = input.mood ?? null;
    if (mood !== null && !MOOD_KEYS.includes(mood)) return errorJson('bad mood', 400);
    if (kind === 'comment' && !input.post_id) return errorJson('post_id required', 400);

    const supa = serviceClient();

    // ── account status ──────────────────────────────────────────────────
    const { data: profile, error: profErr } = await supa
      .from('profiles')
      .select('status, created_at')
      .eq('user_id', caller.id)
      .maybeSingle();
    if (profErr) throw profErr;
    if (!profile) return errorJson('finish setting up your space first', 403);
    if (profile.status === 'banned') {
      return json({ verdict: 'blocked', message: MESSAGES.banned });
    }
    // shadow: accept the write but keep it hidden — the author can't tell.
    const insertStatus = profile.status === 'shadow' ? 'hidden' : 'live';

    // ── identity ownership ──────────────────────────────────────────────
    const { data: identity, error: idErr } = await supa
      .from('identities')
      .select('role_title')
      .eq('user_id', caller.id)
      .eq('mode', mode)
      .maybeSingle();
    if (idErr) throw idErr;
    if (!identity) return errorJson('no identity for this mode yet', 403);

    // ── comment path: target checks ─────────────────────────────────────
    let post: {
      id: string; author_id: string; mode: string; body: string;
      status: string; comments_enabled: boolean; comment_count: number;
    } | null = null;

    if (kind === 'comment') {
      const { data: p, error: postErr } = await supa
        .from('posts')
        .select('id, author_id, mode, body, status, comments_enabled, comment_count')
        .eq('id', input.post_id!)
        .maybeSingle();
      if (postErr) throw postErr;
      if (!p || p.status !== 'live') return errorJson('this one is gone', 404);
      if (!p.comments_enabled) return errorJson('comments are off for this one', 403);
      if (p.mode !== mode) return errorJson('mode mismatch', 400);
      post = p;

      if (input.parent_id) {
        const { data: parent, error: parErr } = await supa
          .from('comments')
          .select('id, post_id, parent_id, status')
          .eq('id', input.parent_id)
          .maybeSingle();
        if (parErr) throw parErr;
        if (!parent || parent.status !== 'live' || parent.post_id !== p.id) {
          return errorJson('bad parent comment', 400);
        }
        // 1-level threading only: replies to replies are not allowed.
        if (parent.parent_id !== null) return errorJson('replies go one level deep', 400);
      }
    }

    // ── rate limit ──────────────────────────────────────────────────────
    const max = limitFor(kind, profile.created_at);
    const allowed = await checkRateLimit(supa, caller.id, kind, max, 60);
    if (!allowed) {
      await logModeration(supa, kind, null, 'rate-limited', {}, ['rate-limit']);
      return json({ verdict: 'blocked', message: MESSAGES.rateLimited });
    }

    // ── rule layer ──────────────────────────────────────────────────────
    const ruleHits: string[] = [];

    if (CRISIS_METHOD_RX.test(body)) {
      await logModeration(supa, kind, null, 'blocked', {}, ['crisis:method']);
      return json({ verdict: 'blocked', message: MESSAGES.crisisMethod });
    }

    if (CRISIS_EXPRESSION_RX.test(body)) {
      if (!input.acknowledged_crisis) {
        await logModeration(supa, kind, null, 'crisis', {}, ['crisis:expression']);
        return json({ verdict: 'crisis' });
      }
      ruleHits.push('crisis:expression:acknowledged');
    }

    const deanon = deanonHits(body, DEANON_RULES);
    if (deanon.length > 0) {
      await logModeration(supa, kind, null, 'blocked', {}, deanon);
      return json({ verdict: 'blocked', message: MESSAGES.deanon });
    }

    const slurs = slurHits(body);
    if (slurs.length > 0) {
      await logModeration(supa, kind, null, 'blocked', {}, slurs);
      return json({ verdict: 'blocked', message: MESSAGES.harassment });
    }

    // ── OpenAI moderation ───────────────────────────────────────────────
    const mod = await callOpenAIModeration(body);
    if (mod.skipped) ruleHits.push('no-moderation-key');
    const overThreshold = moderationBlocks(mod, kind);
    if (overThreshold.length > 0) {
      await logModeration(supa, kind, null, 'blocked', mod.scores, overThreshold);
      return json({ verdict: 'blocked', message: MESSAGES.harassment });
    }

    // ── insert ──────────────────────────────────────────────────────────
    let newId: string;

    if (kind === 'post') {
      const { data: inserted, error: insErr } = await supa
        .from('posts')
        .insert({
          author_id: caller.id,
          mode,
          body,
          mood,
          topic: topicFor(body),
          comments_enabled: input.comments_enabled ?? true,
          status: insertStatus,
        })
        .select('id')
        .single();
      if (insErr) throw insErr;
      newId = inserted.id;
    } else {
      const { data: inserted, error: insErr } = await supa
        .from('comments')
        .insert({
          post_id: post!.id,
          author_id: caller.id,
          body,
          parent_id: input.parent_id ?? null,
          status: insertStatus,
        })
        .select('id')
        .single();
      if (insErr) throw insErr;
      newId = inserted.id;

      if (insertStatus === 'live') {
        const { error: bumpErr } = await supa.rpc('bump_post_count', {
          p_post_id: post!.id, p_kind: 'comment', p_delta: 1,
        });
        if (bumpErr) throw bumpErr;

        // immediate notification for the post author (never self)
        if (post!.author_id !== caller.id) {
          const { error: notifErr } = await supa.from('notifications').insert({
            user_id: post!.author_id,
            mode,
            type: 'comment',
            payload: {
              post_id: post!.id,
              snippet: post!.body.slice(0, 60),
              comment_role: identity.role_title,
              comment_body: body,
            },
          });
          if (notifErr) throw notifErr;
        }
      }
    }

    await logModeration(supa, kind, newId, 'published', mod.scores, ruleHits);
    return json({ verdict: 'published', id: newId });
  } catch (err) {
    console.error('[publish]', err);
    return errorJson('something went wrong — your words are safe, try again', 500);
  }
});

async function logModeration(
  supa: ReturnType<typeof serviceClient>,
  targetType: 'post' | 'comment',
  targetId: string | null,
  verdict: string,
  scores: Record<string, number>,
  ruleHits: string[],
): Promise<void> {
  const { error } = await supa.from('moderation_log').insert({
    target_type: targetType,
    target_id: targetId,
    verdict,
    scores,
    rule_hits: ruleHits,
  });
  if (error) console.error('[publish] moderation_log insert failed', error);
}
