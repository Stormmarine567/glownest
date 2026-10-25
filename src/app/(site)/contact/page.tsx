import type { Metadata } from 'next';
import { Clock, ExternalLink, Mail, MapPin, Phone } from 'lucide-react';
import { PageHero } from '@/components/PageHero';
import { ContactForm } from '@/components/ContactForm';
import { getSite } from '@/lib/data';

export const metadata: Metadata = { title: 'Contact' };

export default async function ContactPage() {
  const { business: b } = await getSite();
  const rows = [
    { icon: Mail, label: 'Email', lines: [b.email], href: `mailto:${b.email}` },
    { icon: Phone, label: 'Phone', lines: [b.phone], href: `tel:${String(b.phone).replace(/\s/g, '')}` },
    { icon: MapPin, label: 'Address', lines: b.address_lines as string[], href: b.map_url || undefined },
    { icon: Clock, label: 'Hours', lines: b.hours as string[] },
  ];
  return (
    <>
      <PageHero eyebrow="CONTACT" title="Get in Touch" text="We'd love to hear from you. Whether you have a question about our products or need skincare advice." />
      <section className="py-10 md:pb-[64px] md:pt-[64px]">
        <div className="container grid gap-10 md:grid-cols-[1fr_795px] md:gap-[0px] lg:gap-0">
          <ul className="space-y-5 md:space-y-[14px]">
            {rows.map(({ icon: I, label, lines, href }) => (
              <li key={label} className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tint text-navy"><I className="h-[18px] w-[18px]" strokeWidth={1.6} /></span>
                <div>
                  <h2 className="text-[14px]">{label}</h2>
                  {lines.map((l) => (href && label !== 'Address' ? <a key={l} href={href} className="block text-[13px] leading-5 text-muted transition hover:text-ink">{l}</a> : <p key={l} className="text-[13px] leading-5 text-muted">{l}</p>))}
                  {label === 'Address' && href && <a href={href} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-ink underline-offset-2 hover:underline">View on map <ExternalLink className="h-3 w-3" /></a>}
                </div>
              </li>
            ))}
          </ul>
          <ContactForm />
        </div>
      </section>
    </>
  );
}
