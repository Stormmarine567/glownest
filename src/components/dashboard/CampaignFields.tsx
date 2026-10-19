'use client';
import { useState } from 'react';
import { ImageUploader } from './ImageUploader';
import { sendTestAction } from '@/app/admin/newsletter/actions';

export function CampaignFields({ initial, locked }: { initial: { subject: string; preheader: string; banner_url: string; body_html: string; scheduled_at: string }; locked: boolean }) {
  const [body, setBody] = useState(initial.body_html);
  const [banner, setBanner] = useState(initial.banner_url);
  const [when, setWhen] = useState(initial.scheduled_at ? toLocal(initial.scheduled_at) : '');
  const [test, setTest] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendTest(e: React.MouseEvent<HTMLButtonElement>) {
    const form = e.currentTarget.closest('form');
    if (!form) return;
    setBusy(true); setTest(null);
    const fd = new FormData(form);
    setTest(await sendTestAction(null, fd));
    setBusy(false);
  }
  const preview = `<body style="font-family:Arial,sans-serif;color:#1B2A4A;line-height:1.6;padding:16px;margin:0">${banner ? `<img src="${banner}" style="width:100%;display:block;margin:0 0 16px">` : ''}${body}</body>`;
  return (
    <div className="space-y-5">
      <fieldset disabled={locked} className="space-y-5">
        <div><label className="label" htmlFor="subject">Subject</label><input id="subject" name="subject" required defaultValue={initial.subject} maxLength={200} className="input" /></div>
        <div><label className="label" htmlFor="preheader">Preview text</label><input id="preheader" name="preheader" defaultValue={initial.preheader} maxLength={200} className="input" /></div>
        <div><span className="label">Banner image</span><ImageUploader name="banner_url" bucket="content" folder="newsletter" initialUrl={initial.banner_url} label="Upload banner" onChange={setBanner} /></div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div><label className="label" htmlFor="body_html">Content (HTML)</label><textarea id="body_html" name="body_html" required value={body} onChange={(e) => setBody(e.target.value)} className="textarea min-h-[320px] font-mono text-[12px]" spellCheck={false} />
            <p className="mt-1 text-[11px] text-muted">Use simple HTML: &lt;h2&gt;, &lt;p&gt;, &lt;a href&gt;, &lt;ul&gt;. The branded header, your banner and the unsubscribe footer are added automatically.</p></div>
          <div><span className="label">Preview</span><iframe title="Email preview" sandbox="" srcDoc={preview} className="h-[320px] w-full rounded-xl border border-line bg-white" /></div>
        </div>
        <div className="max-w-xs"><label className="label" htmlFor="when">Schedule for</label><input id="when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="input" /><input type="hidden" name="scheduled_at" value={when ? new Date(when).toISOString() : ''} /></div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={sendTest} disabled={busy} className="btn btn-outline h-10 px-4 text-[13px]">{busy ? 'Sending…' : 'Send test to me'}</button>{test && <span role="status" className={`text-[13px] ${test.ok ? 'text-green-700' : 'text-red-600'}`}>{test.message}</span>}</div>
    </div>
  );
}
function toLocal(iso: string) { const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }
