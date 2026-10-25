import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptSecret } from '@/lib/crypto';

export type Provider = 'paystack' | 'flutterwave';
export const PROVIDERS: Provider[] = ['paystack', 'flutterwave'];

export interface GatewayConfig {
  provider: Provider; enabled: boolean; publicKey: string | null; currency: string;
  secret: string | null; webhookSecret: string | null;
}

/** Server-only. Secrets come from the encrypted DB row (managed by the Super Admin) or, as a fallback, environment variables. */
export async function getGateway(provider: Provider): Promise<GatewayConfig> {
  const db = createAdminClient();
  const [{ data: g }, { data: s }] = await Promise.all([
    db.from('payment_gateways').select('*').eq('provider', provider).maybeSingle(),
    db.from('payment_gateway_secrets').select('*').eq('provider', provider).maybeSingle(),
  ]);
  const dec = (v?: string | null) => { try { return v ? decryptSecret(v) : null; } catch { return null; } };
  const envSecret = provider === 'paystack' ? process.env.PAYSTACK_SECRET_KEY : process.env.FLUTTERWAVE_SECRET_KEY;
  const envHook = provider === 'flutterwave' ? process.env.FLUTTERWAVE_WEBHOOK_HASH : undefined;
  return {
    provider, enabled: Boolean(g?.is_enabled), publicKey: g?.public_key ?? null, currency: g?.currency ?? 'NGN',
    secret: dec(s?.secret_encrypted) ?? envSecret ?? null,
    webhookSecret: dec(s?.webhook_secret_encrypted) ?? envHook ?? null,
  };
}

export async function enabledProviders() {
  const { data } = await createAdminClient().from('payment_gateways').select('provider,display_name').eq('is_enabled', true);
  return (data ?? []) as { provider: Provider; display_name: string }[];
}
