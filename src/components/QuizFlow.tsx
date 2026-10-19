'use client';
import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, ShoppingBag } from 'lucide-react';
import { useCart } from './CartProvider';
import { formatMoney } from '@/lib/utils';

interface Opt { id: string; label: string; hint?: string }
interface QuizContent { title: string; intro: string; skin_types: Opt[]; concerns: Opt[]; goals: Opt[]; preferences: Opt[] }
interface RoutineItem { step: string; label: string; time: string | null; reasons: string[]; product: { id: string; slug: string; name: string; tagline: string | null; currency: string; price_cents: number; image: string | null } }

const TITLES = ['What is your skin type?', 'What are your main concerns?', 'What do you want to achieve?', 'Any preferences?'];
/* eslint-disable @next/next/no-img-element */

export function QuizFlow({ content, initialConcern }: { content: QuizContent; initialConcern?: string }) {
  const reduce = useReducedMotion();
  const { add } = useCart();
  const [step, setStep] = useState(0); // 0..3 questions, 4 results
  const [skin, setSkin] = useState('');
  const [concerns, setConcerns] = useState<string[]>(initialConcern && content.concerns.some((c) => c.id === initialConcern) ? [initialConcern] : []);
  const [goals, setGoals] = useState<string[]>([]);
  const [prefs, setPrefs] = useState<string[]>([]);
  const [routine, setRoutine] = useState<RoutineItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggle = (list: string[], set: (v: string[]) => void, id: string, max = 99) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : list.length >= max ? list : [...list, id]);

  const canNext = step === 0 ? !!skin : step === 1 ? concerns.length > 0 : step === 2 ? goals.length > 0 : true;

  async function finish() {
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/quiz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skinType: skin, concerns, goals, preferences: prefs }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Could not build your routine.');
      setRoutine(j.routine); setStep(4);
    } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.'); }
    finally { setLoading(false); }
  }

  const options = step === 0 ? content.skin_types : step === 1 ? content.concerns : step === 2 ? content.goals : content.preferences;
  const selected = step === 0 ? [skin] : step === 1 ? concerns : step === 2 ? goals : prefs;
  const onPick = (id: string) => step === 0 ? setSkin(id) : step === 1 ? toggle(concerns, setConcerns, id, 3) : step === 2 ? toggle(goals, setGoals, id) : toggle(prefs, setPrefs, id);
  const total = routine?.reduce((n, r) => n + r.product.price_cents, 0) ?? 0;

  return (
    <div className="mx-auto max-w-[760px]">
      {step < 4 && (
        <div className="mb-8" aria-label={`Step ${step + 1} of 4`}>
          <div className="h-1.5 overflow-hidden rounded-full bg-tint"><div className="h-full rounded-full bg-navy transition-all duration-500" style={{ width: `${((step + 1) / 4) * 100}%` }} /></div>
          <p className="mt-2 text-[12px] text-muted">Step {step + 1} of 4</p>
        </div>
      )}
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={reduce ? false : { opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={reduce ? undefined : { opacity: 0, x: -24 }} transition={{ duration: 0.28 }}>
          {step < 4 ? (
            <>
              <h2 className="text-[26px] md:text-[32px]">{TITLES[step]}</h2>
              <p className="mt-2 text-[14px] text-muted">{step === 1 ? 'Choose up to 3.' : step === 2 ? 'Pick everything that applies.' : step === 3 ? 'Optional — skip if none apply.' : 'Pick the one that fits best.'}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2" role={step === 0 ? 'radiogroup' : 'group'}>
                {options.map((o) => {
                  const on = selected.includes(o.id);
                  return (
                    <button key={o.id} type="button" role={step === 0 ? 'radio' : 'checkbox'} aria-checked={on} onClick={() => onPick(o.id)}
                      className={`flex items-center justify-between rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-card ${on ? 'border-navy bg-tint-soft shadow-card' : 'border-line bg-white'}`}>
                      <span><span className="block text-[15px] font-medium">{o.label}</span>{o.hint && <span className="mt-0.5 block text-[12px] text-muted">{o.hint}</span>}</span>
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${on ? 'border-navy bg-navy text-white' : 'border-line'}`}>{on && <Check className="h-3.5 w-3.5" />}</span>
                    </button>
                  );
                })}
              </div>
              <p role="alert" className="mt-4 text-[13px] text-red-600">{error}</p>
              <div className="mt-8 flex items-center justify-between">
                <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="btn btn-outline h-11 disabled:opacity-0"><ArrowLeft className="h-4 w-4" />Back</button>
                {step < 3 ? (
                  <button type="button" onClick={() => setStep((s) => s + 1)} disabled={!canNext} className="btn btn-primary h-11">Next<ArrowRight className="h-4 w-4" /></button>
                ) : (
                  <button type="button" onClick={finish} disabled={loading} className="btn btn-primary h-11">{loading ? 'Building your routine…' : 'See my routine'}<ArrowRight className="h-4 w-4" /></button>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="eyebrow">/ YOUR ROUTINE</p>
              <h2 className="mt-2 text-[28px] md:text-[36px]">Your personalised routine</h2>
              <p className="mt-2 text-[14px] text-muted">Matched from our catalogue to {skin} skin{concerns.length ? `, focusing on ${concerns.map((c) => c.replace('_', ' ')).join(' & ')}` : ''}.</p>
              {routine && routine.length === 0 && <p className="mt-8 rounded-xl bg-tint p-5 text-[14px]">We could not find a full match for those preferences. <button className="font-bold underline" onClick={() => { setPrefs([]); setStep(3); }}>Try fewer preferences</button> or <Link href="/shop" className="font-bold underline">browse the shop</Link>.</p>}
              <ol className="mt-8 space-y-4">
                {routine?.map((r, i) => (
                  <motion.li key={r.product.id} initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="flex gap-4 rounded-2xl border border-line p-4">
                    <Link href={`/product/${r.product.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-tint"><img src={r.product.image ?? ''} alt="" className="h-full w-full object-cover" /></Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted">Step {i + 1} · {r.label}{r.time ? ` · ${r.time === 'both' ? 'AM & PM' : r.time.toUpperCase()}` : ''}</p>
                      <Link href={`/product/${r.product.slug}`} className="mt-1 font-serif text-[16px] font-bold">{r.product.name}</Link>
                      {r.reasons.length > 0 && <p className="mt-1 text-[12px] text-muted">Why: {[...new Set(r.reasons)].slice(0, 3).join(' · ')}</p>}
                      <div className="mt-auto flex items-center justify-between pt-3">
                        <span className="text-[14px] font-bold">{formatMoney(r.product.price_cents, r.product.currency)}</span>
                        <button type="button" onClick={() => add(r.product.id)} className="btn btn-outline h-9 px-4 text-[13px]">Add to cart</button>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </ol>
              {routine && routine.length > 0 && (
                <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-tint p-5">
                  <p className="text-[14px]">Full routine <span className="font-bold">{formatMoney(total, routine[0].product.currency)}</span></p>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => { routine.forEach((r) => add(r.product.id)); }} className="btn btn-primary"><ShoppingBag className="h-4 w-4" />Add all to cart</button>
                    <Link href="/cart" className="btn btn-outline">View cart</Link>
                  </div>
                </div>
              )}
              <button type="button" onClick={() => { setStep(0); setRoutine(null); }} className="mt-6 text-[13px] text-muted underline">Retake the quiz</button>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
