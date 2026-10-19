import { Logo } from './Logo';
import { HeaderClient } from './HeaderClient';
import { getContent, getSite } from '@/lib/data';
import { getSessionProfile } from '@/lib/auth';

export async function Header() {
  const [site, nav, session] = await Promise.all([getSite(), getContent('nav'), getSessionProfile()]);
  return (
    <HeaderClient
      links={nav.links}
      user={session ? { name: session.profile.full_name || session.profile.email, role: session.profile.role } : null}
      logo={<Logo name={site.business.name} tagline={site.business.tagline} logoUrl={site.branding.logo_url} />}
    />
  );
}
