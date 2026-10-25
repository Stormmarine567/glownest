export function PageHero({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <section className="bg-tint">
      <div className="container flex min-h-[220px] flex-col items-center justify-center py-12 text-center md:min-h-[300px]">
        <p className="eyebrow animate-fadeUp">/ {eyebrow}</p>
        <h1 className="mt-2 animate-fadeUp text-[34px] leading-tight md:text-[52px]" style={{ animationDelay: '60ms' }}>{title}</h1>
        {text && <p className="mt-4 max-w-[430px] animate-fadeUp text-[15px] leading-7 text-muted md:text-[16px]" style={{ animationDelay: '120ms' }}>{text}</p>}
      </div>
    </section>
  );
}
