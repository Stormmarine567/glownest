import { MyReviews } from '@/components/dashboard/MyReviews';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'My Reviews' };

export default async function ReviewsPage() {
  const { userId } = await requireUser('/dashboard/reviews');
  const { data } = await (await createClient()).from('reviews').select('id,rating,title,body,status,created_at,products(name,slug)').eq('user_id', userId).order('created_at', { ascending: false });
  return (
    <div className="rounded-2xl bg-white p-5 shadow-soft md:p-6">
      <h2 className="mb-2 text-[22px]">My Reviews</h2>
      <MyReviews reviews={(data ?? []) as never} />
    </div>
  );
}
