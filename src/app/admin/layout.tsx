import Link from 'next/link';
import { DashboardShell, type NavItem } from '@/components/dashboard/Shell';
import { Logo } from '@/components/Logo';
import { can, requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { Permission } from '@/lib/types';

export const metadata = { title: { default: 'Admin', template: '%s · GLOWNEST Admin' }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, userId } = await requireAdmin();
  const sb = await createClient();
  const [{ count: pendingOrders }, { count: pendingReviews }, { count: unread }] = await Promise.all([
    sb.from('order_requests').select('id', { count: 'exact', head: true }).eq('status', 'requested'),
    sb.from('reviews').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    sb.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('read_at', null),
  ]);
  const all: (NavItem & { perm?: Permission | 'super' })[] = [
    { href: '/admin', label: 'Overview', icon: 'overview' },
    { href: '/admin/orders', label: 'Orders', icon: 'orders', perm: 'orders', badge: pendingOrders ?? 0 },
    { href: '/admin/products', label: 'Products', icon: 'products', perm: 'products' },
    { href: '/admin/reviews', label: 'Reviews', icon: 'reviews', perm: 'reviews', badge: pendingReviews ?? 0 },
    { href: '/admin/customers', label: 'Customers', icon: 'customers', perm: 'customers' },
    { href: '/admin/messages', label: 'Messages', icon: 'messages', perm: 'customers' },
    { href: '/admin/newsletter', label: 'Newsletter', icon: 'newsletter', perm: 'newsletter' },
    { href: '/admin/content', label: 'Site content', icon: 'content', perm: 'content' },
    { href: '/admin/pages', label: 'Pages & FAQs', icon: 'blog', perm: 'content' },
    { href: '/admin/blog', label: 'Blog', icon: 'blog', perm: 'content' },
    { href: '/admin/settings', label: 'Settings', icon: 'settings', perm: 'super' },
    { href: '/admin/coupons', label: 'Coupons & shipping', icon: 'coupons', perm: 'super' },
    { href: '/admin/payments', label: 'Payments', icon: 'payments', perm: 'super' },
    { href: '/admin/admins', label: 'Admins', icon: 'admins', perm: 'super' },
    { href: '/admin/audit', label: 'Audit log', icon: 'audit', perm: 'super' },
    { href: '/dashboard/notifications', label: 'Notifications', icon: 'notifications', badge: unread ?? 0 },
  ];
  const nav = all.filter((n) => !n.perm || (n.perm === 'super' ? profile.role === 'super_admin' : can(profile, n.perm)));
  return (
    <>
      <div className="border-b border-line bg-white">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3"><Logo /><span className="rounded-full bg-navy px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">{profile.role === 'super_admin' ? 'Super Admin' : 'Admin'}</span></div>
          <div className="flex items-center gap-4 text-[13px]">
            <Link href="/" className="hover:underline">View store</Link>
            <form action="/auth/signout" method="post"><button className="font-bold hover:underline">Sign out</button></form>
          </div>
        </div>
      </div>
      <DashboardShell title="Admin" subtitle={profile.email} nav={nav} theme="admin">{children}</DashboardShell>
    </>
  );
}
