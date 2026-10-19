'use server';
import { revalidatePath } from 'next/cache';
import type { ActionState } from '@/lib/action-types';
import { bool, fail, ok, run, str } from '@/lib/admin-action';
import { logAudit } from '@/lib/audit';
import { encryptSecret } from '@/lib/crypto';
import { getGateway, PROVIDERS, type Provider } from '@/lib/payments/credentials';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Only the Super Admin reaches this. Secrets are encrypted before they touch the database, are never
 * returned to any browser, and are never written to the audit log (only the fact that they changed).
 */
export async function saveGatewayAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run('super', async ({ profile }) => {
    const provider = str(fd, 'provider') as Provider;
    if (!PROVIDERS.includes(provider)) return fail('Unknown provider.');
    const secret = str(fd, 'secret'); const hook = str(fd, 'webhook_secret');
    const enable = bool(fd, 'is_enabled');
    const currency = (str(fd, 'currency') || 'NGN').toUpperCase().slice(0, 3);

    if (secret || hook) {
      if (secret && !/^[A-Za-z0-9_\-.]{12,200}$/.test(secret)) return fail('That does not look like a valid secret key.');
      const db = createAdminClient();
      const { data: cur } = await db.from('payment_gateway_secrets').select('*').eq('provider', provider).maybeSingle();
      const { error } = await db.from('payment_gateway_secrets').upsert({
        provider,
        secret_encrypted: secret ? encryptSecret(secret) : cur?.secret_encrypted ?? null,
        webhook_secret_encrypted: hook ? encryptSecret(hook) : cur?.webhook_secret_encrypted ?? null,
        updated_at: new Date().toISOString(),
      });
      if (error) return fail('Could not store the credentials.');
      await logAudit(profile, 'payment_gateway.credentials_changed', 'payment_gateways', provider, { after: { secret_changed: Boolean(secret), webhook_secret_changed: Boolean(hook) } });
    }
    if (enable) {
      const g = await getGateway(provider);
      if (!g.secret) return fail('Add the secret key before enabling this gateway.');
      if (provider === 'flutterwave' && !g.webhookSecret) return fail('Add the Flutterwave webhook secret hash before enabling it — payments are only confirmed through verified webhooks and server-side verification.');
    }
    const { error } = await (await createClient()).from('payment_gateways').update({ is_enabled: enable, public_key: str(fd, 'public_key') || null, currency, updated_at: new Date().toISOString() }).eq('provider', provider);
    if (error) return fail(error.message);
    revalidatePath('/admin/payments'); revalidatePath('/checkout');
    return ok('Gateway saved.');
  });
}
