'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function WishlistButton({ productId, userId, initial }: { productId: string; userId: string | null; initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  if (!userId) return <Link href="/login" aria-label="Sign in to save to wishlist" className="flex h-12 w-12 items-center justify-center rounded-full border border-line transition hover:border-navy"><Heart className="h-5 w-5" strokeWidth={1.6} /></Link>;
  async function toggle() {
    setBusy(true);
    const sb = createClient();
    const { error } = on ? await sb.from('wishlists').delete().eq('product_id', productId).eq('user_id', userId!) : await sb.from('wishlists').insert({ product_id: productId, user_id: userId });
    if (!error) setOn(!on);
    setBusy(false);
  }
  return (
    <button type="button" onClick={toggle} disabled={busy} aria-pressed={on} aria-label={on ? 'Remove from wishlist' : 'Add to wishlist'} className="flex h-12 w-12 items-center justify-center rounded-full border border-line transition hover:scale-105 hover:border-navy active:scale-95">
      <Heart className={`h-5 w-5 transition ${on ? 'fill-red-500 text-red-500' : ''}`} strokeWidth={1.6} />
    </button>
  );
}
