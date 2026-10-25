import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { clientIp } from '@/lib/rate-limit';
import type { Profile } from '@/lib/types';

/** For server-side actions done with the service role (admin management, gateway secrets, refunds). */
export async function logAudit(
  actor: Pick<Profile, 'id' | 'email' | 'role'> | null,
  action: string,
  entity: string,
  entityId?: string,
  details?: { before?: unknown; after?: unknown },
) {
  try {
    await createAdminClient().from('audit_logs').insert({
      actor_id: actor?.id ?? null,
      actor_email: actor?.email ?? null,
      actor_role: actor?.role ?? null,
      action, entity, entity_id: entityId ?? null,
      before: details?.before ?? null,
      after: details?.after ?? null,
      ip: await clientIp(),
    });
  } catch (e) {
    console.error('audit log failed', e);
  }
}
