'use client';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

export interface VariantRow { id?: string; name: string; sku: string; price: string; stock: string }

export function VariantsEditor({ name, initial }: { name: string; initial: VariantRow[] }) {
  const [rows, setRows] = useState<VariantRow[]>(initial);
  const set = (i: number, k: keyof VariantRow, v: string) => setRows((l) => l.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
      {rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_90px_80px_auto] items-center gap-2">
              <input aria-label="Variant name" className="input h-10" placeholder="e.g. 50ml" value={r.name} onChange={(e) => set(i, 'name', e.target.value)} />
              <input aria-label="Variant SKU" className="input h-10" placeholder="SKU" value={r.sku} onChange={(e) => set(i, 'sku', e.target.value)} />
              <input aria-label="Variant price" className="input h-10" placeholder="Price" inputMode="decimal" value={r.price} onChange={(e) => set(i, 'price', e.target.value)} />
              <input aria-label="Variant stock" className="input h-10" placeholder="Stock" inputMode="numeric" value={r.stock} onChange={(e) => set(i, 'stock', e.target.value)} />
              <button type="button" aria-label="Remove variant" onClick={() => setRows((l) => l.filter((_, j) => j !== i))} className="rounded p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <p className="text-[11px] text-muted">Leave price empty to use the product price.</p>
        </div>
      )}
      <button type="button" onClick={() => setRows((l) => [...l, { name: '', sku: '', price: '', stock: '0' }])} className="btn btn-outline mt-3 h-9 px-4 text-[13px]"><Plus className="h-3.5 w-3.5" />Add variant</button>
    </div>
  );
}
