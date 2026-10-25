import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm } from '@/components/dashboard/ActionForm';
import { JsonEditor } from '@/components/dashboard/JsonEditor';
import { requireAdmin } from '@/lib/auth';
import defaults from '@/lib/default-content.json';
import { createClient } from '@/lib/supabase/server';
import { resetContentAction, saveContentAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function ContentEditor({ params }: { params: Promise<{ key: string }> }) {
  await requireAdmin('content');
  const { key } = await params;
  const base = (defaults.content as Record<string, unknown>)[key];
  if (!base) notFound();
  const { data } = await (await createClient()).from('site_content').select('data').eq('key', key).maybeSingle();
  const edited = Boolean(data);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h2 className="text-[26px] capitalize">{key.replace(/_/g, ' ')}</h2><Link href="/admin/content" className="text-[13px] underline">← All content</Link></div>
      <ActionForm action={saveContentAction} submit="Save changes" className="rounded-2xl bg-white p-5 shadow-soft md:p-6"><input type="hidden" name="key" value={key} /><JsonEditor name="data" initial={(data?.data ?? base) as never} /></ActionForm>
      {edited && <ActionForm action={resetContentAction} submit="Restore original text" small confirm="Discard your edits and restore the original text?" submitClassName="btn btn-outline h-10 px-4 text-[13px]"><input type="hidden" name="key" value={key} /></ActionForm>}
    </div>
  );
}
