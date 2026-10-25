import { PageHero } from './PageHero';

interface PageData { title: string; summary?: string | null; body: { sections?: { heading: string; body: string }[] }; updated_at?: string }

/** Renders an admin-editable page. Section bodies are plain text (never HTML) so edited content cannot inject markup. */
export function PageSections({ page, eyebrow, children }: { page: PageData; eyebrow: string; children?: React.ReactNode }) {
  return (
    <>
      <PageHero eyebrow={eyebrow} title={page.title} text={page.summary ?? undefined} />
      <section className="py-12 md:py-[64px]">
        <div className="container max-w-[760px]">
          <div className="space-y-9">
            {(page.body.sections ?? []).map((s) => (
              <div key={s.heading}>
                <h2 className="text-[22px]">{s.heading}</h2>
                {s.body.split(/\n{2,}/).map((para, i) => <p key={i} className="mt-3 text-[15px] leading-8 text-[#4B5A73]">{para}</p>)}
              </div>
            ))}
          </div>
          {children}
          {page.updated_at && <p className="mt-12 border-t border-line pt-5 text-[12px] text-muted">Last updated {new Date(page.updated_at).toLocaleDateString('en-US', { dateStyle: 'long' })}</p>}
        </div>
      </section>
    </>
  );
}
