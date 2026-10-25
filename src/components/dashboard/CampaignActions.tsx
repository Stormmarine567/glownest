'use client';
import { useActionState } from 'react';
import { saveCampaignAction } from '@/app/admin/newsletter/actions';

/** Three submit intents share one form so the same fields are validated server-side every time. */
export function CampaignForm({ id, locked, children }: { id?: string; locked: boolean; children: React.ReactNode }) {
  const [state, action, pending] = useActionState(saveCampaignAction, null);
  return (
    <form action={action} className="rounded-2xl bg-white p-5 shadow-soft md:p-6" onSubmit={(e) => {
      const intent = ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value;
      if (intent === 'now' && !window.confirm('Send this campaign to all subscribers now?')) e.preventDefault();
    }}>
      <input type="hidden" name="id" value={id ?? ''} />
      {children}
      {!locked && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button name="intent" value="draft" disabled={pending} className="btn btn-outline h-11 px-5">Save draft</button>
          <button name="intent" value="schedule" disabled={pending} className="btn btn-outline h-11 px-5">Schedule</button>
          <button name="intent" value="now" disabled={pending} className="btn btn-primary h-11 px-5">Send now</button>
          {state && <p role="status" className={`text-[13px] ${state.ok ? 'text-green-700' : 'text-red-600'}`}>{state.message}</p>}
        </div>
      )}
    </form>
  );
}
