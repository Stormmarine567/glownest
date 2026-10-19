import { NextResponse } from 'next/server';
import { getGateway } from '@/lib/payments/credentials';
import { gateways } from '@/lib/payments';
import { forgetWebhook, recordWebhook, verifyAndSettle } from '@/lib/payments/flow';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const raw = await req.text();
  const g = await getGateway('flutterwave');
  if (!gateways.flutterwave.validWebhook(g, raw, req.headers.get('verif-hash'))) return NextResponse.json({ error: 'invalid signature' }, { status: 401 });

  let evt: { event?: string; data?: { id?: number | string; tx_ref?: string } };
  try { evt = JSON.parse(raw); } catch { return NextResponse.json({ error: 'bad payload' }, { status: 400 }); }
  const reference = evt.data?.tx_ref;
  if (!evt.event || !reference) return NextResponse.json({ ok: true });

  const first = await recordWebhook('flutterwave', `${evt.event}:${evt.data?.id ?? reference}`, evt.event, evt, true);
  if (!first) return NextResponse.json({ ok: true, duplicate: true });
  if (evt.event === 'charge.completed') {
    const eventId2 = `${evt.event}:${evt.data?.id ?? reference}`;
    try {
      const r = await verifyAndSettle(reference);
      if (r.state === 'pending') { await forgetWebhook('flutterwave', eventId2); return NextResponse.json({ error: 'not final yet' }, { status: 503 }); }
    } catch {
      await forgetWebhook('flutterwave', eventId2);
      return NextResponse.json({ error: 'retry' }, { status: 503 });
    }
  }
  return NextResponse.json({ ok: true });
}
