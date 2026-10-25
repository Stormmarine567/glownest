'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, ShoppingBag, User, Heart, Star, Bell, Mail, Users, MessageSquare, FileText, Settings,
  CreditCard, ShieldCheck, ScrollText, Tag, Newspaper, Menu, X, ChevronDown, type LucideIcon,
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
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  const isActive = (href: string, exact = false) => (exact || href === '/dashboard' || href === '/admin' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
  const current = nav.filter((n) => isActive(n.href)).sort((x, y) => y.href.length - x.href.length)[0] ?? nav[0];
  const CurrentIcon = current ? ICONS[current.icon] : Menu;
  const links = nav.map((n) => {
    const Icon = ICONS[n.icon];
    const on = isActive(n.href);
    return (
      <Link key={n.href} href={n.href} aria-current={on ? 'page' : undefined}
        className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-medium transition duration-200 lg:py-2.5 ${on ? 'bg-navy text-white shadow-card' : 'text-[#4B5A73] hover:bg-white hover:text-ink'}`}>
        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.7} />
        <span className="whitespace-nowrap">{n.label}</span>
        {n.badge ? <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${on ? 'bg-white text-navy' : 'bg-navy text-white'}`}>{n.badge}</span> : null}
      </Link>
    );
  });
  return (
    <div className={theme === 'admin' ? 'min-h-screen bg-[#F6F8FC]' : 'bg-[#F6F8FC]'}>
      <div className="container grid gap-5 py-5 md:py-10 lg:grid-cols-[240px_1fr] lg:gap-10">
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="mb-4 hidden lg:block"><h1 className="text-[20px]">{title}</h1>{subtitle && <p className="mt-1 break-all text-[12px] text-muted">{subtitle}</p>}</div>
          {/* Phone & tablet: one tap opens the full menu */}
          <div className="lg:hidden">
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="dash-menu"
              className="flex h-12 w-full items-center gap-3 rounded-xl bg-white px-4 text-left shadow-soft">
              {open ? <X className="h-5 w-5 shrink-0" /> : <Menu className="h-5 w-5 shrink-0" />}
              <span className="min-w-0 flex-1"><span className="block text-[11px] uppercase tracking-wider text-muted">{title}</span><span className="flex items-center gap-2 text-[14px] font-bold"><CurrentIcon className="h-4 w-4 shrink-0" strokeWidth={1.7} /><span className="truncate">{current?.label}</span></span></span>
              <ChevronDown className={`h-4 w-4 shrink-0 transition ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
              <nav id="dash-menu" aria-label={`${title} navigation`} className="mt-2 grid gap-1 rounded-2xl bg-white p-2 shadow-card sm:grid-cols-2">{links}</nav>
            )}
          </div>
          <nav aria-label={`${title} navigation`} className="hidden lg:flex lg:flex-col lg:gap-1">{links}</nav>
        </aside>
        <div className="min-w-0 animate-fadeUp">{children}</div>
      </div>
    </div>
  );
}
