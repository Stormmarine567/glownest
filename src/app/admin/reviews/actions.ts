'use server';
import { revalidatePath } from 'next/cache';
import type { ActionState } from '@/lib/action-types';
import { fail, ok, run, str } from '@/lib/admin-action';
import { createClient } from '@/lib/supabase/server';

export async function moderateReviewAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run('reviews', async () => {
    const status = str(fd, 'status');
    if (!['approved', 'rejected', 'pending'].includes(status)) return fail('Invalid status.');
    const { error } = await (await createClient()).from('reviews').update({ status }).eq('id', str(fd, 'id'));
    if (error) return fail(error.message);
    revalidatePath('/admin/reviews'); revalidatePath('/shop');
    return ok(`Review ${status}.`);
  });
}
export async function deleteReviewAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run('reviews', async () => {
    const { error } = await (await createClient()).from('reviews').delete().eq('id', str(fd, 'id'));
    if (error) return fail(error.message);
    revalidatePath('/admin/reviews');
    return ok('Review deleted (recorded in the audit log).');
  });
}
