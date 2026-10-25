import 'server-only';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
}

/** Returns true if the call is allowed. Fails open if the limiter itself errors (never blocks real customers on an outage). */
export async function rateLimit(bucket: string, max: number, windowSeconds: number, id?: string): Promise<boolean> {
  try {
    const key = `${bucket}:${id ?? (await clientIp())}`;
    const { data, error } = await createAdminClient().rpc('check_rate_limit', {
      p_key: key, p_max: max, p_window_seconds: windowSeconds,
    });
    if (error) return true;
    return data === true;
  } catch {
    return true;
  }
}
