import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Service-role client. BYPASSES RLS. Import only from server code that has already
 * authorized the caller (see lib/auth.ts). Never import from a client component.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
