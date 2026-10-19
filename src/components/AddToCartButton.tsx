'use client';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useCart } from './CartProvider';

export function AddToCartButton({ productId, soldOut, extra }: { productId: string; soldOut?: boolean; extra?: React.ReactNode }) {
  const { add } = useCart();
  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <button type="button" disabled={soldOut} onClick={() => add(productId)} className="btn btn-primary h-[48px] px-6 font-bold">
        <Plus className="h-4 w-4" />{soldOut ? 'Sold out' : 'Add to Cart'}
      </button>
      <Link href="/shop" className="btn btn-outline h-[48px] px-6 font-medium">Continue Shopping</Link>
      {extra}
    </div>
  );
}
