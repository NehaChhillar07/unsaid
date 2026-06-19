// If a role-title write was rejected by the server-side guard trigger, surface
// the DB's specific, on-brand reason instead of a generic "try again" — so the
// user fixes the title rather than looping on the same blocked input.
export function roleGuardMessage(err: unknown): string | null {
  const m = (err as { message?: string } | null)?.message;
  return m && /role title/i.test(m) ? m.toLowerCase() : null;
}
