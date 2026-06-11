// notify-batch — Phase E scaffold (INERT until PUSH_ENABLED === 'true').
// Sends Expo pushes for unread notifications + an opt-in daily nudge.
// Invoked by pg_cron via net.http_post with the service-role key.
//
// pg_cron schedule (run in SQL editor once Phase E is live):
//
//   create extension if not exists pg_cron with schema extensions;
//   select cron.schedule(
//     'notify-batch-every-5min',
//     '*/5 * * * *',
//     $$ select net.http_post(
//          url := 'https://<project-ref>.supabase.co/functions/v1/notify-batch',
//          headers := jsonb_build_object(
//            'Authorization', 'Bearer ' || '<service-role-key>',
//            'Content-Type', 'application/json'),
//          body := '{}'::jsonb
//        ) $$
//   );

import { preflight, json, errorJson } from '../_shared/cors.ts';
import { serviceClient } from '../_shared/supa.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

interface ExpoPushMessage {
  to: string;
  sound: 'default';
  title: string;
  body: string;
  data: Record<string, unknown>;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  // Inert until Phase E: APNs key + expo-notifications are configured.
  if (Deno.env.get('PUSH_ENABLED') !== 'true') {
    return json({ ok: true, skipped: 'PUSH_ENABLED is not true' });
  }

  try {
    const supa = serviceClient();
    const messages: ExpoPushMessage[] = [];

    // ── unread notifications → pushes ───────────────────────────────────
    const { data: notifs, error: nErr } = await supa
      .from('notifications')
      .select('id, user_id, mode, type, payload')
      .eq('read', false)
      .order('created_at', { ascending: true })
      .limit(500);
    if (nErr) throw nErr;

    const userIds = [...new Set((notifs ?? []).map((n) => n.user_id))];
    const { data: tokens, error: tErr } = await supa
      .from('push_tokens')
      .select('user_id, expo_token')
      .in('user_id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000']);
    if (tErr) throw tErr;

    const tokensByUser = new Map<string, string[]>();
    for (const t of tokens ?? []) {
      const list = tokensByUser.get(t.user_id) ?? [];
      list.push(t.expo_token);
      tokensByUser.set(t.user_id, list);
    }

    for (const n of notifs ?? []) {
      const body =
        n.type === 'comment'
          ? 'someone left you a kind word'
          : n.type === 'milestone'
            ? `${n.payload?.count ?? ''} people felt this 🤍`
            : `${n.payload?.count ?? ''} people said "same"`;
      for (const token of tokensByUser.get(n.user_id) ?? []) {
        messages.push({
          to: token,
          sound: 'default',
          title: 'unsaid',
          body,
          data: { type: n.type, post_id: n.payload?.post_id ?? null, mode: n.mode },
        });
      }
    }

    // ── optional daily nudge (opt-in, off by default) ───────────────────
    // Sent only when invoked with {"daily_nudge": true} (separate cron at a
    // fixed local-evening hour, e.g. '30 13 * * *' UTC = 7pm IST).
    let nudge = false;
    try {
      const reqBody = await req.json();
      nudge = reqBody?.daily_nudge === true;
    } catch (_) { /* empty body is fine */ }

    if (nudge) {
      const { data: nudgers, error: pErr } = await supa
        .from('profiles')
        .select('user_id')
        .eq('daily_nudge', true)
        .eq('status', 'active');
      if (pErr) throw pErr;

      const nudgeIds = (nudgers ?? []).map((p) => p.user_id);
      if (nudgeIds.length > 0) {
        const { data: nudgeTokens, error: ntErr } = await supa
          .from('push_tokens')
          .select('expo_token')
          .in('user_id', nudgeIds);
        if (ntErr) throw ntErr;
        for (const t of nudgeTokens ?? []) {
          messages.push({
            to: t.expo_token,
            sound: 'default',
            title: 'unsaid',
            body: 'anything you didn’t get to say today? 🤍',
            data: { type: 'nudge' },
          });
        }
      }
    }

    // ── send in batches of 100 ──────────────────────────────────────────
    let sent = 0;
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      });
      if (!res.ok) {
        console.error('[notify-batch] expo push error', res.status, await res.text());
        continue;
      }
      sent += batch.length;
    }

    return json({ ok: true, sent, notifications: notifs?.length ?? 0 });
  } catch (err) {
    console.error('[notify-batch]', err);
    return errorJson('notify-batch failed', 500);
  }
});
