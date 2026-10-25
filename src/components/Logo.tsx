import Link from 'next/link';

export function Logo({ name = 'GLOWNEST', tagline = 'SKINCARE', logoUrl, light = false, size = 'md' }: {
  name?: string; tagline?: string; logoUrl?: string | null; light?: boolean; size?: 'md' | 'lg';
}) {
  const color = light ? 'text-white' : 'text-navy';
  return (
    <Link href="/" aria-label={`${name} home`} className="inline-block leading-none">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={name} className={size === 'lg' ? 'h-12 w-auto' : 'h-9 w-auto md:h-10'} />
      ) : (
        <>
          <span className={`block font-serif font-bold tracking-[0.01em] ${color} ${size === 'lg' ? 'text-[28px]' : 'text-[22px] md:text-[26px]'}`}>
            {name.toUpperCase()}
          </span>
          <span className={`mt-1 block text-[9px] tracking-[0.32em] ${light ? 'text-white/60' : 'text-muted'}`}>{tagline.toUpperCase()}</span>
        </>
      )}
    </Link>
  );
}
