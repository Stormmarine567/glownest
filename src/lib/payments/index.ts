import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { GatewayConfig, Provider } from './credentials';

export interface InitResult { url: string; providerRef?: string }
export interface VerifyResult { status: 'success' | 'failed' | 'pending'; amountCents: number; currency: string; providerRef: string | null; reason?: string }

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a); const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

async function call(url: string, init: RequestInit & { secret: string }) {
  const { secret, ...rest } = init;
  const res = await fetch(url, { ...rest, headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json', ...(rest.headers ?? {}) }, cache: 'no-store' });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, json };
}

/* ───────── Paystack ───────── */
const paystack = {
  async init(g: GatewayConfig, o: { reference: string; email: string; amountCents: number; currency: string; callbackUrl: string; orderNumber: string }): Promise<InitResult> {
    const { ok, json } = await call('https://api.paystack.co/transaction/initialize', {
      secret: g.secret!, method: 'POST',
      body: JSON.stringify({ email: o.email, amount: o.amountCents, currency: o.currency, reference: o.reference, callback_url: o.callbackUrl, metadata: { order_number: o.orderNumber } }),
    });
    if (!ok || !json?.data?.authorization_url) throw new Error(json?.message || 'Paystack could not start the payment');
    return { url: json.data.authorization_url };
  },
  async verify(g: GatewayConfig, reference: string): Promise<VerifyResult> {
    const { ok, json } = await call(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { secret: g.secret!, method: 'GET' });
    if (!ok || !json?.data) return { status: 'pending', amountCents: 0, currency: '', providerRef: null, reason: json?.message };
    const d = json.data;
    const status = d.status === 'success' ? 'success' : ['failed', 'abandoned', 'reversed'].includes(d.status) ? 'failed' : 'pending';
    return { status, amountCents: Number(d.amount) || 0, currency: String(d.currency || ''), providerRef: d.id ? String(d.id) : null, reason: d.gateway_response };
  },
  validWebhook(g: GatewayConfig, raw: string, signature: string | null) {
    if (!g.secret || !signature) return false;
    return safeEqual(createHmac('sha512', g.secret).update(raw).digest('hex'), signature);
  },
  async refund(g: GatewayConfig, reference: string, amountCents: number) {
    const { ok, json } = await call('https://api.paystack.co/refund', { secret: g.secret!, method: 'POST', body: JSON.stringify({ transaction: reference, amount: amountCents }) });
    if (!ok) throw new Error(json?.message || 'Paystack refund failed');
    return { providerRef: json?.data?.id ? String(json.data.id) : null };
  },
};

/* ───────── Flutterwave ───────── */
const flutterwave = {
  async init(g: GatewayConfig, o: { reference: string; email: string; amountCents: number; currency: string; callbackUrl: string; orderNumber: string; name?: string }): Promise<InitResult> {
    const { ok, json } = await call('https://api.flutterwave.com/v3/payments', {
      secret: g.secret!, method: 'POST',
      body: JSON.stringify({
        tx_ref: o.reference, amount: (o.amountCents / 100).toFixed(2), currency: o.currency, redirect_url: o.callbackUrl,
        customer: { email: o.email, name: o.name || o.email }, customizations: { title: 'GLOWNEST', description: `Order ${o.orderNumber}` },
      }),
    });
    if (!ok || !json?.data?.link) throw new Error(json?.message || 'Flutterwave could not start the payment');
    return { url: json.data.link };
  },
  async verify(g: GatewayConfig, reference: string): Promise<VerifyResult> {
    const { ok, json } = await call(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`, { secret: g.secret!, method: 'GET' });
    if (!ok || !json?.data) return { status: 'pending', amountCents: 0, currency: '', providerRef: null, reason: json?.message };
    const d = json.data;
    const status = d.status === 'successful' ? 'success' : d.status === 'failed' ? 'failed' : 'pending';
    return { status, amountCents: Math.round(Number(d.amount) * 100) || 0, currency: String(d.currency || ''), providerRef: d.id ? String(d.id) : null, reason: d.processor_response };
  },
  validWebhook(g: GatewayConfig, _raw: string, hash: string | null) {
    return Boolean(g.webhookSecret && hash && safeEqual(g.webhookSecret, hash));
  },
  async refund(g: GatewayConfig, providerTxId: string, amountCents: number) {
    const { ok, json } = await call(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(providerTxId)}/refund`, { secret: g.secret!, method: 'POST', body: JSON.stringify({ amount: (amountCents / 100).toFixed(2) }) });
    if (!ok) throw new Error(json?.message || 'Flutterwave refund failed');
    return { providerRef: json?.data?.id ? String(json.data.id) : null };
  },
};

export const gateways = { paystack, flutterwave } satisfies Record<Provider, unknown>;
