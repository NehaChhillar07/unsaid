// report — file a report against a post or comment.
// ≥3 open reports auto-hides the target (admin reviews from the queue).
// Optional mute_author flag mutes the target's author in the same call.

import { preflight, json, errorJson } from '../_shared/cors.ts';
import { serviceClient, getCaller } from '../_shared/supa.ts';

const REASONS = ['harassment', 'doxxing', 'self-harm', 'spam', 'other'];
const AUTO_HIDE_THRESHOLD = 3;

interface ReportRequest {
  target_type: 'post' | 'comment';
  target_id: string;
  reason: string;
  mute_author?: boolean;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const caller = await getCaller(req);
    if (!caller) return errorJson('not signed in', 401);

    const input = (await req.json()) as ReportRequest;
    if (input.target_type !== 'post' && input.target_type !== 'comment') {
      return errorJson('bad target_type', 400);
    }
    if (!input.target_id) return errorJson('target_id required', 400);
    if (!REASONS.includes(input.reason)) return errorJson('bad reason', 400);

    const supa = serviceClient();
    const table = input.target_type === 'post' ? 'posts' : 'comments';

    const { data: target, error: tErr } = await supa
      .from(table)
      .select('id, author_id, status')
      .eq('id', input.target_id)
      .maybeSingle();
    if (tErr) throw tErr;
    if (!target) return errorJson('this one is gone', 404);

    const { error: repErr } = await supa.from('reports').insert({
      target_type: input.target_type,
      target_id: input.target_id,
      reporter_id: caller.id,
      reason: input.reason,
    });
    if (repErr) throw repErr;

    // auto-hide at threshold
    const { count, error: cntErr } = await supa
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('target_type', input.target_type)
      .eq('target_id', input.target_id)
      .eq('state', 'open');
    if (cntErr) throw cntErr;

    if ((count ?? 0) >= AUTO_HIDE_THRESHOLD && target.status === 'live') {
      const { error: hideErr } = await supa
        .from(table)
        .update({ status: 'hidden' })
        .eq('id', input.target_id);
      if (hideErr) throw hideErr;

      const { error: logErr } = await supa.from('moderation_log').insert({
        target_type: input.target_type,
        target_id: input.target_id,
        verdict: 'auto-hidden',
        scores: {},
        rule_hits: [`reports:${count}`],
      });
      if (logErr) console.error('[report] moderation_log insert failed', logErr);
    }

    // optional mute in the same call (never self, never exposed)
    if (input.mute_author && target.author_id !== caller.id) {
      const { error: muteErr } = await supa.from('mutes').upsert(
        { muter_id: caller.id, muted_author_id: target.author_id },
        { onConflict: 'muter_id,muted_author_id', ignoreDuplicates: true },
      );
      if (muteErr) throw muteErr;
    }

    return json({ ok: true });
  } catch (err) {
    console.error('[report]', err);
    return errorJson('something went wrong, try again', 500);
  }
});
