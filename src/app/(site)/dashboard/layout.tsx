import { DashboardShell, type NavItem } from '@/components/dashboard/Shell';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'My Account', robots: { index: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile, userId } = await requireUser('/dashboard');
  const sb = await createClient();
  const { count } = await sb.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('read_at', null);
  const nav: NavItem[] = [
    { href: '/dashboard', label: 'Overview', icon: 'overview' },
    { href: '/dashboard/orders', label: 'My Orders', icon: 'orders' },
    { href: '/dashboard/profile', label: 'My Profile', icon: 'profile' },
    { href: '/dashboard/wishlist', label: 'Wishlist', icon: 'wishlist' },
    { href: '/dashboard/reviews', label: 'Reviews', icon: 'reviews' },
    { href: '/dashboard/notifications', label: 'Notifications', icon: 'notifications', badge: count ?? 0 },
    { href: '/dashboard/newsletter', label: 'Newsletter', icon: 'newsletter' },
  ];
  return <DashboardShell title="My Account" subtitle={profile.email} nav={nav}>{children}</DashboardShell>;
}
