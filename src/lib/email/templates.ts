import { escapeHtml as h, formatMoney } from '@/lib/utils';
import { button, htmlToText, shell } from './layout';

/* eslint-disable @typescript-eslint/no-explicit-any */
type P = Record<string, any>;
export interface Rendered { subject: string; html: string; text: string }

const money = (c: number | null | undefined, cur: string) => formatMoney(c ?? 0, cur || 'USD');

function itemsTable(p: P) {
  const rows = (p.items ?? []) as { name: string; variant?: string; quantity: number; line_total_cents: number }[];
  if (!rows.length) return '';
  const cur = p.currency || 'USD';
  const body = rows.map((i) => `<tr><td style="padding:8px 0;border-bottom:1px solid #E6EAF1">${h(i.name)}${i.variant ? ` · ${h(i.variant)}` : ''} <span style="color:#6B7A90">× ${i.quantity}</span></td><td style="padding:8px 0;border-bottom:1px solid #E6EAF1;text-align:right">${money(i.line_total_cents, cur)}</td></tr>`).join('');
  const line = (l: string, v: string, b = false) => `<tr><td style="padding:6px 0;${b ? 'font-weight:700' : 'color:#6B7A90'}">${l}</td><td style="padding:6px 0;text-align:right;${b ? 'font-weight:700' : ''}">${v}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;font-size:14px">${body}${line('Subtotal', money(p.subtotal_cents, cur))}${p.discount_cents > 0 ? line('Discount', '−' + money(p.discount_cents, cur)) : ''}${line('Shipping', money(p.shipping_cents, cur))}${p.tax_cents > 0 ? line('Tax', money(p.tax_cents, cur)) : ''}${line('Total', money(p.total_cents, cur), true)}</table>`;
}

function address(p: P) {
  const a = p.shipping_address as P | undefined;
  if (!a) return '';
  return `<p style="margin:0 0 6px;color:#6B7A90;font-size:13px">Shipping to</p><p style="margin:0 0 18px;font-size:14px">${h(a.full_name ?? '')}<br>${h(a.line1 ?? '')}${a.line2 ? ', ' + h(a.line2) : ''}<br>${h(a.city ?? '')}${a.state ? ', ' + h(a.state) : ''} ${h(a.postal_code ?? '')}<br>${h(a.country ?? '')}</p>`;
}

const CUSTOMER: Record<string, { subject: (p: P) => string; heading: string; lead: (p: P) => string; extra?: (p: P) => string; cta?: string }> = {
  'order.placed': { subject: (p) => `We received your order ${p.order_number}`, heading: 'Thank you for your order', lead: (p) => `We received order <b>${h(p.order_number)}</b>. We will confirm it as soon as your payment clears.`, extra: (p) => itemsTable(p) + address(p) },
  'payment.success': { subject: (p) => `Payment received for ${p.order_number}`, heading: 'Payment successful', lead: (p) => `We received your payment of <b>${money(p.total_cents, p.currency)}</b> for order <b>${h(p.order_number)}</b>.`, extra: (p) => itemsTable(p) },
  'payment.failed': { subject: (p) => `Payment failed for ${p.order_number}`, heading: 'Your payment did not go through', lead: (p) => `We could not complete payment for order <b>${h(p.order_number)}</b>. You were not charged. You can try again from your order page.`, cta: 'Try payment again' },
  'payment.pending': { subject: (p) => `Payment pending for ${p.order_number}`, heading: 'Payment pending', lead: (p) => `We are waiting for the payment provider to confirm payment for order <b>${h(p.order_number)}</b>.` },
  'order.confirmed': { subject: (p) => `Order ${p.order_number} confirmed`, heading: 'Your order is confirmed', lead: (p) => `Order <b>${h(p.order_number)}</b> is confirmed and will be prepared shortly.` },
  'order.processing': { subject: (p) => `Order ${p.order_number} is being prepared`, heading: 'We are preparing your order', lead: (p) => `Order <b>${h(p.order_number)}</b> is being carefully packed.` },
  'order.shipped': { subject: (p) => `Order ${p.order_number} is on its way`, heading: 'Your order has shipped', lead: (p) => `Order <b>${h(p.order_number)}</b> is on its way.${p.tracking_number ? ` Tracking number: <b>${h(p.tracking_number)}</b>${p.carrier ? ` (${h(p.carrier)})` : ''}.` : ''}`, extra: (p) => (p.tracking_url && /^https?:\/\//.test(p.tracking_url) ? `<p>${button(p.tracking_url, 'Track your parcel')}</p>` : '') },
  'order.tracking': { subject: (p) => `Tracking for order ${p.order_number}`, heading: 'Tracking number added', lead: (p) => `Your tracking number for order <b>${h(p.order_number)}</b> is <b>${h(p.tracking_number ?? '')}</b>${p.carrier ? ` (${h(p.carrier)})` : ''}.`, extra: (p) => (p.tracking_url && /^https?:\/\//.test(p.tracking_url) ? `<p>${button(p.tracking_url, 'Track your parcel')}</p>` : '') },
  'order.delivered': { subject: (p) => `Order ${p.order_number} delivered`, heading: 'Your order was delivered', lead: (p) => `Order <b>${h(p.order_number)}</b> has been delivered. We hope you love it — a review helps others find their glow.` },
  'order.cancelled': { subject: (p) => `Order ${p.order_number} cancelled`, heading: 'Your order was cancelled', lead: (p) => `Order <b>${h(p.order_number)}</b> has been cancelled. If you paid, any refund will be sent to your original payment method.` },
  'refund.completed': { subject: (p) => `Refund processed for ${p.order_number}`, heading: 'Your refund was processed', lead: (p) => `The refund for order <b>${h(p.order_number)}</b> has been sent to your payment provider. It can take a few business days to appear.` },
  'refund.approved': { subject: (p) => `Refund approved for ${p.order_number}`, heading: 'Refund approved', lead: (p) => `Your refund request for order <b>${h(p.order_number)}</b> was approved.${p.admin_note ? ` Note from us: ${h(p.admin_note)}` : ''}` },
  'cancellation.requested': { subject: (p) => `We received your cancellation request`, heading: 'Cancellation request received', lead: (p) => `We received your request to cancel order <b>${h(p.order_number)}</b> and will review it shortly.` },
  'return.requested': { subject: (p) => `We received your return request`, heading: 'Return request received', lead: (p) => `We received your return request for order <b>${h(p.order_number)}</b> and will review it shortly.` },
  'refund.requested': { subject: (p) => `We received your refund request`, heading: 'Refund request received', lead: (p) => `We received your refund request for order <b>${h(p.order_number)}</b> and will review it shortly.` },
  'cancellation.approved': { subject: (p) => `Cancellation approved for ${p.order_number}`, heading: 'Cancellation approved', lead: (p) => `Your cancellation request for order <b>${h(p.order_number)}</b> was approved.${p.admin_note ? ` Note from us: ${h(p.admin_note)}` : ''}` },
  'cancellation.rejected': { subject: (p) => `Cancellation request update for ${p.order_number}`, heading: 'Cancellation request declined', lead: (p) => `We could not cancel order <b>${h(p.order_number)}</b>.${p.admin_note ? ` ${h(p.admin_note)}` : ''}` },
  'return.approved': { subject: (p) => `Return approved for ${p.order_number}`, heading: 'Return approved', lead: (p) => `Your return request for order <b>${h(p.order_number)}</b> was approved.${p.admin_note ? ` ${h(p.admin_note)}` : ''}` },
  'return.rejected': { subject: (p) => `Return request update for ${p.order_number}`, heading: 'Return request declined', lead: (p) => `We could not approve the return for order <b>${h(p.order_number)}</b>.${p.admin_note ? ` ${h(p.admin_note)}` : ''}` },
  'request.updated': { subject: (p) => `Update on your request for ${p.order_number}`, heading: 'Your request was updated', lead: (p) => `There is an update on your request for order <b>${h(p.order_number)}</b>.` },
  'account.welcome': { subject: () => 'Welcome to GLOWNEST', heading: 'Welcome to GLOWNEST', lead: (p) => `Hi${p.name ? ' ' + h(String(p.name).split(' ')[0]) : ''}, your account is ready. Take our two-minute skincare quiz to get a routine made for your skin.`, cta: 'Take the skincare quiz' },
  'newsletter.welcome': { subject: () => 'You are subscribed to GLOWNEST', heading: 'Thanks for subscribing', lead: () => 'You will now receive skincare tips, launches and offers. You can unsubscribe at any time using the link below.' },
  'security.email_changed': { subject: () => 'Your GLOWNEST email address was changed', heading: 'Your email address was changed', lead: (p) => `The email on your account was changed to <b>${h(p.new_email ?? '')}</b>. If this was not you, contact us immediately.` },
  'security.role_changed': { subject: () => 'Your GLOWNEST account permissions changed', heading: 'Your access level changed', lead: () => 'An administrator updated your account permissions. If you did not expect this, contact us.' },
};

const ADMIN_HEAD: Record<string, string> = {
  'order.placed': 'New order placed', 'payment.success': 'Payment received', 'payment.failed': 'Payment failed', 'order.shipped': 'Order shipped',
  'cancellation.requested': 'Cancellation requested', 'return.requested': 'Return requested', 'refund.requested': 'Refund requested',
  'customer.registered': 'New customer registered', 'review.created': 'New review submitted', 'newsletter.subscribed': 'New newsletter subscriber', 'contact.message': 'New contact message',
};

export interface RenderCtx { siteUrl: string; unsubscribeUrl?: string; link?: string }

export function renderNotification(event: string, audience: 'customer' | 'admin', p: P, subjectFallback: string, ctx: RenderCtx): Rendered {
  const base = ctx.siteUrl;
  if (audience === 'admin') {
    const head = ADMIN_HEAD[event] ?? subjectFallback;
    const link = ctx.link ? `${base}${ctx.link}` : `${base}/admin`;
    const lines: string[] = [];
    if (p.order_number) lines.push(`<b>Order:</b> ${h(p.order_number)} — ${money(p.total_cents, p.currency)} (${h(p.payment_status ?? '')})`);
    if (p.customer_email) lines.push(`<b>Customer:</b> ${h(p.customer_email)}`);
    if (p.reason) lines.push(`<b>Reason:</b> ${h(p.reason)}`);
    if (p.product) lines.push(`<b>Product:</b> ${h(p.product)}`);
    if (p.rating) lines.push(`<b>Rating:</b> ${'★'.repeat(Number(p.rating))}`);
    if (p.display_name) lines.push(`<b>From:</b> ${h(p.display_name)}`);
    if (p.name) lines.push(`<b>Name:</b> ${h(p.name)}`);
    if (p.email) lines.push(`<b>Email:</b> ${h(p.email)}`);
    if (p.subject) lines.push(`<b>Subject:</b> ${h(p.subject)}`);
    if (p.body || p.message) lines.push(`<b>Message:</b> ${h(String(p.body ?? p.message))}`);
    const html = shell({ siteUrl: base, title: head, preheader: head, bodyHtml: `<h1 style="font-family:Georgia,serif;font-size:22px;margin:0 0 14px">${h(head)}</h1>${lines.map((l) => `<p style="margin:0 0 8px">${l}</p>`).join('')}${p.order_number ? itemsTable(p) : ''}<p style="margin-top:20px">${button(link, 'Open in dashboard')}</p>`, footerHtml: 'You receive this because you are a GLOWNEST administrator or notification recipient.' });
    return { subject: `[Admin] ${subjectFallback}`, html, text: htmlToText(html) };
  }
  const t = CUSTOMER[event];
  if (!t) {
    const html = shell({ siteUrl: base, title: subjectFallback, bodyHtml: `<h1 style="font-family:Georgia,serif;font-size:22px">${h(subjectFallback)}</h1>` });
    return { subject: subjectFallback, html, text: htmlToText(html) };
  }
  const link = ctx.link ? `${base}${ctx.link}` : `${base}/dashboard`;
  const cta = t.cta ?? (p.order_id ? 'View your order' : undefined);
  const footer = ctx.unsubscribeUrl ? `GLOWNEST Skincare · <a href="${h(ctx.unsubscribeUrl)}" style="color:#6B7A90">Unsubscribe</a> from marketing emails` : undefined;
  const html = shell({
    siteUrl: base, title: t.subject(p), preheader: t.heading, footerHtml: footer,
    bodyHtml: `<h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 14px">${t.heading}</h1><p style="margin:0 0 16px">${t.lead(p)}</p>${t.extra?.(p) ?? ''}${cta ? `<p style="margin:24px 0 0">${button(event === 'account.welcome' ? `${base}/quiz` : link, cta)}</p>` : ''}`,
  });
  return { subject: t.subject(p), html, text: htmlToText(html) };
}

export function renderCampaign(c: { subject: string; preheader: string | null; banner_url: string | null; body_html: string }, unsubscribeUrl: string, siteUrl: string): Rendered {
  const html = shell({ siteUrl, title: c.subject, preheader: c.preheader ?? '', banner: c.banner_url, bodyHtml: c.body_html, footerHtml: `You are receiving this because you subscribed at ${h(siteUrl.replace(/^https?:\/\//, ''))}.<br><a href="${h(unsubscribeUrl)}" style="color:#6B7A90">Unsubscribe</a>` });
  return { subject: c.subject, html, text: htmlToText(html) };
}
