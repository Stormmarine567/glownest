import { WishlistList } from '@/components/dashboard/WishlistList';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Wishlist' };

export default async function WishlistPage() {
  const { userId } = await requireUser('/dashboard/wishlist');
  const { data } = await (await createClient()).from('wishlists').select('product_id, products(id,slug,name,tagline,price_cents,sale_price_cents,currency,stock_quantity,product_images(url,sort_order))').eq('user_id', userId).order('created_at', { ascending: false });
  return (
    <div className="rounded-2xl bg-white p-5 shadow-soft md:p-6">
      <h2 className="mb-5 text-[22px]">Wishlist</h2>
      <WishlistList userId={userId} initial={(data ?? []) as never} />
    </div>
  );
}
