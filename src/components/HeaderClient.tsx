'use client';
import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, ShoppingBag, X } from 'lucide-react';
import { useCart } from './CartProvider';

interface Props {
  links: { label: string; href: string }[];
  user: { name: string; role: string } | null;
  logo: ReactNode;
}

export function HeaderClient({ links, user, logo }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { count } = useCart();
  const active = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`) || (href === '/shop' && pathname.startsWith('/product')));
  const home = user ? (user.role === 'customer' ? '/dashboard' : '/admin') : null;

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur">
      <div className="container flex h-[56px] items-center justify-between md:h-[80px]">
        {logo}
        <nav aria-label="Main" className="hidden items-center gap-10 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={active(l.href) ? 'page' : undefined}
              className={`relative py-1 text-[14px] transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-navy after:transition-transform hover:text-ink hover:after:scale-x-100 ${active(l.href) ? 'font-bold text-ink' : 'font-medium text-[#4B5A73]'}`}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 md:gap-5">
          <Link href="/cart" aria-label={`Cart, ${count} items`} className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink transition hover:bg-tint">
            <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.7} />
            {count > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-navy px-1 text-[10px] font-bold text-white">{count}</span>}
          </Link>
          <div className="hidden items-center gap-5 md:flex">
            {user ? (
              <>
                <Link href={home!} className="text-[14px] font-medium text-[#4B5A73] transition hover:text-ink">{user.role === 'customer' ? 'My Account' : 'Admin'}</Link>
                <form action="/auth/signout" method="post"><button className="btn btn-primary h-10 px-5 text-[14px] font-bold">Sign out</button></form>
              </>
            ) : (
              <>
                <Link href="/login" className="text-[14px] font-medium text-[#4B5A73] transition hover:text-ink">Sign In</Link>
                <Link href="/register" className="btn btn-primary h-10 px-5 font-bold">Sign Up</Link>
              </>
            )}
          </div>
          <button type="button" className="flex h-9 w-9 items-center justify-center md:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>
      <div className={`grid overflow-hidden border-t border-line bg-white transition-all duration-300 md:hidden ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr] border-t-0'}`}>
        <div className="overflow-hidden">
          <nav aria-label="Mobile" className="container flex flex-col gap-1 py-4">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className={`rounded-lg px-3 py-3 text-[15px] ${active(l.href) ? 'bg-tint font-bold' : 'font-medium text-[#4B5A73]'}`}>{l.label}</Link>
            ))}
            <div className="mt-2 flex gap-3 border-t border-line pt-4">
              {user ? (
                <>
                  <Link href={home!} onClick={() => setOpen(false)} className="btn btn-outline flex-1">{user.role === 'customer' ? 'My Account' : 'Admin'}</Link>
                  <form action="/auth/signout" method="post" className="flex-1"><button className="btn btn-primary w-full">Sign out</button></form>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setOpen(false)} className="btn btn-outline flex-1">Sign In</Link>
                  <Link href="/register" onClick={() => setOpen(false)} className="btn btn-primary flex-1">Sign Up</Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
