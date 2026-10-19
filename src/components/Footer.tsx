import Link from 'next/link';
import { Logo } from './Logo';
import { BrandIcon } from './BrandIcon';
import { NewsletterForm } from './NewsletterForm';
import { getContent, getSite } from '@/lib/data';

export async function Footer() {
  const [site, footer] = await Promise.all([getSite(), getContent('footer')]);
  return (
    <footer className="bg-navy text-white">
      <div className="container pb-8 pt-12 md:pt-[62px]">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-[repeat(4,253px)_1fr] lg:gap-0">
          <div className="col-span-2 lg:col-span-1">
            <Logo name={site.business.name} tagline={site.business.tagline} logoUrl={site.branding.logo_url} light />
            <ul className="mt-6 flex gap-4">
              {site.social.map((s: { id: string; platform: string; url: string }) => (
                <li key={s.id}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.platform}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/80 transition duration-200 hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-navy">
                    <BrandIcon platform={s.platform} className="h-[14px] w-[14px]" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
          {footer.columns.map((col: { title: string; links: { label: string; href: string }[] }) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="text-[15px] font-bold uppercase tracking-[0.04em] text-white">{col.title}</h2>
              <ul className="mt-5 space-y-[17px]">
                {col.links.map((l) => (
                  <li key={l.label}><Link href={l.href} className="text-[14.5px] text-[#AEB8CC] transition hover:text-white">{l.label}</Link></li>
                ))}
              </ul>
            </nav>
          ))}
          <div className="col-span-2 lg:col-span-1">
            <h2 className="text-[15px] font-bold uppercase tracking-[0.04em]">NEWSLETTER</h2>
            <p className="mt-5 text-[14.5px] text-[#AEB8CC]">{footer.newsletter_text}</p>
            <div className="mt-4"><NewsletterForm /></div>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-8 text-[14px] text-[#8591A8] md:mt-[45px] md:flex-row">
          <p>© {new Date().getFullYear()} {footer.copyright}</p>
          <p>
            Developed By{' '}
            <a href="https://storm567.vercel.app/" target="_blank" rel="noopener noreferrer" className="font-bold text-white underline-offset-4 transition hover:underline">STORM</a>
          </p>
          <Link href="/privacy" className="transition hover:text-white">Privacy Policy</Link>
        </div>
      </div>
    </footer>
  );
}
