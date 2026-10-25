import { NextResponse } from 'next/server';
import { getGateway } from '@/lib/payments/credentials';
import { gateways } from '@/lib/payments';
import { forgetWebhook, recordWebhook, verifyAndSettle } from '@/lib/payments/flow';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const raw = await req.text(); // signature is computed over the exact raw body
  const g = await getGateway('paystack');
  const valid = gateways.paystack.validWebhook(g, raw, req.headers.get('x-paystack-signature'));
  if (!valid) return NextResponse.json({ error: 'invalid signature' }, { status: 401 });

  let evt: { event?: string; data?: { id?: number | string; reference?: string } };
  try { evt = JSON.parse(raw); } catch { return NextResponse.json({ error: 'bad payload' }, { status: 400 }); }
  const reference = evt.data?.reference;
  if (!evt.event || !reference) return NextResponse.json({ ok: true });

  const eventId = `${evt.event}:${evt.data?.id ?? reference}`;
  const first = await recordWebhook('paystack', eventId, evt.event, evt, true);
  if (!first) return NextResponse.json({ ok: true, duplicate: true });

  // Never trust the webhook body for the amount/status: ask Paystack again, then settle.
  if (evt.event === 'charge.success' || evt.event === 'charge.failed') {
    const eventId2 = `${evt.event}:${evt.data?.id ?? reference}`;
    try {
      const r = await verifyAndSettle(reference);
      if (r.state === 'pending') { await forgetWebhook('paystack', eventId2); return NextResponse.json({ error: 'not final yet' }, { status: 503 }); }
    } catch {
      await forgetWebhook('paystack', eventId2);
      return NextResponse.json({ error: 'retry' }, { status: 503 });
    }
  }
  return NextResponse.json({ ok: true });
}
