// wipe-account — "gone means gone". Hard-deletes every row the caller owns,
// attempts Sign in with Apple token revocation (App Review 5.1.1(v)), then
// deletes the auth user. FK ON DELETE CASCADE covers most rows; explicit
// deletes are belt-and-braces and make the order deterministic.

import { preflight, json, errorJson } from '../_shared/cors.ts';
import { serviceClient, getCaller } from '../_shared/supa.ts';

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const caller = await getCaller(req);
    if (!caller) return errorJson('not signed in', 401);

    const supa = serviceClient();
    const uid = caller.id;

    // Posts first: cascades this user's posts' reactions/comments/saves/seen.
    const deletions: Array<[string, string]> = [
      ['posts', 'author_id'],
      ['comments', 'author_id'],
      ['reactions', 'user_id'],
      ['seen', 'user_id'],
      ['saves', 'user_id'],
      ['drafts', 'user_id'],
      ['reports', 'reporter_id'],
      ['notifications', 'user_id'],
      ['push_tokens', 'user_id'],
      ['rate_limits', 'user_id'],
      ['mutes', 'muter_id'],
      ['mutes', 'muted_author_id'],
      ['identities', 'user_id'],
      ['profiles', 'user_id'],
    ];
    for (const [table, column] of deletions) {
      const { error } = await supa.from(table).delete().eq(column, uid);
      if (error) throw error;
    }

    // ── Apple token revocation (App Review guideline 5.1.1(v)) ──────────
    // TODO(Phase E): once the Apple provider is configured, exchange the
    // stored provider refresh token for an access token and POST it to
    // https://appleid.apple.com/auth/revoke with client_id + client_secret
    // (signed ES256 JWT). Wrapped in try/catch so deletion never fails on it.
    try {
      const appleIdentity = caller.identities?.find((i) => i.provider === 'apple');
      if (appleIdentity) {
        console.warn(
          '[wipe-account] apple identity present but revocation is not wired yet (Phase E)',
        );
      }
    } catch (revokeErr) {
      console.error('[wipe-account] apple revocation attempt failed', revokeErr);
    }

    const { error: delUserErr } = await supa.auth.admin.deleteUser(uid);
    if (delUserErr) throw delUserErr;

    return json({ ok: true });
  } catch (err) {
    console.error('[wipe-account]', err);
    return errorJson('something went wrong, try again', 500);
  }
});
