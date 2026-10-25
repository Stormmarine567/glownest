-- GLOWNEST — core schema
-- Run migrations in order (0001 → 0005) via the Supabase SQL editor or `supabase db push`.

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ───────────────────────── Enums ─────────────────────────
create type user_role as enum ('customer', 'admin', 'super_admin');
create type order_status as enum (
  'pending', 'confirmed', 'processing', 'shipped', 'delivered',
  'cancelled', 'refunded'
);
create type payment_status as enum ('unpaid', 'pending', 'paid', 'failed', 'refunded', 'partially_refunded');
create type request_status as enum ('requested', 'approved', 'rejected', 'completed');
create type review_status as enum ('pending', 'approved', 'rejected');
create type queue_status as enum ('pending', 'processing', 'sent', 'failed', 'dead');
create type subscriber_status as enum ('subscribed', 'unsubscribed', 'suppressed');
create type campaign_status as enum ('draft', 'scheduled', 'sending', 'sent', 'failed');

-- ───────────────────────── Profiles & roles ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext not null,
  full_name text,
  phone text,
  avatar_url text,
  role user_role not null default 'customer',
  is_active boolean not null default true,
  -- granular admin permissions assigned by the Super Admin
  -- e.g. products, orders, reviews, customers, newsletter, content
  permissions text[] not null default '{}',
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx on public.profiles(role);
create index profiles_email_idx on public.profiles(email);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text,
  full_name text not null,
  phone text,
  line1 text not null,
  line2 text,
  city text not null,
  state text,
  postal_code text,
  country text not null default 'NG',
  is_default_shipping boolean not null default false,
  is_default_billing boolean not null default false,
  created_at timestamptz not null default now()
);
create index addresses_user_idx on public.addresses(user_id);

-- ───────────────────────── Catalog ─────────────────────────
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tagline text,                       -- "Intense Hydration"
  description text,
  category_id uuid references public.categories(id) on delete set null,
  price_cents int not null check (price_cents >= 0),
  sale_price_cents int check (sale_price_cents is null or sale_price_cents >= 0),
  currency text not null default 'USD',
  sku text unique,
  stock_quantity int not null default 0 check (stock_quantity >= 0),
  low_stock_threshold int not null default 5,
  track_inventory boolean not null default true,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  is_bestseller boolean not null default false,
  tags text[] not null default '{}',
  -- Quiz / recommendation attributes (configurable per product)
  skin_types text[] not null default '{}',     -- dry, oily, combination, sensitive, normal
  concerns text[] not null default '{}',       -- acne, aging, dullness, dehydration, dark_spots, redness
  goals text[] not null default '{}',          -- hydrate, brighten, protect, clear, firm
  routine_step text,                           -- cleanse, treat, moisturize, protect
  routine_time text,                           -- am, pm, both
  is_vegan boolean not null default true,
  is_fragrance_free boolean not null default false,
  rating_avg numeric(3,2) not null default 0,
  rating_count int not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sale_lt_price check (sale_price_cents is null or sale_price_cents <= price_cents)
);
create index products_category_idx on public.products(category_id);
create index products_active_idx on public.products(is_active, sort_order);
create index products_featured_idx on public.products(is_featured) where is_featured;

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images(product_id, sort_order);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,                 -- "30ml"
  sku text unique,
  price_cents int check (price_cents is null or price_cents >= 0), -- null → use product price
  stock_quantity int not null default 0 check (stock_quantity >= 0),
  is_active boolean not null default true,
  sort_order int not null default 0
);
create index product_variants_product_idx on public.product_variants(product_id);

create table public.inventory_movements (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  delta int not null,
  reason text not null,               -- order_paid, restock, adjustment, order_cancelled
  order_id uuid,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Cart & wishlist ─────────────────────────
create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  discount_code text,
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  quantity int not null check (quantity > 0 and quantity <= 99),
  created_at timestamptz not null default now(),
  unique (cart_id, product_id, variant_id)
);

create table public.wishlists (
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ───────────────────────── Discounts & shipping ─────────────────────────
create table public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code citext not null unique,
  description text,
  percent_off int check (percent_off between 1 and 100),
  amount_off_cents int check (amount_off_cents > 0),
  min_subtotal_cents int not null default 0,
  max_uses int,
  used_count int not null default 0,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint one_discount_type check ((percent_off is not null) <> (amount_off_cents is not null))
);

create table public.shipping_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_cents int not null default 0,
  free_over_cents int,                 -- free shipping threshold
  estimated_days_min int,
  estimated_days_max int,
  is_active boolean not null default true,
  sort_order int not null default 0
);

-- ───────────────────────── Orders & payments ─────────────────────────
create sequence public.order_number_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('GN-' || nextval('public.order_number_seq')),
  user_id uuid references public.profiles(id) on delete set null,
  email citext not null,
  status order_status not null default 'pending',
  payment_status payment_status not null default 'unpaid',
  currency text not null default 'USD',
  subtotal_cents int not null,
  discount_cents int not null default 0,
  shipping_cents int not null default 0,
  tax_cents int not null default 0,
  total_cents int not null,
  discount_code text,
  shipping_method_id uuid references public.shipping_methods(id),
  shipping_address jsonb not null,
  billing_address jsonb,
  tracking_number text,
  tracking_url text,
  carrier text,
  notes text,
  paid_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_user_idx on public.orders(user_id, created_at desc);
create index orders_status_idx on public.orders(status, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  name text not null,                 -- snapshot
  variant_name text,
  image_url text,
  unit_price_cents int not null,
  quantity int not null check (quantity > 0),
  line_total_cents int not null
);
create index order_items_order_idx on public.order_items(order_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null,             -- paystack | flutterwave
  reference text not null unique,     -- our reference, sent to the provider
  provider_reference text,
  amount_cents int not null,
  currency text not null,
  status payment_status not null default 'pending',
  verified_at timestamptz,
  failure_reason text,
  refunded_cents int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_order_idx on public.payments(order_id);

-- Every provider webhook / verification call. Unique event id → idempotent processing.
create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments(id) on delete set null,
  provider text not null,
  event_id text not null,
  event_type text not null,
  payload jsonb not null,
  signature_valid boolean not null default false,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

-- Gateway config. Public flags here, secrets in a separate table nobody can read via the API.
create table public.payment_gateways (
  provider text primary key,          -- paystack | flutterwave
  display_name text not null,
  is_enabled boolean not null default false,
  public_key text,
  currency text not null default 'NGN',
  settings jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
create table public.payment_gateway_secrets (
  provider text primary key references public.payment_gateways(provider) on delete cascade,
  secret_encrypted text,              -- AES-256-GCM, key lives in env (CREDENTIALS_ENCRYPTION_KEY)
  webhook_secret_encrypted text,
  updated_at timestamptz not null default now()
);

create table public.order_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('cancellation', 'return', 'refund')),
  reason text not null,
  status request_status not null default 'requested',
  admin_note text,
  handled_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index order_requests_order_idx on public.order_requests(order_id);
-- Only one open request of a kind per order
create unique index order_requests_open_idx on public.order_requests(order_id, kind) where status = 'requested';

-- ───────────────────────── Reviews ─────────────────────────
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null,
  rating int not null check (rating between 1 and 5),
  title text,
  body text not null,
  images text[] not null default '{}',
  is_verified_purchase boolean not null default false,  -- set by trigger, never by client
  status review_status not null default 'approved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);
create index reviews_product_idx on public.reviews(product_id, status, created_at desc);

-- ───────────────────────── Content & settings ─────────────────────────
create table public.site_settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default true,   -- false → only admins can read
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Editable content blocks (homepage hero, banners, quiz copy, nav, footer…)
create table public.site_content (
  key text primary key,
  data jsonb not null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Footer / static pages: careers, faq, shipping, returns, privacy, sustainability…
create table public.pages (
  slug text primary key,
  title text not null,
  summary text,
  body jsonb not null default '{}',   -- { sections: [{heading, html|text}], ... }
  is_published boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'General',
  question text not null,
  answer text not null,
  sort_order int not null default 0,
  is_published boolean not null default true
);

create table public.job_postings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  department text,
  location text,
  employment_type text,
  description text not null,
  how_to_apply text,
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.social_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('instagram','facebook','tiktok','pinterest','youtube','x')),
  url text not null,
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  body text,
  category text,
  cover_url text,
  read_minutes int not null default 4,
  is_featured boolean not null default false,
  is_published boolean not null default true,
  published_at timestamptz not null default now()
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email citext not null,
  subject text,
  message text not null,
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Newsletter ─────────────────────────
create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  user_id uuid references public.profiles(id) on delete set null,
  status subscriber_status not null default 'subscribed',
  source text not null default 'website',
  unsubscribe_token uuid not null default gen_random_uuid() unique,
  consented_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.newsletter_campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  preheader text,
  banner_url text,
  body_html text not null,
  status campaign_status not null default 'draft',
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  total_recipients int not null default 0,
  created_at timestamptz not null default now()
);

create table public.newsletter_deliveries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.newsletter_campaigns(id) on delete cascade,
  subscriber_id uuid not null references public.newsletter_subscribers(id) on delete cascade,
  email citext not null,
  status queue_status not null default 'pending',
  attempts int not null default 0,
  provider_message_id text,
  last_error text,
  sent_at timestamptz,
  unique (campaign_id, subscriber_id)
);
create index newsletter_deliveries_pending_idx on public.newsletter_deliveries(campaign_id, status);

-- ───────────────────────── Notifications ─────────────────────────
-- In-dashboard notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);

-- Durable email queue with retries and duplicate prevention
create table public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  event text not null,                     -- order.placed, order.shipped, review.created…
  to_email citext not null,
  to_user_id uuid references public.profiles(id) on delete set null,
  audience text not null default 'customer' check (audience in ('customer', 'admin')),
  subject text not null,
  template text not null,
  payload jsonb not null default '{}',
  dedupe_key text not null,
  status queue_status not null default 'pending',
  attempts int not null default 0,
  max_attempts int not null default 5,
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  provider_message_id text,
  delivery_status text,                    -- delivered | bounced | complained (from provider webhook)
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (to_email, dedupe_key)
);
create index notification_queue_due_idx on public.notification_queue(status, next_attempt_at);

-- ───────────────────────── Skincare quiz ─────────────────────────
create table public.quiz_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  session_id text,
  skin_type text not null,
  concerns text[] not null default '{}',
  goals text[] not null default '{}',
  preferences jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.routine_recommendations (
  id uuid primary key default gen_random_uuid(),
  quiz_response_id uuid not null references public.quiz_responses(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  routine_step text,
  routine_time text,
  score int not null default 0,
  reason text,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Audit log (append-only) ─────────────────────────
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_email text,
  actor_role user_role,
  action text not null,                    -- product.update, review.delete, settings.payment…
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  ip text,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs(created_at desc);
create index audit_logs_actor_idx on public.audit_logs(actor_id, created_at desc);
