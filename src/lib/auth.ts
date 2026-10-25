import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Permission, Profile } from '@/lib/types';

export const getSessionProfile = cache(async (): Promise<{ userId: string; profile: Profile } | null> => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser(); // validates the JWT with Supabase Auth
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile || !profile.is_active) return null;
  return { userId: user.id, profile: profile as Profile };
});

export async function requireUser(next = '/dashboard') {
  const s = await getSessionProfile();
  if (!s) redirect(`/login?next=${encodeURIComponent(next)}`);
  return s;
}

export function can(profile: Profile, permission?: Permission) {
  if (profile.role === 'super_admin') return true;
  if (profile.role !== 'admin') return false;
  return !permission || profile.permissions.includes(permission);
}

/** Server-side gate for admin pages. Redirects instead of rendering. */
export async function requireAdmin(permission?: Permission) {
  const s = await requireUser('/admin');
  if (!can(s.profile, permission)) redirect(s.profile.role === 'customer' ? '/dashboard' : '/admin?denied=1');
  return s;
}

export async function requireSuperAdmin() {
  const s = await requireUser('/admin');
  if (s.profile.role !== 'super_admin') redirect(s.profile.role === 'customer' ? '/dashboard' : '/admin?denied=1');
  return s;
}

/** For server actions / route handlers: throws instead of redirecting. */
export async function assertAdmin(permission?: Permission) {
  const s = await getSessionProfile();
  if (!s || !can(s.profile, permission)) throw new Error('Not authorized');
  return s;
}

export async function assertSuperAdmin() {
  const s = await getSessionProfile();
  if (!s || s.profile.role !== 'super_admin') throw new Error('Not authorized');
  return s;
}
