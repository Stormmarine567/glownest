'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionState } from '@/lib/action-types';
import { bool, checks, fail, ok, run, str } from '@/lib/admin-action';
import { logAudit } from '@/lib/audit';
import { siteUrl } from '@/lib/email/send';
import { createAdminClient } from '@/lib/supabase/admin';
import { ALL_PERMISSIONS, type Permission } from '@/lib/types';

const VALID = new Set<string>(ALL_PERMISSIONS.map((p) => p.id));
const perms = (fd: FormData) => checks(fd, 'permissions').filter((p) => VALID.has(p)) as Permission[];
const done = () => revalidatePath('/admin/admins');

/** Admins are always created here, server-side, by a Super Admin. This path can only ever grant the "admin" role — never "super_admin". */
export async function inviteAdminAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run('super', async ({ profile }) => {
    const email = z.string().trim().toLowerCase().email().safeParse(str(fd, 'email'));
    if (!email.success) return fail('Enter a valid email address.');
    const permissions = perms(fd);
    const db = createAdminClient();
    const { data: existing } = await db.from('profiles').select('id,role,email').eq('email', email.data).maybeSingle();
    let id = existing?.id as string | undefined;
    if (existing && existing.role !== 'customer') return fail('This person is already a member of staff.');
    if (!existing) {
      const { data, error } = await db.auth.admin.inviteUserByEmail(email.data, { data: { full_name: str(fd, 'full_name') || undefined }, redirectTo: `${siteUrl()}/auth/callback?next=/reset-password` });
      if (error || !data.user) return fail(error?.message ?? 'Could not send the invitation.');
      id = data.user.id;
    }
    const { error } = await db.from('profiles').update({ role: 'admin', permissions, is_active: true, ...(str(fd, 'full_name') ? { full_name: str(fd, 'full_name') } : {}) }).eq('id', id!).eq('role', 'customer');
    if (error) return fail(error.message);
    await logAudit(profile, 'admin.create', 'profiles', id, { after: { email: email.data, role: 'admin', permissions, promoted_existing: Boolean(existing) } });
    done();
    return ok(existing ? 'Existing customer promoted to admin.' : 'Invitation sent. They set their password from the email link.');
  });
}

async function target(id: string, selfId: string) {
  if (id === selfId) throw new Error('You cannot change your own access here.');
  const { data } = await createAdminClient().from('profiles').select('id,email,role,permissions,is_active').eq('id', id).single();
  if (!data || data.role !== 'admin') throw new Error('Only regular admins can be changed here.');
  return data;
}

export async function updateAdminAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run('super', async ({ profile, userId }) => {
    const t = await target(str(fd, 'id'), userId);
    const permissions = perms(fd); const active = bool(fd, 'is_active');
    const { error } = await createAdminClient().from('profiles').update({ permissions, is_active: active }).eq('id', t.id);
    if (error) return fail(error.message);
    await logAudit(profile, 'admin.update', 'profiles', t.id, { before: { permissions: t.permissions, is_active: t.is_active }, after: { permissions, is_active: active, email: t.email } });
    done();
    return ok('Admin updated.');
  });
}

export async function removeAdminAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run('super', async ({ profile, userId }) => {
    const t = await target(str(fd, 'id'), userId);
    const { error } = await createAdminClient().from('profiles').update({ role: 'customer', permissions: [] }).eq('id', t.id);
    if (error) return fail(error.message);
    await logAudit(profile, 'admin.remove', 'profiles', t.id, { before: { role: 'admin', permissions: t.permissions, email: t.email }, after: { role: 'customer' } });
    done();
    return ok('Admin access removed. They keep a normal customer account.');
  });
}
