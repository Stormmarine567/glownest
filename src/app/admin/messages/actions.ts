'use server';
import { revalidatePath } from 'next/cache';
import type { ActionState } from '@/lib/action-types';
import { bool, fail, ok, run, str } from '@/lib/admin-action';
import { createClient } from '@/lib/supabase/server';

export async function setHandledAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run('customers', async () => {
    const { error } = await (await createClient()).from('contact_messages').update({ handled: bool(fd, 'handled') }).eq('id', str(fd, 'id'));
    if (error) return fail(error.message);
    revalidatePath('/admin/messages');
    return ok('Updated.');
  });
}
