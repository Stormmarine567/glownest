'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Stars } from '../Stars';
import { StatusBadge } from './StatusBadge';
import { formatDate } from '@/lib/utils';

interface R { id: string; rating: number; title: string | null; body: string; status: string; created_at: string; products: { name: string; slug: string } | null }

export function MyReviews({ reviews }: { reviews: R[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [rating, setRating] = useState(5); const [title, setTitle] = useState(''); const [body, setBody] = useState('');
  const [msg, setMsg] = useState('');
  function start(r: R) { setEditing(r.id); setRating(r.rating); setTitle(r.title ?? ''); setBody(r.body); setMsg(''); }
  async function save(id: string) {
    const { error } = await createClient().from('reviews').update({ rating, title: title.trim() || null, body: body.trim() }).eq('id', id);
    if (error) return setMsg('Could not save your changes.');
    setEditing(null); router.refresh();
  }
  async function del(id: string) {
    if (!window.confirm('Delete this review?')) return;
    const { error } = await createClient().from('reviews').delete().eq('id', id);
    if (!error) router.refresh(); else setMsg('Could not delete the review.');
  }
  if (reviews.length === 0) return <p className="text-[14px] text-muted">You have not written any reviews yet. After your order is paid you can review products from their page.</p>;
  return (
    <ul className="divide-y divide-line">
      {reviews.map((r) => (
        <li key={r.id} className="py-4">
          <div className="flex items-center justify-between gap-3"><Link href={`/product/${r.products?.slug}`} className="font-serif text-[16px] font-bold">{r.products?.name}</Link><span className="flex items-center gap-2"><StatusBadge value={r.status} /><time className="text-[12px] text-muted">{formatDate(r.created_at)}</time></span></div>
          {editing === r.id ? (
            <div className="mt-3 space-y-3">
              <div className="flex gap-1">{[1, 2, 3, 4, 5].map((i) => <button key={i} type="button" aria-label={`${i} stars`} onClick={() => setRating(i)}><Star className={`h-6 w-6 ${i <= rating ? 'fill-star text-star' : 'fill-[#E2E7F0] text-[#E2E7F0]'}`} strokeWidth={0} /></button>)}</div>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" maxLength={120} aria-label="Title" />
              <textarea className="textarea min-h-[90px]" value={body} onChange={(e) => setBody(e.target.value)} maxLength={3000} aria-label="Review" />
              <div className="flex gap-2"><button onClick={() => save(r.id)} className="btn btn-primary h-9 px-4 text-[13px]">Save</button><button onClick={() => setEditing(null)} className="btn btn-outline h-9 px-4 text-[13px]">Cancel</button></div>
            </div>
          ) : (
            <>
              <div className="mt-2"><Stars value={r.rating} className="h-4 w-4" /></div>
              {r.title && <p className="mt-2 text-[14px] font-medium">{r.title}</p>}
              <p className="mt-1 text-[13px] leading-6 text-muted">{r.body}</p>
              <div className="mt-3 flex gap-3 text-[12px]"><button onClick={() => start(r)} className="font-bold underline">Edit</button><button onClick={() => del(r.id)} className="text-red-600 underline">Delete</button></div>
            </>
          )}
        </li>
      ))}
      {msg && <li role="alert" className="py-3 text-[13px] text-red-600">{msg}</li>}
    </ul>
  );
}
