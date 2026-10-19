# GLOWNEST — skincare e-commerce platform

Next.js 15 (App Router) · TypeScript · Tailwind · Supabase (Auth, Postgres, Storage, RLS) · Paystack / Flutterwave · Resend · Vercel.

Storefront, quiz, cart/checkout, customer dashboard, and an admin + Super Admin dashboard (products, orders, refunds, reviews,
customers, newsletter, content, pages, blog, settings, coupons, payments, admins, audit log).

## 1. Run locally

```bash
npm install
cp .env.example .env.local     # fill in values (see below)
npm run dev
```

With **no** Supabase variables set the storefront runs in *demo mode* (sample products and default content, read-only) so you can
preview the design. Accounts, checkout, dashboards and admin need Supabase.

## 2. Supabase setup

1. Create a project. Copy the URL, anon key and service-role key into `.env.local`.
2. Run the migrations **in order** in the SQL editor (or `supabase db push`):
   `0001_schema.sql` → `0002_functions_triggers.sql` → `0003_rls.sql` → `0004_seed.sql` → `0005_rate_limits.sql`.
3. **Auth → URL configuration:** Site URL = your site URL; add `https://YOUR-DOMAIN/auth/callback` to redirect URLs.
4. **Auth → Providers → Google** (optional): enable and add your OAuth client.
5. **Auth → Email:** enable "Confirm email" and (recommended) configure custom SMTP.

## 3. Create the first Super Admin (one time, controlled)

Ordinary sign-up can **never** create admins: the database always creates `customer` accounts and blocks role changes from the browser.

```bash
SUPER_ADMIN_EMAIL=you@domain.com SUPER_ADMIN_PASSWORD='a-long-random-password' npm run create-super-admin
```

It runs on your machine with the service-role key, refuses to run if a Super Admin already exists, and the last active Super Admin can
never be demoted or deactivated. Remove those two variables afterwards. Further admins are invited from **Admin → Admins** (admin role only,
with per-area permissions).

## 4. Environment variables

See `.env.example`. Server-only secrets (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CRON_SECRET`, `CREDENTIALS_ENCRYPTION_KEY`, gateway keys)
must never be prefixed with `NEXT_PUBLIC_`.

Generate secrets: `openssl rand -base64 32` (for `CREDENTIALS_ENCRYPTION_KEY`) and any long random string for `CRON_SECRET`.

## 5. Payments

Configure gateways in **Admin → Payments** (Super Admin only). Secret keys are encrypted (AES-256-GCM) before storage and never sent to the browser or audit log;
alternatively use the environment variables.

An order becomes **paid only** when the server verifies the transaction with the provider or receives a correctly signed webhook. Landing on the
success page proves nothing. Webhook URLs:

| Provider | URL | Signature |
|---|---|---|
| Paystack | `https://YOUR-DOMAIN/api/webhooks/paystack` | HMAC-SHA512 with your secret key |
| Flutterwave | `https://YOUR-DOMAIN/api/webhooks/flutterwave` | `verif-hash` header = your secret hash |

Webhooks are idempotent (unique event id) and return 503 on a processing failure so the provider retries.

## 6. Email & notifications

Events (orders, payments, requests, reviews, subscribers, contact, security) are turned into rows in `notification_queue` by database triggers, with
duplicate prevention (`unique(to_email, dedupe_key)`), retries with exponential backoff and a dead-letter state. Two Vercel crons (see `vercel.json`) drain it:

- `/api/cron/notifications` every 5 minutes — sends transactional email through Resend.
- `/api/cron/newsletters` every 15 minutes — sends scheduled campaigns (only to currently subscribed addresses, with unsubscribe links).

Both require `Authorization: Bearer $CRON_SECRET` (Vercel adds this automatically when `CRON_SECRET` is set). Cron on Vercel Hobby runs at most daily — use
Pro, or call the endpoints from any scheduler. In Resend, verify your sending domain, set `EMAIL_FROM`, and add a webhook to
`https://YOUR-DOMAIN/api/webhooks/resend` (events: delivered, bounced, complained) with the signing secret in `RESEND_WEBHOOK_SECRET`; bounces and complaints suppress the address.

## 7. Deploy to Vercel

Import the repo, add the environment variables, deploy. Set `NEXT_PUBLIC_SITE_URL` to the production URL.

## 8. Security notes

- RLS on every table; the service-role client is imported only by server code.
- Admin permissions (`products`, `orders`, `reviews`, `customers`, `newsletter`, `content`) are enforced in RLS **and** in every server action.
- Audit log (append-only) records product, order, review, content, settings, payment-gateway and admin changes — who, what, before/after.
- Rate limiting on public endpoints; security headers in `next.config.mjs`.

## 9. Scripts

`npm run dev | build | start | typecheck` · `npm run create-super-admin`
