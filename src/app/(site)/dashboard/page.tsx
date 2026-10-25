import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatMoney } from '@/lib/utils';

export default async function DashboardHome() {
  const { profile, userId } = await requireUser('/dashboard');
  const sb = await createClient();
  const { data: orders } = await sb.from('orders').select('id,order_number,status,payment_status,total_cents,currency,created_at').eq('user_id', userId).order('created_at', { ascending: false });
  const all = orders ?? [];
  const pending = all.filter((o) => ['pending', 'confirmed', 'processing', 'shipped'].includes(o.status)).length;
  const completed = all.filter((o) => o.status === 'delivered').length;
  const stats = [{ label: 'Total orders', v: all.length }, { label: 'Pending orders', v: pending }, { label: 'Completed orders', v: completed }];
  const links = [['/dashboard/orders', 'Track an order'], ['/quiz', 'Retake skin quiz'], ['/dashboard/wishlist', 'View wishlist'], ['/dashboard/profile', 'Edit profile']];

  return (
    <div className="space-y-6">
      <div className="rounded-[20px] bg-navy p-6 text-white md:p-8">
        <p className="text-[12px] uppercase tracking-[0.16em] text-white/60">Welcome back</p>
        <h2 className="mt-1 text-[26px] text-white md:text-[32px]">Hello, {profile.full_name?.split(' ')[0] || 'there'} 👋</h2>
        <p className="mt-2 text-[14px] text-white/70">{profile.email} · member since {formatDate(profile.created_at, { month: 'long', year: 'numeric' })}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => <div key={s.label} className="rounded-2xl bg-white p-5 shadow-soft"><p className="text-[12px] text-muted">{s.label}</p><p className="mt-1 font-serif text-[32px] font-bold">{s.v}</p></div>)}
      </div>
      <div className="rounded-2xl bg-white p-5 shadow-soft md:p-6">
        <div className="flex items-center justify-between"><h2 className="text-[18px]">Recent orders</h2><Link href="/dashboard/orders" className="flex items-center gap-1 text-[13px] font-bold">View all <ArrowRight className="h-3.5 w-3.5" /></Link></div>
        {all.length === 0 ? <p className="mt-4 text-[14px] text-muted">No orders yet. <Link href="/shop" className="font-bold text-ink underline">Start shopping</Link></p> : (
          <ul className="mt-3 divide-y divide-line">
            {all.slice(0, 5).map((o) => (
              <li key={o.id}><Link href={`/dashboard/orders/${o.id}`} className="flex items-center justify-between gap-3 py-3 transition hover:bg-tint-soft">
                <span><span className="block text-[14px] font-medium">{o.order_number}</span><span className="text-[12px] text-muted">{formatDate(o.created_at)}</span></span>
                <span className="flex items-center gap-3"><StatusBadge value={o.status} /><span className="text-[14px] font-bold">{formatMoney(o.total_cents, o.currency)}</span></span>
              </Link></li>
            ))}
          </ul>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {links.map(([href, label]) => <Link key={href} href={href} className="rounded-2xl border border-line bg-white p-4 text-[14px] font-medium transition hover:-translate-y-0.5 hover:shadow-card">{label} →</Link>)}
      </div>
    </div>
  );
}
