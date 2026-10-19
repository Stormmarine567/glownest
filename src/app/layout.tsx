import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import { CartProvider } from '@/components/CartProvider';
import { getSite } from '@/lib/data';
import { getSessionProfile } from '@/lib/auth';

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return {
    metadataBase: new URL(base),
    title: { default: site.seo.title || `${site.business.name} Skincare`, template: `%s | ${site.business.name}` },
    description: site.seo.description,
    icons: site.branding.favicon_url ? { icon: site.branding.favicon_url } : undefined,
    openGraph: { title: site.seo.title, description: site.seo.description, siteName: site.business.name, type: 'website' },
  };
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#1B2A4A' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [site, session] = await Promise.all([getSite(), getSessionProfile()]);
  const ga = site.seo.analytics_id as string;
  return (
    <html lang="en">
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">Skip to content</a>
        <CartProvider isAuthed={Boolean(session)}>{children}</CartProvider>
        {/^G-[A-Z0-9]+$/.test(ga || '') && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
            <Script id="ga" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${ga}');`}</Script>
          </>
        )}
      </body>
    </html>
  );
}
