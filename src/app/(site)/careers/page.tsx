import { notFound } from 'next/navigation';
import { MapPin } from 'lucide-react';
import { PageSections } from '@/components/PageSections';
import { getJobs, getPage } from '@/lib/data';

export const metadata = { title: 'Careers' };

export default async function CareersPage() {
  const [page, jobs] = await Promise.all([getPage('careers'), getJobs()]);
  if (!page) notFound();
  return (
    <PageSections page={page} eyebrow="CAREERS">
      <h2 className="mt-12 text-[22px]">Open roles</h2>
      {jobs.length === 0 ? <p className="mt-3 text-[15px] text-muted">No open roles right now — but we always love to hear from talented people.</p> : (
        <ul className="mt-5 space-y-4">
          {jobs.map((j: { id: string; title: string; department: string; location: string; employment_type: string; description: string; how_to_apply: string }) => (
            <li key={j.id} className="rounded-2xl border border-line p-6">
              <h3 className="text-[18px]">{j.title}</h3>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[12px] text-muted">{j.department}<span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{j.location}</span>{j.employment_type}</p>
              <p className="mt-3 text-[14px] leading-7 text-[#4B5A73]">{j.description}</p>
              {j.how_to_apply && <p className="mt-3 text-[13px] font-medium text-ink">{j.how_to_apply}</p>}
            </li>
          ))}
        </ul>
      )}
    </PageSections>
  );
}
