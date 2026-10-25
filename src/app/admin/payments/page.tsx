import Link from 'next/link';
import { ActionForm } from '@/components/dashboard/ActionForm';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { requireSuperAdmin } from '@/lib/auth';
import { getGateway, PROVIDERS } from '@/lib/payments/credentials';
import { siteUrl } from '@/lib/email/send';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatMoney } from '@/lib/utils';
import { saveGatewayAction } from './actions';

export const metadata = { title: 'Payments' };
export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
  await requireSuperAdmin();
  const sb = await createClient();
  const db = createAdminClient();
  const [{ data: rows }, { data: payments }, { data: secrets }, cfgs] = await Promise.all([
    sb.from('payment_gateways').select('*'),
    sb.from('payments').select('id,provider,reference,status,amount_cents,currency,failure_reason,verified_at,created_at,order_id,orders(order_number)').order('created_at', { ascending: false }).limit(40),
    db.from('payment_gateway_secrets').select('provider,secret_encrypted,webhook_secret_encrypted'),
    Promise.all(PROVIDERS.map((p) => getGateway(p))),
  ]);
  const base = siteUrl();
  const box = 'rounded-2xl bg-white p-5 shadow-soft md:p-6';
  return (
    <div className="space-y-6">
      <h2 className="text-[26px]">Payments</h2>
      <p className="rounded-xl bg-tint p-4 text-[13px] leading-6">Orders are only marked paid after the server verifies the transaction with the provider (or receives a correctly signed webhook). Returning to the success page never marks an order as paid.</p>
      {PROVIDERS.map((p, i) => {
        const g = rows?.find((r) => r.provider === p);
        const s = secrets?.find((x) => x.provider === p);
        const cfg = cfgs[i];
        const src = s?.secret_encrypted ? 'saved (encrypted)' : cfg.secret ? 'environment variable' : 'not set';
        return (
          <ActionForm key={p} action={saveGatewayAction} submit="Save gateway" className={box}>
            <input type="hidden" name="provider" value={p} />
            <div className="flex items-center justify-between"><h3 className="text-[18px]">{g?.display_name ?? p}</h3>{g?.is_enabled ? <StatusBadge value="approved" /> : <StatusBadge value="draft" />}</div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div><label className="label" htmlFor={`${p}-pk`}>Public key</label><input id={`${p}-pk`} name="public_key" defaultValue={g?.public_key ?? ''} className="input" /></div>
              <div><label className="label" htmlFor={`${p}-cur`}>Currency</label><input id={`${p}-cur`} name="currency" maxLength={3} defaultValue={g?.currency ?? 'NGN'} className="input uppercase" /></div>
              <div><label className="label" htmlFor={`${p}-sk`}>Secret key</label><input id={`${p}-sk`} name="secret" type="password" autoComplete="new-password" placeholder={`Currently: ${src} — leave empty to keep`} className="input" /></div>
              {p === 'flutterwave' && <div><label className="label" htmlFor={`${p}-wh`}>Webhook secret hash</label><input id={`${p}-wh`} name="webhook_secret" type="password" autoComplete="new-password" placeholder={s?.webhook_secret_encrypted || cfg.webhookSecret ? 'Set — leave empty to keep' : 'Not set'} className="input" /></div>}
            </div>
            <p className="mt-3 text-[12px] text-muted">Webhook URL to paste in the {p} dashboard: <code className="rounded bg-tint px-1.5 py-0.5">{base}/api/webhooks/{p}</code>{p === 'paystack' ? ' (signed with your secret key).' : ' (use the same secret hash you enter above).'}</p>
            <label className="mt-4 flex items-center gap-2 text-[13px]"><input type="checkbox" name="is_enabled" defaultChecked={g?.is_enabled} />Enable at checkout</label>
          </ActionForm>
        );
      })}
      <section className={box}><h3 className="text-[18px]">Recent payment attempts</h3>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-[13px]"><thead className="text-[11px] uppercase tracking-wider text-muted"><tr><th className="py-2">Order</th><th>Provider</th><th>Status</th><th>Amount</th><th>Reference</th><th>Date</th></tr></thead>
          <tbody className="divide-y divide-line">{(payments ?? []).map((x) => { const o = x.orders as unknown as { order_number: string } | null; return <tr key={x.id}><td className="py-2.5"><Link href={`/admin/orders/${x.order_id}`} className="font-bold underline">{o?.order_number ?? '—'}</Link></td><td className="capitalize">{x.provider}</td><td><StatusBadge value={x.status} />{x.failure_reason && <span className="block text-[11px] text-red-600">{x.failure_reason}</span>}</td><td>{formatMoney(x.amount_cents, x.currency)}</td><td className="text-[11px] text-muted">{x.reference}</td><td>{formatDate(x.created_at, { dateStyle: 'medium', timeStyle: 'short' })}</td></tr>; })}
            {(payments ?? []).length === 0 && <tr><td colSpan={6} className="py-6 text-center text-muted">No payments yet.</td></tr>}</tbody></table></div></section>
    </div>
  );
}
