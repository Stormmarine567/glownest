import 'server-only';
import { Resend } from 'resend';

export interface Outgoing { to: string; subject: string; html: string; text: string; headers?: Record<string, string>; idempotencyKey?: string }

/** Throws on any failure so the queue records the error and retries. Never silently "succeeds" without a provider key. */
export async function sendEmail(m: Outgoing): Promise<{ id: string | null }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) throw new Error('RESEND_API_KEY / EMAIL_FROM are not configured');
  const resend = new Resend(key);
  const { data, error } = await resend.emails.send(
    { from, to: m.to, subject: m.subject, html: m.html, text: m.text, headers: m.headers },
    m.idempotencyKey ? { idempotencyKey: m.idempotencyKey } : undefined,
  );
  if (error) throw new Error(`${error.name}: ${error.message}`);
  return { id: data?.id ?? null };
}

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
