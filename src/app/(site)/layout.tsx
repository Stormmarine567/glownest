import { headers } from 'next/headers';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getSite } from '@/lib/data';
import { getSessionProfile } from '@/lib/auth';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [site, session, h] = await Promise.all([getSite(), getSessionProfile(), headers()]);
  const path = h.get('x-pathname') ?? '/';
  const isStaff = session && session.profile.role !== 'customer';
  if (site.store.maintenance_mode && !isStaff && !path.startsWith('/login')) {
    return (
      <main id="main" className="flex min-h-screen flex-col items-center justify-center bg-tint px-6 text-center">
        <p className="eyebrow">/ BACK SOON</p>
        <h1 className="mt-3 text-[40px]">We&apos;re polishing things up.</h1>
        <p className="mt-4 max-w-md text-muted">{site.business.name} is undergoing a short maintenance. Please check back shortly.</p>
      </main>
    );
  }
  return (
    <>
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
