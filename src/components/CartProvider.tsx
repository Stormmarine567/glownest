'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { CartLine } from '@/lib/types';

interface CartCtx {
  lines: CartLine[];
  count: number;
  add: (productId: string, quantity?: number, variantId?: string | null) => void;
  setQuantity: (productId: string, quantity: number, variantId?: string | null) => void;
  remove: (productId: string, variantId?: string | null) => void;
  clear: () => void;
  notify: (message: string) => void;
}

const Ctx = createContext<CartCtx | null>(null);
const KEY = 'glownest_cart_v1';
const same = (l: CartLine, p: string, v?: string | null) => l.productId === p && (l.variantId ?? null) === (v ?? null);

export function CartProvider({ children, isAuthed }: { children: ReactNode; isAuthed: boolean }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Load from this browser; for signed-in users also merge the cart saved on their account.
  useEffect(() => {
    let local: CartLine[] = [];
    try { local = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { /* ignore */ }
    setLines(local);
    if (!isAuthed) { setReady(true); return; }
    fetch('/api/cart').then((r) => (r.ok ? r.json() : { lines: [] })).then(({ lines: remote }: { lines: CartLine[] }) => {
      const merged = [...local];
      for (const r of remote ?? []) {
        const hit = merged.find((l) => same(l, r.productId, r.variantId));
        if (hit) hit.quantity = Math.max(hit.quantity, r.quantity); else merged.push(r);
      }
      setLines(merged);
    }).catch(() => undefined).finally(() => setReady(true));
  }, [isAuthed]);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* storage unavailable */ }
    if (!isAuthed) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      fetch('/api/cart', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lines }) }).catch(() => undefined);
    }, 600);
  }, [lines, ready, isAuthed]);

  const notify = useCallback((m: string) => {
    setToast(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const add = useCallback((productId: string, quantity = 1, variantId: string | null = null) => {
    setLines((prev) => {
      const hit = prev.find((l) => same(l, productId, variantId));
      if (hit) return prev.map((l) => (l === hit ? { ...l, quantity: Math.min(99, l.quantity + quantity) } : l));
      return [...prev, { productId, variantId, quantity }];
    });
    notify('Added to your cart');
  }, [notify]);

  const setQuantity = useCallback((productId: string, quantity: number, variantId: string | null = null) => {
    setLines((prev) => prev.flatMap((l) => (same(l, productId, variantId) ? (quantity > 0 ? [{ ...l, quantity: Math.min(99, quantity) }] : []) : [l])));
  }, []);
  const remove = useCallback((productId: string, variantId: string | null = null) => {
    setLines((prev) => prev.filter((l) => !same(l, productId, variantId)));
  }, []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartCtx>(() => ({
    lines, count: lines.reduce((n, l) => n + l.quantity, 0), add, setQuantity, remove, clear, notify,
  }), [lines, add, setQuantity, remove, clear, notify]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
        <div className={`rounded-full bg-navy px-5 py-3 text-[13px] font-medium text-white shadow-card transition-all duration-300 ${toast ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}>
          {toast}
        </div>
      </div>
    </Ctx.Provider>
  );
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCart must be used inside CartProvider');
  return c;
}
