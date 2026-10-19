'use client';
import { useActionState, useEffect, useRef } from 'react';
import type { ActionState } from '@/lib/action-types';

/** Wraps a server action with pending state, inline success/error feedback, optional confirmation and reset. */
export function ActionForm({ action, children, submit, className = '', resetOnSuccess = false, confirm, danger = false, small = false, submitClassName }: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children?: React.ReactNode; submit: string; className?: string; resetOnSuccess?: boolean; confirm?: string; danger?: boolean; small?: boolean; submitClassName?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok && resetOnSuccess) ref.current?.reset(); }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className} onSubmit={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }}>
      {children}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button disabled={pending} className={submitClassName ?? `btn ${danger ? 'bg-red-600 text-white hover:bg-red-700' : 'btn-primary'} ${small ? 'h-9 px-4 text-[13px]' : 'h-11'}`}>{pending ? 'Working…' : submit}</button>
        {state && <p role="status" className={`text-[13px] ${state.ok ? 'text-green-700' : 'text-red-600'}`}>{state.message}</p>}
      </div>
    </form>
  );
}
