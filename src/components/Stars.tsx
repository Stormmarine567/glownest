import { Star } from 'lucide-react';

export function Stars({ value = 5, className = 'h-3 w-3' }: { value?: number; className?: string }) {
  return (
    <span className="inline-flex" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${className} ${i <= Math.round(value) ? 'fill-star text-star' : 'fill-[#E2E7F0] text-[#E2E7F0]'}`} strokeWidth={0} />
      ))}
    </span>
  );
}
