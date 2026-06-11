// admin gate: requires a supabase session whose email is in the admins table.
// anything else 404s — the admin area should not even appear to exist.
import 'server-only';
import { createHash } from 'node:crypto';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from './supabase/server';
import { createServiceClient } from './supabase/service';

export async function requireAdmin(): Promise<{ email: string }> {
  let email: string | undefined;
  try {
    const sb = await createSupabaseServerClient();
    const { data } = await sb.auth.getUser();
    email = data.user?.email?.toLowerCase();
  } catch {
    notFound();
  }
  if (!email) notFound();

  const svc = createServiceClient();
  const { data: row, error } = await svc.from('admins').select('email').eq('email', email).maybeSingle();
  if (error || !row) notFound();
  return { email };
}

/** stable non-reversible label for an author — author ids are never rendered */
export function authorTag(authorId: string): string {
  return `author #${createHash('sha256').update(authorId).digest('hex').slice(0, 4)}`;
}
