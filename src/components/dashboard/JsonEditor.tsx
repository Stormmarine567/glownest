'use client';
import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { ImageUploader } from './ImageUploader';

type J = string | number | boolean | null | J[] | { [k: string]: J };

const pretty = (k: string) => k.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const isImageKey = (k: string) => /(image|logo|cover|photo|banner|avatar)/i.test(k);
const blank = (v: J): J => (Array.isArray(v) ? v.map(blank) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, blank(x)])) : typeof v === 'number' ? 0 : typeof v === 'boolean' ? false : '');

function Node({ label, value, onChange }: { label: string; value: J; onChange: (v: J) => void }) {
  if (typeof value === 'string' || value === null) {
    const s = value ?? '';
    if (isImageKey(label)) return <div><span className="label">{pretty(label)}</span><ImageUploader name="" bucket="content" folder="site" initialUrl={s} onChange={onChange} /><input aria-label={`${pretty(label)} URL`} className="input mt-2 h-9 text-[12px]" placeholder="…or paste an image URL / path" value={s} onChange={(e) => onChange(e.target.value)} /></div>;
    const long = s.length > 70 || s.includes('\n') || /(text|body|description|answer|message)$/i.test(label);
    return <div><label className="label">{pretty(label)}</label>{long ? <textarea className="textarea min-h-[90px]" value={s} onChange={(e) => onChange(e.target.value)} /> : <input className="input" value={s} onChange={(e) => onChange(e.target.value)} />}</div>;
  }
  if (typeof value === 'number') return <div><label className="label">{pretty(label)}</label><input type="number" className="input" value={value} onChange={(e) => onChange(Number(e.target.value))} /></div>;
  if (typeof value === 'boolean') return <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />{pretty(label)}</label>;
  if (Array.isArray(value)) {
    const move = (i: number, d: number) => { const n = [...value]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
    return (
      <div><span className="label">{pretty(label)}</span>
        <div className="space-y-3">
          {value.map((it, i) => (
            <div key={i} className="rounded-xl border border-line bg-tint-soft p-3">
              <div className="mb-2 flex items-center justify-between text-[11px] text-muted"><span>#{i + 1}</span>
                <span className="flex gap-1"><button type="button" aria-label="Move up" onClick={() => move(i, -1)} className="rounded p-1 hover:bg-white"><ArrowUp className="h-3.5 w-3.5" /></button><button type="button" aria-label="Move down" onClick={() => move(i, 1)} className="rounded p-1 hover:bg-white"><ArrowDown className="h-3.5 w-3.5" /></button><button type="button" aria-label="Remove item" onClick={() => onChange(value.filter((_, k) => k !== i))} className="rounded p-1 text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button></span></div>
              <Node label={label.replace(/s$/, '')} value={it} onChange={(v) => onChange(value.map((x, k) => (k === i ? v : x)))} />
            </div>
          ))}
        </div>
        <button type="button" onClick={() => onChange([...value, value.length ? blank(value[0]) : ''])} className="btn btn-outline mt-2 h-9 px-4 text-[12px]"><Plus className="h-3.5 w-3.5" />Add</button>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {Object.entries(value).map(([k, v]) => (
        <div key={k} className={typeof v === 'object' && v !== null && !Array.isArray(v) ? 'rounded-xl border border-line p-3' : ''}>
          {typeof v === 'object' && v !== null && !Array.isArray(v) && <p className="mb-2 text-[12px] font-bold uppercase tracking-wider text-muted">{pretty(k)}</p>}
          <Node label={k} value={v} onChange={(nv) => onChange({ ...value, [k]: nv })} />
        </div>
      ))}
    </div>
  );
}

/** Generic structured editor for site content. Serialises to a hidden JSON input; the server validates and stores it. */
export function JsonEditor({ name, initial }: { name: string; initial: J }) {
  const [v, setV] = useState<J>(initial);
  return <div><input type="hidden" name={name} value={JSON.stringify(v)} /><Node label="" value={v} onChange={setV} /></div>;
}
