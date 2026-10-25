import Link from 'next/link';
import { ActionForm } from '@/components/dashboard/ActionForm';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import { deleteReviewAction, moderateReviewAction } from './actions';

export const metadata = { title: 'Reviews' };
export const dynamic = 'force-dynamic';

export default async function AdminReviews({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin('reviews');
  const { status } = await searchParams;
  let q = (await createClient()).from('reviews').select('id,display_name,rating,title,body,status,is_verified_purchase,created_at,products(name,slug)').order('created_at', { ascending: false }).limit(100);
  if (status && ['pending', 'approved', 'rejected'].includes(status)) q = q.eq('status', status);
  const { data } = await q;
  const tab = (s: string, l: string) => <Link key={s} href={s ? `/admin/reviews?status=${s}` : '/admin/reviews'} className={`rounded-full px-4 py-1.5 text-[13px] ${(status ?? '') === s ? 'bg-navy text-white' : 'bg-white'}`}>{l}</Link>;
  return (
    <div>
      <h2 className="mb-4 text-[26px]">Reviews</h2>
      <div className="mb-4 flex gap-2">{tab('', 'All')}{tab('pending', 'Pending')}{tab('approved', 'Approved')}{tab('rejected', 'Rejected')}</div>
      <ul className="space-y-3">
        {(data ?? []).map((r) => {
          const prod = r.products as unknown as { name: string; slug: string } | null;
          return (
            <li key={r.id} className="rounded-2xl bg-white p-5 shadow-soft text-[13px]">
              <div className="flex flex-wrap items-center justify-between gap-2"><div><b>{r.display_name}</b> · <span className="text-star">{'★'.repeat(r.rating)}</span><span className="text-[#D3D9E4]">{'★'.repeat(5 - r.rating)}</span> {r.is_verified_purchase && <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-800">Verified</span>}</div><div className="flex items-center gap-2"><StatusBadge value={r.status} /><span className="text-muted">{formatDate(r.created_at)}</span></div></div>
              <p className="mt-1 text-muted">on {prod ? <Link href={`/product/${prod.slug}`} className="underline">{prod.name}</Link> : 'a deleted product'}</p>
              {r.title && <p className="mt-2 font-bold">{r.title}</p>}<p className="mt-1 leading-6">{r.body}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {r.status !== 'approved' && <ActionForm action={moderateReviewAction} submit="Approve" small><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="approved" /></ActionForm>}
                {r.status !== 'rejected' && <ActionForm action={moderateReviewAction} submit="Reject" small submitClassName="btn btn-outline h-9 px-4 text-[13px]"><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="rejected" /></ActionForm>}
                <ActionForm action={deleteReviewAction} submit="Delete" danger small confirm="Delete this review permanently?"><input type="hidden" name="id" value={r.id} /></ActionForm>
              </div>
            </li>
          );
        })}
        {(data ?? []).length === 0 && <li className="rounded-2xl bg-white p-8 text-center text-[13px] text-muted">No reviews here.</li>}
      </ul>
    </div>
  );
}
