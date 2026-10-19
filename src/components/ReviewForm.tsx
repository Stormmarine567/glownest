'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star, Upload, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function ReviewForm({ productId, userId, defaultName }: { productId: string; userId: string | null; defaultName: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState(defaultName);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!userId) {
    return (
      <div className="rounded-[20px] bg-tint-soft p-6 md:p-6">
        <h3 className="text-[18px]">Write a Review</h3>
        <p className="mt-3 text-[14px] leading-6 text-muted">Sign in to share your experience. Reviews are open to customers who have purchased this product.</p>
        <Link href={`/login?next=${encodeURIComponent(typeof window === 'undefined' ? '/shop' : window.location.pathname)}`} className="btn btn-primary mt-5 w-full">Sign in to review</Link>
      </div>
    );
  }

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []).filter((f) => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type) && f.size <= 3 * 1024 * 1024);
    setFiles((prev) => [...prev, ...list].slice(0, 3));
    e.target.value = '';
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (body.trim().length < 5) return setMsg({ ok: false, text: 'Please write a little more about your experience.' });
    setBusy(true);
    try {
      const sb = createClient();
      const urls: string[] = [];
      for (const f of files) {
        const ext = f.type === 'image/png' ? 'png' : f.type === 'image/webp' ? 'webp' : 'jpg';
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const up = await sb.storage.from('review-images').upload(path, f, { contentType: f.type });
        if (up.error) throw new Error('Photo upload failed. Please try smaller images.');
        urls.push(sb.storage.from('review-images').getPublicUrl(path).data.publicUrl);
      }
      const { error } = await sb.from('reviews').insert({
        product_id: productId, user_id: userId, rating, display_name: name.trim() || 'Customer',
        title: title.trim() || null, body: body.trim(), images: urls,
      });
      if (error) {
        if (error.code === '23505') throw new Error('You have already reviewed this product. You can edit your review from your dashboard.');
        if (error.code === '42501') throw new Error('Only customers who purchased and paid for this product can review it.');
        throw new Error('Could not submit your review.');
      }
      setMsg({ ok: true, text: 'Thank you! Your review has been posted.' });
      setTitle(''); setBody(''); setFiles([]);
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="rounded-[20px] bg-tint-soft p-6" noValidate>
      <h3 className="text-[18px]">Write a Review</h3>
      <div className="mt-5">
        <span className="label">Your Rating</span>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} type="button" role="radio" aria-checked={rating === i} aria-label={`${i} star${i > 1 ? 's' : ''}`}
              onClick={() => setRating(i)} onMouseEnter={() => setHover(i)} className="transition hover:scale-110">
              <Star className={`h-[26px] w-[26px] ${i <= (hover || rating) ? 'fill-star text-star' : 'fill-[#E2E7F0] text-[#E2E7F0]'}`} strokeWidth={0} />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4"><label className="label" htmlFor="rv-name">Name</label><input id="rv-name" className="input h-[42px] rounded-lg" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></div>
      <div className="mt-4"><label className="label" htmlFor="rv-title">Title</label><input id="rv-title" className="input h-[42px] rounded-lg" placeholder="Summarize your experience" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></div>
      <div className="mt-4"><label className="label" htmlFor="rv-body">Review</label><textarea id="rv-body" className="textarea min-h-[100px] rounded-lg" placeholder="Share your experience with this product..." value={body} onChange={(e) => setBody(e.target.value)} maxLength={3000} /></div>
      <div className="mt-4">
        <span className="label">Add Photos</span>
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div key={i} className="relative h-16 w-16 overflow-hidden rounded-xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
              <button type="button" aria-label="Remove photo" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute right-0.5 top-0.5 rounded-full bg-white/90 p-0.5"><X className="h-3 w-3" /></button>
            </div>
          ))}
          {files.length < 3 && (
            <button type="button" onClick={() => fileRef.current?.click()} aria-label="Upload photo"
              className="flex h-16 w-16 items-center justify-center rounded-xl border-[1.5px] border-dashed border-[#C3CCDD] text-muted transition hover:border-navy hover:text-navy">
              <Upload className="h-4 w-4" />
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={pick} />
        </div>
      </div>
      {msg && <p role="status" className={`mt-4 text-[13px] ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}
      <button type="submit" disabled={busy} className="btn btn-primary mt-5 h-11 w-full rounded-xl font-bold">{busy ? 'Submitting…' : 'Submit Review'}</button>
    </form>
  );
}
