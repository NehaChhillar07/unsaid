// _shared/ratelimit.ts — fixed-window rate limiting over the rate_limits table.

import type { SupabaseClient } from '@supabase/supabase-js';

const NEW_ACCOUNT_DAYS = 7;

/** Per-hour caps: new accounts (<7 days) are throttled harder. */
export function limitFor(action: 'post' | 'comment', profileCreatedAt: string): number {
  const ageMs = Date.now() - new Date(profileCreatedAt).getTime();
  const isNew = ageMs < NEW_ACCOUNT_DAYS * 24 * 60 * 60 * 1000;
  if (action === 'post') return isNew ? 5 : 15;
  return isNew ? 20 : 60;
}

/**
 * Returns true if the action is allowed (and counts it), false if the
 * caller is over the limit for the current window.
 */
export async function checkRateLimit(
  supa: SupabaseClient,
  userId: string,
  action: 'post' | 'comment',
  max: number,
  windowMinutes = 60,
): Promise<boolean> {
  const windowMs = windowMinutes * 60 * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs).toISOString();

  const { data: row, error } = await supa
    .from('rate_limits')
    .select('count')
    .eq('user_id', userId)
    .eq('action', action)
    .eq('window_start', windowStart)
    .maybeSingle();
  if (error) throw error;

  if (!row) {
    const { error: insErr } = await supa
      .from('rate_limits')
      .upsert(
        { user_id: userId, action, window_start: windowStart, count: 1 },
        { onConflict: 'user_id,action,window_start' },
      );
    if (insErr) throw insErr;
    return true;
  }

  if (row.count >= max) return false;

  const { error: updErr } = await supa
    .from('rate_limits')
    .update({ count: row.count + 1 })
    .eq('user_id', userId)
    .eq('action', action)
    .eq('window_start', windowStart);
  if (updErr) throw updErr;
  return true;
}
