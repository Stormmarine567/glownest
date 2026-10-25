import 'server-only';
import { assertAdmin, assertSuperAdmin } from '@/lib/auth';
import type { ActionState } from '@/lib/action-types';
import type { Permission, Profile } from '@/lib/types';

export const ok = (message: string): ActionState => ({ ok: true, message });
export const fail = (message: string): ActionState => ({ ok: false, message });

type Session = { userId: string; profile: Profile };

/** Authorises (server-side, every call), runs the action and converts thrown errors into form feedback. */
export async function run(permission: Permission | 'super' | undefined, fn: (s: Session) => Promise<ActionState>): Promise<ActionState> {
  try {
    const s = permission === 'super' ? await assertSuperAdmin() : await assertAdmin(permission);
    return await fn(s);
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e && String((e as { digest: unknown }).digest).startsWith('NEXT_REDIRECT')) throw e;
    return fail(e instanceof Error ? e.message : 'Something went wrong.');
  }
}

export const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
export const optStr = (fd: FormData, k: string) => str(fd, k) || null;
export const bool = (fd: FormData, k: string) => fd.get(k) === 'on' || fd.get(k) === 'true';
export const int = (fd: FormData, k: string, d = 0) => { const n = parseInt(str(fd, k), 10); return Number.isFinite(n) ? n : d; };
export const cents = (fd: FormData, k: string): number | null => { const v = str(fd, k); if (!v) return null; const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null; };
export const csv = (fd: FormData, k: string) => str(fd, k).split(',').map((s) => s.trim()).filter(Boolean);
export const checks = (fd: FormData, k: string) => fd.getAll(k).map(String);
export const json = <T,>(fd: FormData, k: string, d: T): T => { try { return JSON.parse(str(fd, k)) as T; } catch { return d; } };
