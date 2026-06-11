// role-check — onboarding de-anon guard for role titles.
// Returns {ok:true} or {ok:false, warning} with the prototype's exact copy.

import { preflight, json, errorJson } from '../_shared/cors.ts';
import { getCaller } from '../_shared/supa.ts';
import { deanonHits, ROLE_DEANON_RULES, MESSAGES } from '../_shared/rules.ts';

interface RoleCheckRequest {
  role_title: string;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const caller = await getCaller(req);
    if (!caller) return errorJson('not signed in', 401);

    const input = (await req.json()) as RoleCheckRequest;
    const title = (input.role_title ?? '').trim();
    if (!title) return json({ ok: true });
    if (title.length > 60) {
      return json({ ok: false, warning: 'a little shorter — titles read best small 🤍' });
    }

    const hits = deanonHits(title, ROLE_DEANON_RULES);
    if (hits.length > 0) {
      return json({ ok: false, warning: MESSAGES.roleWarning });
    }
    return json({ ok: true });
  } catch (err) {
    console.error('[role-check]', err);
    return errorJson('something went wrong, try again', 500);
  }
});
