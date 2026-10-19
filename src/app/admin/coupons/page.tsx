import { ActionForm } from '@/components/dashboard/ActionForm';
import { requireSuperAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { deleteCouponAction, deleteShippingAction, saveCouponAction, saveShippingAction } from '../settings/actions';

export const metadata = { title: 'Coupons & shipping' };
export const dynamic = 'force-dynamic';

type C = { id: string; code: string; description: string | null; percent_off: number | null; amount_off_cents: number | null; min_subtotal_cents: number; max_uses: number | null; used_count: number; starts_at: string | null; expires_at: string | null; is_active: boolean };
type S = { id: string; name: string; description: string | null; price_cents: number; free_over_cents: number | null; estimated_days_min: number | null; estimated_days_max: number | null; is_active: boolean; sort_order: number };
const box = 'rounded-2xl bg-white p-5 shadow-soft md:p-6';
const local = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : '');

function CouponFields({ c }: { c?: C }) {
  return (<>{c && <input type="hidden" name="id" value={c.id} />}
    <div className="grid gap-3 md:grid-cols-4">
      <div><label className="label">Code</label><input name="code" required defaultValue={c?.code} className="input uppercase" /></div>
      <div><label className="label">Type</label><select name="kind" defaultValue={c?.amount_off_cents ? 'amount' : 'percent'} className="input"><option value="percent">Percent off</option><option value="amount">Fixed amount off</option></select></div>
      <div><label className="label">Value</label><input name="value" required inputMode="decimal" defaultValue={c ? (c.percent_off ?? (c.amount_off_cents ?? 0) / 100) : ''} className="input" /></div>
      <div><label className="label">Min. order</label><input name="min_subtotal" inputMode="decimal" defaultValue={c ? c.min_subtotal_cents / 100 : ''} className="input" /></div>
      <div><label className="label">Max uses</label><input name="max_uses" inputMode="numeric" defaultValue={c?.max_uses ?? ''} className="input" /></div>
      <div><label className="label">Starts</label><input name="starts_at" type="datetime-local" defaultValue={local(c?.starts_at ?? null)} className="input" /></div>
      <div><label className="label">Expires</label><input name="expires_at" type="datetime-local" defaultValue={local(c?.expires_at ?? null)} className="input" /></div>
      <div><label className="label">Description</label><input name="description" defaultValue={c?.description ?? ''} className="input" /></div></div>
    <label className="mt-3 flex items-center gap-2 text-[13px]"><input type="checkbox" name="is_active" defaultChecked={c?.is_active ?? true} />Active{c ? <span className="ml-3 text-muted">Used {c.used_count}×</span> : null}</label></>);
}
function ShipFields({ s }: { s?: S }) {
  return (<>{s && <input type="hidden" name="id" value={s.id} />}
    <div className="grid gap-3 md:grid-cols-4">
      <div><label className="label">Name</label><input name="name" required defaultValue={s?.name} className="input" /></div>
      <div><label className="label">Price</label><input name="price" inputMode="decimal" defaultValue={s ? s.price_cents / 100 : '0'} className="input" /></div>
      <div><label className="label">Free over</label><input name="free_over" inputMode="decimal" defaultValue={s?.free_over_cents != null ? s.free_over_cents / 100 : ''} className="input" /></div>
      <div><label className="label">Order</label><input name="sort_order" inputMode="numeric" defaultValue={s?.sort_order ?? 0} className="input" /></div>
      <div><label className="label">Days (min)</label><input name="days_min" inputMode="numeric" defaultValue={s?.estimated_days_min ?? ''} className="input" /></div>
      <div><label className="label">Days (max)</label><input name="days_max" inputMode="numeric" defaultValue={s?.estimated_days_max ?? ''} className="input" /></div>
      <div className="md:col-span-2"><label className="label">Description</label><input name="description" defaultValue={s?.description ?? ''} className="input" /></div></div>
    <label className="mt-3 flex items-center gap-2 text-[13px]"><input type="checkbox" name="is_active" defaultChecked={s?.is_active ?? true} />Available at checkout</label></>);
}

export default async function CouponsPage() {
  await requireSuperAdmin();
  const sb = await createClient();
  const [{ data: coupons }, { data: ship }] = await Promise.all([sb.from('discount_codes').select('*').order('created_at', { ascending: false }), sb.from('shipping_methods').select('*').order('sort_order')]);
  return (
    <div className="space-y-6">
      <h2 className="text-[26px]">Coupons & shipping</h2>
      <section className={box}><h3 className="text-[18px]">Discount codes</h3>
        <ActionForm action={saveCouponAction} submit="Create coupon" resetOnSuccess className="mt-4 border-b border-line pb-6"><CouponFields /></ActionForm>
        <div className="mt-6 space-y-6">{(coupons ?? []).map((c) => <div key={c.id}><ActionForm action={saveCouponAction} submit="Save" small><CouponFields c={c as C} /></ActionForm><ActionForm action={deleteCouponAction} submit="Delete" danger small confirm="Delete this coupon?" className="mt-1"><input type="hidden" name="id" value={c.id} /></ActionForm></div>)}</div></section>
      <section className={box}><h3 className="text-[18px]">Shipping methods</h3>
        <ActionForm action={saveShippingAction} submit="Add method" resetOnSuccess className="mt-4 border-b border-line pb-6"><ShipFields /></ActionForm>
        <div className="mt-6 space-y-6">{(ship ?? []).map((s) => <div key={s.id}><ActionForm action={saveShippingAction} submit="Save" small><ShipFields s={s as S} /></ActionForm><ActionForm action={deleteShippingAction} submit="Delete" danger small confirm="Delete this method?" className="mt-1"><input type="hidden" name="id" value={s.id} /></ActionForm></div>)}</div></section>
    </div>
  );
}
