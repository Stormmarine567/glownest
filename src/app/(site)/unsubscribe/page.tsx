import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rate-limit';

export const metadata = { title: 'Unsubscribe', robots: { index: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The unguessable per-subscriber token in the email link is the authorization.
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  let ok = false;
  if (t && UUID.test(t) && (await rateLimit('unsub', 20, 600))) {
    const { data } = await createAdminClient().from('newsletter_subscribers')
      .update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
      .eq('unsubscribe_token', t).select('id');
    ok = Boolean(data?.length);
  }
  return (
    <section className="container flex min-h-[50vh] max-w-[520px] flex-col items-center justify-center py-20 text-center">
      <h1 className="text-[30px]">{ok ? 'You have been unsubscribed' : 'This link is not valid'}</h1>
      <p className="mt-3 text-[14px] text-muted">{ok ? 'You will no longer receive marketing emails from us. Order updates will still reach you.' : 'The unsubscribe link may be incomplete or already used.'}</p>
    </section>
  );
}
