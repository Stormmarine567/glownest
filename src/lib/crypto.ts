import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

function key(): Buffer {
  const b64 = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!b64) throw new Error('CREDENTIALS_ENCRYPTION_KEY is not set');
  const k = Buffer.from(b64, 'base64');
  if (k.length !== 32) throw new Error('CREDENTIALS_ENCRYPTION_KEY must decode to 32 bytes');
  return k;
}

/** AES-256-GCM. Output: base64(iv | tag | ciphertext). */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64');
}

export function decryptSecret(blob: string): string {
  const raw = Buffer.from(blob, 'base64');
  const d = createDecipheriv('aes-256-gcm', key(), raw.subarray(0, 12));
  d.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString('utf8');
}
