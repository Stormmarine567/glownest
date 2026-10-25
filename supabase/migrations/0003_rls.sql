-- GLOWNEST — Row Level Security
-- Principle: the browser (anon/authenticated keys) can only do what is listed here.
-- Everything privileged (payments, role changes, order creation, secrets) goes through
-- server routes that use the service role after their own authorization checks.

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

create or replace function public.has_purchased(p_product uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.order_items oi join public.orders o on o.id = oi.order_id
    where o.user_id = auth.uid() and oi.product_id = p_product and o.payment_status = 'paid'
  );
$$;

-- ── profiles ──
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.has_permission('customers'));
create policy profiles_update_own on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());  -- privileged columns blocked by trigger

-- ── addresses ──
create policy addresses_own on public.addresses for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy addresses_admin_read on public.addresses for select using (public.has_permission('customers'));

-- ── catalog ──
create policy categories_read on public.categories for select using (is_active or public.has_permission('products'));
create policy categories_write on public.categories for all using (public.has_permission('products')) with check (public.has_permission('products'));

create policy products_read on public.products for select using (is_active or public.has_permission('products'));
create policy products_write on public.products for all using (public.has_permission('products')) with check (public.has_permission('products'));

create policy product_images_read on public.product_images for select using (true);
create policy product_images_write on public.product_images for all using (public.has_permission('products')) with check (public.has_permission('products'));

create policy product_variants_read on public.product_variants for select using (is_active or public.has_permission('products'));
create policy product_variants_write on public.product_variants for all using (public.has_permission('products')) with check (public.has_permission('products'));

create policy inventory_read on public.inventory_movements for select using (public.has_permission('products'));
create policy inventory_insert on public.inventory_movements for insert with check (public.has_permission('products'));

-- ── cart & wishlist (own rows only) ──
create policy carts_own on public.carts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy cart_items_own on public.cart_items for all
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));
create policy wishlists_own on public.wishlists for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── discounts & shipping (validated server-side; super admin manages) ──
create policy discount_admin on public.discount_codes for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy shipping_read on public.shipping_methods for select using (is_active or public.is_super_admin());
create policy shipping_write on public.shipping_methods for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ── orders (no client inserts: created by the server after price re-computation) ──
create policy orders_select on public.orders for select using (user_id = auth.uid() or public.has_permission('orders'));
create policy orders_update_admin on public.orders for update using (public.has_permission('orders')) with check (public.has_permission('orders'));
create policy order_items_select on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_permission('orders'))));

create policy payments_select on public.payments for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_permission('orders'))));
create policy payment_tx_select on public.payment_transactions for select using (public.has_permission('orders'));

-- Gateways: customers may see which providers are enabled (public key only). Secrets table has NO policies.
create policy gateways_read on public.payment_gateways for select using (is_enabled or public.is_super_admin());
create policy gateways_write on public.payment_gateways for all using (public.is_super_admin()) with check (public.is_super_admin());
-- payment_gateway_secrets: RLS enabled, deliberately no policy → unreadable and unwritable from any client key.

create policy order_requests_select on public.order_requests for select using (user_id = auth.uid() or public.has_permission('orders'));
create policy order_requests_insert on public.order_requests for insert
  with check (
    user_id = auth.uid() and status = 'requested' and handled_by is null and admin_note is null
    and exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );
create policy order_requests_update on public.order_requests for update using (public.has_permission('orders')) with check (public.has_permission('orders'));

-- ── reviews ──
create policy reviews_read on public.reviews for select
  using (status = 'approved' or user_id = auth.uid() or public.has_permission('reviews'));
create policy reviews_insert on public.reviews for insert
  with check (user_id = auth.uid() and public.has_purchased(product_id));
create policy reviews_update on public.reviews for update
  using (user_id = auth.uid() or public.has_permission('reviews'))
  with check (user_id = auth.uid() or public.has_permission('reviews'));
create policy reviews_delete on public.reviews for delete
  using (user_id = auth.uid() or public.has_permission('reviews'));

-- ── content & settings ──
create policy settings_read on public.site_settings for select using (is_public or public.has_permission('content'));
create policy settings_write on public.site_settings for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy content_read on public.site_content for select using (true);
create policy content_write on public.site_content for all using (public.has_permission('content')) with check (public.has_permission('content'));

create policy pages_read on public.pages for select using (is_published or public.has_permission('content'));
create policy pages_write on public.pages for all using (public.has_permission('content')) with check (public.has_permission('content'));

create policy faqs_read on public.faqs for select using (is_published or public.has_permission('content'));
create policy faqs_write on public.faqs for all using (public.has_permission('content')) with check (public.has_permission('content'));

create policy jobs_read on public.job_postings for select using (is_open or public.has_permission('content'));
create policy jobs_write on public.job_postings for all using (public.has_permission('content')) with check (public.has_permission('content'));

create policy social_read on public.social_links for select using (is_active or public.is_super_admin());
create policy social_write on public.social_links for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy blog_read on public.blog_posts for select using (is_published or public.has_permission('content'));
create policy blog_write on public.blog_posts for all using (public.has_permission('content')) with check (public.has_permission('content'));

create policy contact_insert on public.contact_messages for insert
  with check (char_length(message) between 1 and 5000 and char_length(name) between 1 and 200);
create policy contact_read on public.contact_messages for select using (public.has_permission('customers'));
create policy contact_update on public.contact_messages for update using (public.has_permission('customers')) with check (public.has_permission('customers'));

-- ── newsletter (subscribing goes through subscribe_email() on the server) ──
create policy subscribers_read on public.newsletter_subscribers for select
  using (user_id = auth.uid() or public.has_permission('newsletter'));
create policy subscribers_admin_write on public.newsletter_subscribers for all
  using (public.has_permission('newsletter')) with check (public.has_permission('newsletter'));
create policy campaigns_all on public.newsletter_campaigns for all
  using (public.has_permission('newsletter')) with check (public.has_permission('newsletter'));
create policy deliveries_read on public.newsletter_deliveries for select using (public.has_permission('newsletter'));

-- ── notifications ──
create policy notifications_select on public.notifications for select using (user_id = auth.uid());
create policy notifications_update on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on public.notifications for delete using (user_id = auth.uid());
revoke update on public.notifications from authenticated, anon;
grant update (read_at) on public.notifications to authenticated;

create policy queue_read on public.notification_queue for select using (public.is_super_admin());

-- ── quiz ──
create policy quiz_select on public.quiz_responses for select using (user_id = auth.uid() or public.is_super_admin());
create policy routine_select on public.routine_recommendations for select
  using (exists (select 1 from public.quiz_responses q where q.id = quiz_response_id and (q.user_id = auth.uid() or public.is_super_admin())));

-- ── audit logs: super admin can read; nobody can write from the client ──
create policy audit_read on public.audit_logs for select using (public.is_super_admin());

-- ───────────────────────── Storage ─────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('branding',       'branding',       true, 2097152,  array['image/png','image/jpeg','image/webp','image/svg+xml','image/x-icon','image/vnd.microsoft.icon']),
  ('product-images', 'product-images', true, 5242880,  array['image/png','image/jpeg','image/webp']),
  ('content',        'content',        true, 5242880,  array['image/png','image/jpeg','image/webp']),
  ('review-images',  'review-images',  true, 3145728,  array['image/png','image/jpeg','image/webp']),
  ('avatars',        'avatars',        true, 1048576,  array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy storage_public_read on storage.objects for select
  using (bucket_id in ('branding','product-images','content','review-images','avatars'));

create policy storage_branding_write on storage.objects for all
  using (bucket_id = 'branding' and public.is_super_admin())
  with check (bucket_id = 'branding' and public.is_super_admin());

create policy storage_products_write on storage.objects for all
  using (bucket_id = 'product-images' and public.has_permission('products'))
  with check (bucket_id = 'product-images' and public.has_permission('products'));

create policy storage_content_write on storage.objects for all
  using (bucket_id = 'content' and (public.has_permission('content') or public.has_permission('newsletter')))
  with check (bucket_id = 'content' and (public.has_permission('content') or public.has_permission('newsletter')));

-- Users upload only into a folder named after their own user id: <uid>/<file>
create policy storage_review_images_own on storage.objects for insert
  with check (bucket_id = 'review-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy storage_review_images_delete on storage.objects for delete
  using (bucket_id = 'review-images' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_permission('reviews')));

create policy storage_avatars_insert on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy storage_avatars_update on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy storage_avatars_delete on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
