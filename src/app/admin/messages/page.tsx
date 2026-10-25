import { ActionForm } from '@/components/dashboard/ActionForm';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import { setHandledAction } from './actions';

export const metadata = { title: 'Messages' };
export const dynamic = 'force-dynamic';

export default async function AdminMessages() {
  await requireAdmin('customers');
  const { data } = await (await createClient()).from('contact_messages').select('*').order('created_at', { ascending: false }).limit(100);
  return (
    <div>
      <h2 className="mb-5 text-[26px]">Contact messages</h2>
      <ul className="space-y-3">
        {(data ?? []).map((m) => (
          <li key={m.id} className={`rounded-2xl bg-white p-5 shadow-soft text-[13px] ${m.handled ? 'opacity-70' : ''}`}>
            <div className="flex flex-wrap justify-between gap-2"><div><b>{m.name}</b> · <a className="underline" href={`mailto:${m.email}?subject=${encodeURIComponent('Re: ' + (m.subject ?? 'Your message'))}`}>{m.email}</a></div><span className="text-muted">{formatDate(m.created_at, { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
            {m.subject && <p className="mt-2 font-bold">{m.subject}</p>}<p className="mt-1 whitespace-pre-wrap leading-6">{m.message}</p>
            <ActionForm action={setHandledAction} submit={m.handled ? 'Mark as open' : 'Mark as handled'} small submitClassName="btn btn-outline mt-3 h-9 px-4 text-[13px]"><input type="hidden" name="id" value={m.id} /><input type="hidden" name="handled" value={String(!m.handled)} /></ActionForm>
          </li>
        ))}
        {(data ?? []).length === 0 && <li className="rounded-2xl bg-white p-8 text-center text-[13px] text-muted">No messages yet.</li>}
      </ul>
    </div>
  );
}
