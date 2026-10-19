import Link from 'next/link';
import { ActionForm } from '@/components/dashboard/ActionForm';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { deleteFaqAction, saveFaqAction } from '../content/actions';

export const metadata = { title: 'FAQs' };
export const dynamic = 'force-dynamic';

function Fields({ f }: { f?: { id: string; category: string; question: string; answer: string; sort_order: number; is_published: boolean } }) {
  return (<>{f && <input type="hidden" name="id" value={f.id} />}
    <div className="grid gap-3 md:grid-cols-[1fr_100px]"><div><label className="label">Category</label><input name="category" defaultValue={f?.category ?? 'General'} className="input" /></div><div><label className="label">Order</label><input name="sort_order" inputMode="numeric" defaultValue={f?.sort_order ?? 0} className="input" /></div></div>
    <div className="mt-3"><label className="label">Question</label><input name="question" required defaultValue={f?.question} className="input" /></div>
    <div className="mt-3"><label className="label">Answer</label><textarea name="answer" required defaultValue={f?.answer} className="textarea min-h-[80px]" /></div>
    <label className="mt-3 flex items-center gap-2 text-[13px]"><input type="checkbox" name="is_published" defaultChecked={f?.is_published ?? true} />Published</label></>);
}

export default async function AdminFaqs() {
  await requireAdmin('content');
  const { data } = await (await createClient()).from('faqs').select('*').order('category').order('sort_order');
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h2 className="text-[26px]">FAQs</h2><Link href="/admin/pages" className="text-[13px] underline">← Pages</Link></div>
      <ActionForm action={saveFaqAction} submit="Add FAQ" resetOnSuccess className="rounded-2xl bg-white p-5 shadow-soft md:p-6"><h3 className="mb-3 text-[18px]">Add a question</h3><Fields /></ActionForm>
      {(data ?? []).map((f) => (
        <div key={f.id} className="rounded-2xl bg-white p-5 shadow-soft md:p-6">
          <ActionForm action={saveFaqAction} submit="Save" small><Fields f={f} /></ActionForm>
          <ActionForm action={deleteFaqAction} submit="Delete" danger small confirm="Delete this FAQ?" className="mt-2"><input type="hidden" name="id" value={f.id} /></ActionForm>
        </div>
      ))}
    </div>
  );
}
