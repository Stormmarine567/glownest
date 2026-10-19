'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, ShoppingBag, User, Heart, Star, Bell, Mail, Users, MessageSquare, FileText, Settings,
  CreditCard, ShieldCheck, ScrollText, Tag, Newspaper, type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  overview: LayoutDashboard, orders: ShoppingBag, products: Package, profile: User, wishlist: Heart, reviews: Star,
  notifications: Bell, newsletter: Mail, customers: Users, messages: MessageSquare, content: FileText, settings: Settings,
  payments: CreditCard, admins: ShieldCheck, audit: ScrollText, coupons: Tag, blog: Newspaper,
};

export interface NavItem { href: string; label: string; icon: keyof typeof ICONS; badge?: number }

export function DashboardShell({ title, subtitle, nav, children, theme = 'customer' }: {
  title: string; subtitle?: string; nav: NavItem[]; children: React.ReactNode; theme?: 'customer' | 'admin';
}) {
  const pathname = usePathname();
  const isActive = (href: string, exact = false) => (exact || href === '/dashboard' || href === '/admin' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
  return (
    <div className={theme === 'admin' ? 'min-h-screen bg-[#F6F8FC]' : 'bg-[#F6F8FC]'}>
      <div className="container grid gap-6 py-6 md:py-10 lg:grid-cols-[240px_1fr] lg:gap-10">
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="mb-4 hidden lg:block"><h1 className="text-[20px]">{title}</h1>{subtitle && <p className="mt-1 text-[12px] text-muted">{subtitle}</p>}</div>
          <nav aria-label={`${title} navigation`} className="-mx-5 flex gap-1 overflow-x-auto px-5 pb-2 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
            {nav.map((n) => {
              const Icon = ICONS[n.icon];
              const on = isActive(n.href);
              return (
                <Link key={n.href} href={n.href} aria-current={on ? 'page' : undefined}
                  className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-2.5 text-[14px] font-medium transition duration-200 ${on ? 'bg-navy text-white shadow-card' : 'text-[#4B5A73] hover:bg-white hover:text-ink'}`}>
                  <Icon className="h-4 w-4" strokeWidth={1.7} />
                  <span className="whitespace-nowrap">{n.label}</span>
                  {n.badge ? <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${on ? 'bg-white text-navy' : 'bg-navy text-white'}`}>{n.badge}</span> : null}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="min-w-0 animate-fadeUp">{children}</div>
      </div>
    </div>
  );
}
