import { CheckoutForm } from '@/components/CheckoutForm';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Checkout', robots: { index: false } };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { profile, userId } = await requireUser('/checkout');
  const { code } = await searchParams;
  const sb = await createClient();
  const [{ data: addresses }, { data: providers }] = await Promise.all([
    sb.from('addresses').select('id,label,full_name,phone,line1,line2,city,state,postal_code,country').eq('user_id', userId).order('is_default_shipping', { ascending: false }),
    sb.from('payment_gateways').select('provider,display_name').eq('is_enabled', true),
  ]);
  return (
    <section className="container py-10 md:py-[56px]">
      <h1 className="mb-8 text-[32px] md:text-[40px]">Checkout</h1>
      <CheckoutForm defaultName={profile.full_name ?? ''} addresses={addresses ?? []} providers={providers ?? []} initialCode={code ?? null} />
    </section>
  );
}
