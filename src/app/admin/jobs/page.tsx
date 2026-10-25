import Link from 'next/link';
import { ActionForm } from '@/components/dashboard/ActionForm';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { deleteJobAction, saveJobAction } from '../content/actions';

export const metadata = { title: 'Job openings' };
export const dynamic = 'force-dynamic';

type Job = { id: string; title: string; department: string | null; location: string | null; employment_type: string | null; description: string; how_to_apply: string | null; is_open: boolean };
function Fields({ j }: { j?: Job }) {
  return (<>{j && <input type="hidden" name="id" value={j.id} />}
    <div className="grid gap-3 md:grid-cols-2"><div><label className="label">Title</label><input name="title" required defaultValue={j?.title} className="input" /></div><div><label className="label">Department</label><input name="department" defaultValue={j?.department ?? ''} className="input" /></div>
      <div><label className="label">Location</label><input name="location" defaultValue={j?.location ?? ''} className="input" /></div><div><label className="label">Type</label><input name="employment_type" placeholder="Full-time" defaultValue={j?.employment_type ?? ''} className="input" /></div></div>
    <div className="mt-3"><label className="label">Description</label><textarea name="description" required defaultValue={j?.description} className="textarea min-h-[90px]" /></div>
    <div className="mt-3"><label className="label">How to apply</label><input name="how_to_apply" defaultValue={j?.how_to_apply ?? ''} className="input" /></div>
    <label className="mt-3 flex items-center gap-2 text-[13px]"><input type="checkbox" name="is_open" defaultChecked={j?.is_open ?? true} />Open for applications</label></>);
}

export default async function AdminJobs() {
  await requireAdmin('content');
  const { data } = await (await createClient()).from('job_postings').select('*').order('created_at', { ascending: false });
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h2 className="text-[26px]">Job openings</h2><Link href="/admin/pages" className="text-[13px] underline">← Pages</Link></div>
      <ActionForm action={saveJobAction} submit="Add job" resetOnSuccess className="rounded-2xl bg-white p-5 shadow-soft md:p-6"><h3 className="mb-3 text-[18px]">Add an opening</h3><Fields /></ActionForm>
      {(data ?? []).map((j) => (
        <div key={j.id} className="rounded-2xl bg-white p-5 shadow-soft md:p-6"><ActionForm action={saveJobAction} submit="Save" small><Fields j={j as Job} /></ActionForm>
          <ActionForm action={deleteJobAction} submit="Delete" danger small confirm="Delete this job?" className="mt-2"><input type="hidden" name="id" value={j.id} /></ActionForm></div>
      ))}
    </div>
  );
}
