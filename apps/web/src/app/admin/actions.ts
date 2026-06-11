'use server';

// admin server actions — service-role writes. every action re-verifies the
// admin gate; admin ops intentionally bypass edge functions per the plan.
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/service';

export type TargetType = 'post' | 'comment';

function tableOf(targetType: TargetType): 'posts' | 'comments' {
  return targetType === 'post' ? 'posts' : 'comments';
}

async function resolveAuthorId(targetType: TargetType, targetId: string): Promise<string | null> {
  const svc = createServiceClient();
  const { data } = await svc.from(tableOf(targetType)).select('author_id').eq('id', targetId).maybeSingle();
  return (data as { author_id: string } | null)?.author_id ?? null;
}

/** dismiss all open reports on a target */
export async function dismissReports(targetType: TargetType, targetId: string): Promise<void> {
  await requireAdmin();
  const svc = createServiceClient();
  await svc
    .from('reports')
    .update({ state: 'dismissed' })
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .eq('state', 'open');
  revalidatePath('/admin');
}

/** remove content (status='removed') and mark its open reports reviewed */
export async function removeContent(targetType: TargetType, targetId: string): Promise<void> {
  await requireAdmin();
  const svc = createServiceClient();
  await svc.from(tableOf(targetType)).update({ status: 'removed' }).eq('id', targetId);
  await svc
    .from('reports')
    .update({ state: 'reviewed' })
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .eq('state', 'open');
  revalidatePath('/admin');
}

/** put auto-hidden (or removed-in-error) content back live */
export async function unhideContent(targetType: TargetType, targetId: string): Promise<void> {
  await requireAdmin();
  const svc = createServiceClient();
  await svc.from(tableOf(targetType)).update({ status: 'live' }).eq('id', targetId);
  revalidatePath('/admin');
}

/** shadow the author — their writes stay visible only to them */
export async function shadowAuthor(targetType: TargetType, targetId: string): Promise<void> {
  await requireAdmin();
  const authorId = await resolveAuthorId(targetType, targetId);
  if (authorId) {
    const svc = createServiceClient();
    await svc.from('profiles').update({ status: 'shadow' }).eq('user_id', authorId);
  }
  revalidatePath('/admin');
}

/** ban the author — writes rejected everywhere */
export async function banAuthor(targetType: TargetType, targetId: string): Promise<void> {
  await requireAdmin();
  const authorId = await resolveAuthorId(targetType, targetId);
  if (authorId) {
    const svc = createServiceClient();
    await svc.from('profiles').update({ status: 'banned' }).eq('user_id', authorId);
  }
  revalidatePath('/admin');
}
