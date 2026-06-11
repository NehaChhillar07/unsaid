// mute — "mute this voice". The client sends a post_id/comment_id; the
// author is resolved SERVER-SIDE and never returned. Feed/comment views
// exclude muted authors. Self-mutes and duplicates are silently ignored.

import { preflight, json, errorJson } from '../_shared/cors.ts';
import { serviceClient, getCaller } from '../_shared/supa.ts';

interface MuteRequest {
  target_type: 'post' | 'comment';
  target_id: string;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const caller = await getCaller(req);
    if (!caller) return errorJson('not signed in', 401);

    const input = (await req.json()) as MuteRequest;
    if (input.target_type !== 'post' && input.target_type !== 'comment') {
      return errorJson('bad target_type', 400);
    }
    if (!input.target_id) return errorJson('target_id required', 400);

    const supa = serviceClient();
    const table = input.target_type === 'post' ? 'posts' : 'comments';

    const { data: target, error: tErr } = await supa
      .from(table)
      .select('author_id')
      .eq('id', input.target_id)
      .maybeSingle();
    if (tErr) throw tErr;
    if (!target) return errorJson('this one is gone', 404);

    // ignore self-mute; duplicates are no-ops
    if (target.author_id !== caller.id) {
      const { error: muteErr } = await supa.from('mutes').upsert(
        { muter_id: caller.id, muted_author_id: target.author_id },
        { onConflict: 'muter_id,muted_author_id', ignoreDuplicates: true },
      );
      if (muteErr) throw muteErr;
    }

    // NEVER return the author id.
    return json({ ok: true });
  } catch (err) {
    console.error('[mute]', err);
    return errorJson('something went wrong, try again', 500);
  }
});
