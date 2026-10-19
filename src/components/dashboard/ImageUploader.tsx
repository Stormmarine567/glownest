'use client';
import { useRef, useState } from 'react';
import { ImageIcon, Trash2, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

/**
 * Uploads straight to Supabase Storage with the signed-in user's session — storage RLS decides who may write
 * to which bucket, so this is safe to render anywhere. The resulting public URL is submitted via a hidden input.
 */
export function ImageUploader({ name, bucket, folder = '', initialUrl = '', label = 'Upload image', fallbackNote, onChange }: {
  name: string; bucket: 'branding' | 'product-images' | 'content' | 'avatars'; folder?: string; initialUrl?: string | null; label?: string; fallbackNote?: string; onChange?: (url: string) => void;
}) {
  const [url, setUrlState] = useState(initialUrl ?? '');
  const setUrl = (u: string) => { setUrlState(u); onChange?.(u); };
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setErr('');
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'].includes(f.type)) return setErr('Use a PNG, JPG, WebP, SVG or ICO image.');
    if (f.size > 5 * 1024 * 1024) return setErr('Image must be under 5 MB.');
    setBusy(true);
    const ext = (f.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${folder ? `${folder}/` : ''}${crypto.randomUUID()}.${ext}`;
    const sb = createClient();
    const { error } = await sb.storage.from(bucket).upload(path, f, { contentType: f.type, upsert: false });
    setBusy(false);
    if (error) return setErr('Upload failed — you may not have permission, or the file type is not allowed.');
    setUrl(sb.storage.from(bucket).getPublicUrl(path).data.publicUrl);
  }

  return (
    <div>
      <input type="hidden" name={name} value={url} />
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-28 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#C3CCDD] bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {url ? <img src={url} alt="" className="h-full w-full object-contain" /> : <ImageIcon className="h-6 w-6 text-muted" />}
        </div>
        <div className="flex flex-col items-start gap-2">
          <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="btn btn-outline h-9 px-4 text-[13px]"><Upload className="h-3.5 w-3.5" />{busy ? 'Uploading…' : url ? 'Replace' : label}</button>
          {url && <button type="button" onClick={() => setUrl('')} className="flex items-center gap-1 text-[12px] text-red-600"><Trash2 className="h-3 w-3" />Remove</button>}
        </div>
      </div>
      {fallbackNote && !url && <p className="mt-2 text-[12px] text-muted">{fallbackNote}</p>}
      {err && <p role="alert" className="mt-2 text-[12px] text-red-600">{err}</p>}
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon" className="hidden" onChange={pick} />
    </div>
  );
}
