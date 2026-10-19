'use client';
import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Trash2, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export interface ImgItem { url: string; alt: string }

/** Multi-image uploader (product gallery). Serialised into a hidden JSON input; first image is the main one. */
export function ImageListEditor({ name, bucket = 'product-images', folder = '', initial }: { name: string; bucket?: 'product-images' | 'content'; folder?: string; initial: ImgItem[] }) {
  const [items, setItems] = useState<ImgItem[]>(initial);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []); e.target.value = ''; setErr('');
    if (!files.length) return;
    setBusy(true);
    const sb = createClient(); const added: ImgItem[] = [];
    for (const f of files) {
      if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(f.type) || f.size > 5 * 1024 * 1024) { setErr('Use PNG, JPG, WebP or SVG images under 5 MB.'); continue; }
      const ext = (f.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = `${folder ? `${folder}/` : ''}${crypto.randomUUID()}.${ext}`;
      const { error } = await sb.storage.from(bucket).upload(path, f, { contentType: f.type });
      if (error) { setErr('Upload failed — check your permissions.'); continue; }
      added.push({ url: sb.storage.from(bucket).getPublicUrl(path).data.publicUrl, alt: '' });
    }
    setItems((l) => [...l, ...added]); setBusy(false);
  }
  const move = (i: number, d: number) => setItems((l) => { const n = [...l]; const j = i + d; if (j < 0 || j >= n.length) return l; [n[i], n[j]] = [n[j], n[i]]; return n; });
  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(items)} />
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((it, i) => (
          <li key={it.url} className="flex gap-3 rounded-xl border border-line p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.url} alt="" className="h-20 w-20 shrink-0 rounded-lg bg-tint object-cover" />
            <div className="min-w-0 flex-1">
              <input aria-label="Alt text" className="input h-9 text-[12px]" placeholder="Alt text" value={it.alt} onChange={(e) => setItems((l) => l.map((x, k) => (k === i ? { ...x, alt: e.target.value } : x)))} />
              <div className="mt-2 flex items-center gap-1 text-[11px] text-muted">{i === 0 && <b className="mr-1 text-ink">Main</b>}
                <button type="button" aria-label="Move up" onClick={() => move(i, -1)} className="rounded p-1 hover:bg-tint"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" aria-label="Move down" onClick={() => move(i, 1)} className="rounded p-1 hover:bg-tint"><ArrowDown className="h-3.5 w-3.5" /></button>
                <button type="button" aria-label="Remove image" onClick={() => setItems((l) => l.filter((_, k) => k !== i))} className="ml-auto rounded p-1 text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="btn btn-outline mt-3 h-9 px-4 text-[13px]"><Upload className="h-3.5 w-3.5" />{busy ? 'Uploading…' : 'Add images'}</button>
      {err && <p role="alert" className="mt-2 text-[12px] text-red-600">{err}</p>}
      <input ref={ref} type="file" multiple accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={pick} />
    </div>
  );
}
