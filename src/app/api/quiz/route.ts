import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

const Body = z.object({
  skinType: z.enum(['dry', 'oily', 'combination', 'sensitive', 'normal']),
  concerns: z.array(z.string().max(30)).max(6),
  goals: z.array(z.string().max(30)).max(5),
  preferences: z.array(z.enum(['fragrance_free', 'vegan', 'minimal'])).max(3),
});

const STEPS = ['cleanse', 'treat', 'moisturize', 'protect'] as const;
const STEP_LABEL: Record<string, string> = { cleanse: 'Cleanse', treat: 'Treat', moisturize: 'Moisturize', protect: 'Protect' };

interface P {
  id: string; slug: string; name: string; tagline: string | null; price_cents: number; sale_price_cents: number | null; currency: string;
  stock_quantity: number; skin_types: string[]; concerns: string[]; goals: string[]; routine_step: string | null; routine_time: string | null;
  is_vegan: boolean; is_fragrance_free: boolean; rating_avg: number; product_images: { url: string; sort_order: number }[];
}

export async function POST(req: Request) {
  if (!(await rateLimit('quiz', 20, 600))) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid answers' }, { status: 400 });
  const a = parsed.data;

  const db = createAdminClient();
  const { data } = await db.from('products')
    .select('id,slug,name,tagline,price_cents,sale_price_cents,currency,stock_quantity,skin_types,concerns,goals,routine_step,routine_time,is_vegan,is_fragrance_free,rating_avg,product_images(url,sort_order)')
    .eq('is_active', true).gt('stock_quantity', 0);
  let products = (data ?? []) as unknown as P[];
  if (a.preferences.includes('fragrance_free')) products = products.filter((p) => p.is_fragrance_free);
  if (a.preferences.includes('vegan')) products = products.filter((p) => p.is_vegan);

  // Score from the catalogue's own attributes — nothing random.
  const scored = products.map((p) => {
    const reasons: string[] = [];
    let score = 0;
    if (p.skin_types.includes(a.skinType)) { score += 3; reasons.push(`suits ${a.skinType} skin`); }
    else if (p.skin_types.length === 0) score += 1;
    for (const c of a.concerns) if (p.concerns.includes(c)) { score += 2; reasons.push(`targets ${c.replace('_', ' ')}`); }
    for (const g of a.goals) if (p.goals.includes(g)) { score += 2; reasons.push(`supports ${g} goal`); }
    score += Math.min(1, Number(p.rating_avg) / 5);
    return { p, score, reasons };
  });

  const wanted = a.preferences.includes('minimal') ? ['cleanse', 'moisturize', 'protect'] : [...STEPS];
  const routine = wanted.flatMap((step) => {
    const best = scored.filter((s) => s.p.routine_step === step && s.p.skin_types.includes(a.skinType)).sort((x, y) => y.score - x.score)[0]
      ?? scored.filter((s) => s.p.routine_step === step).sort((x, y) => y.score - x.score)[0];
    return best ? [{ step, label: STEP_LABEL[step], ...best }] : [];
  });

  // Persist (best effort) so the shop can learn what customers need.
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const { data: qr } = await db.from('quiz_responses').insert({
    user_id: user?.id ?? null, skin_type: a.skinType, concerns: a.concerns, goals: a.goals, preferences: { list: a.preferences },
  }).select('id').single();
  if (qr && routine.length) {
    await db.from('routine_recommendations').insert(routine.map((r) => ({
      quiz_response_id: qr.id, product_id: r.p.id, routine_step: r.step, routine_time: r.p.routine_time, score: Math.round(r.score), reason: r.reasons.join(', '),
    })));
  }

  return NextResponse.json({
    routine: routine.map((r) => ({
      step: r.step, label: r.label, time: r.p.routine_time, reasons: r.reasons,
      product: {
        id: r.p.id, slug: r.p.slug, name: r.p.name, tagline: r.p.tagline, currency: r.p.currency,
        price_cents: r.p.sale_price_cents ?? r.p.price_cents,
        image: [...(r.p.product_images ?? [])].sort((x, y) => x.sort_order - y.sort_order)[0]?.url ?? null,
      },
    })),
  });
}
