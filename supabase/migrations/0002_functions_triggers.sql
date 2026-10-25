-- GLOWNEST — helper functions, security triggers, payment settlement, event-driven notifications

-- ───────────────────────── Role helpers ─────────────────────────
create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin' and is_active);
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin') and is_active);
$$;

-- Super admin has every permission; admins only those assigned by the super admin.
create or replace function public.has_permission(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active
      and (role = 'super_admin' or (role = 'admin' and p = any(permissions)))
  );
$$;

create or replace function public.is_service_role() returns boolean
language sql stable as $$
  -- Judge by the JWT role of the caller, NOT current_user: SECURITY DEFINER functions run as their owner,
  -- so current_user would always look privileged. A null claim means a trusted direct DB connection (SQL editor/migrations).
  select coalesce(auth.role(), 'service_role') = 'service_role';
$$;

-- ───────────────────────── updated_at ─────────────────────────
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger trg_products_touch before update on public.products for each row execute function public.touch_updated_at();
create trigger trg_orders_touch before update on public.orders for each row execute function public.touch_updated_at();
create trigger trg_payments_touch before update on public.payments for each row execute function public.touch_updated_at();
create trigger trg_reviews_touch before update on public.reviews for each row execute function public.touch_updated_at();
create trigger trg_order_requests_touch before update on public.order_requests for each row execute function public.touch_updated_at();

-- ───────────────────────── New user → profile (ALWAYS a customer) ─────────────────────────
-- Roles are never read from user metadata, so public sign-up can never create an admin.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    'customer'
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ───────────────────────── Privilege-escalation protection ─────────────────────────
create or replace function public.protect_profile_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if not public.is_service_role() then
    if new.role is distinct from old.role
       or new.permissions is distinct from old.permissions
       or new.is_active is distinct from old.is_active
       or new.email is distinct from old.email
       or new.id is distinct from old.id then
      raise exception 'Privileged profile fields can only be changed through server-side admin actions';
    end if;
  end if;
  return new;
end $$;
create trigger trg_profiles_protect before update on public.profiles
for each row execute function public.protect_profile_update();

-- The last active Super Admin can never be demoted, deactivated or deleted — not even by the service role.
create or replace function public.protect_last_super_admin() returns trigger
language plpgsql security definer set search_path = public as $$
declare others int;
begin
  if old.role = 'super_admin' and (
       tg_op = 'DELETE'
       or new.role <> 'super_admin'
       or new.is_active = false
     ) then
    select count(*) into others from public.profiles
      where role = 'super_admin' and is_active and id <> old.id;
    if others = 0 then
      raise exception 'The last active Super Admin cannot be removed, demoted or deactivated';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create trigger trg_profiles_last_super_update before update on public.profiles
for each row execute function public.protect_last_super_admin();
create trigger trg_profiles_last_super_delete before delete on public.profiles
for each row execute function public.protect_last_super_admin();

-- Only a Super Admin (server-side) may grant admin roles: block admins from touching super_admin rows
create or replace function public.protect_super_admin_rows() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_service_role() and not public.is_super_admin() then
    if (tg_op = 'UPDATE' and old.role = 'super_admin') then
      raise exception 'Only a Super Admin can modify Super Admin accounts';
    end if;
  end if;
  return new;
end $$;
create trigger trg_profiles_super_rows before update on public.profiles
for each row execute function public.protect_super_admin_rows();

-- ───────────────────────── Audit log is append-only ─────────────────────────
create or replace function public.audit_immutable() returns trigger language plpgsql as $$
begin raise exception 'audit_logs is append-only'; end $$;
create trigger trg_audit_no_update before update on public.audit_logs for each row execute function public.audit_immutable();
create trigger trg_audit_no_delete before delete on public.audit_logs for each row execute function public.audit_immutable();

-- Automatic audit trail for sensitive config tables, so nothing can change silently
create or replace function public.audit_row_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare actor public.profiles; k text;
begin
  select * into actor from public.profiles where id = auth.uid();
  k := case when tg_op = 'DELETE' then coalesce((to_jsonb(old)->>'id'), (to_jsonb(old)->>'key'), (to_jsonb(old)->>'slug'), (to_jsonb(old)->>'provider'))
            else coalesce((to_jsonb(new)->>'id'), (to_jsonb(new)->>'key'), (to_jsonb(new)->>'slug'), (to_jsonb(new)->>'provider')) end;
  insert into public.audit_logs (actor_id, actor_email, actor_role, action, entity, entity_id, before, after)
  values (
    actor.id, actor.email, actor.role,
    tg_table_name || '.' || lower(tg_op), tg_table_name, k,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

-- Secrets are never copied into the audit log
create or replace function public.audit_gateway_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare actor public.profiles;
begin
  select * into actor from public.profiles where id = auth.uid();
  insert into public.audit_logs (actor_id, actor_email, actor_role, action, entity, entity_id, after)
  values (actor.id, actor.email, actor.role, 'payment_gateway_secrets.' || lower(tg_op), 'payment_gateway_secrets', new.provider,
          jsonb_build_object('provider', new.provider, 'secret_changed', true));
  return new;
end $$;

create trigger audit_products after insert or update or delete on public.products for each row execute function public.audit_row_change();
create trigger audit_categories after insert or update or delete on public.categories for each row execute function public.audit_row_change();
create trigger audit_reviews_delete after delete on public.reviews for each row execute function public.audit_row_change();
create trigger audit_settings after insert or update or delete on public.site_settings for each row execute function public.audit_row_change();
create trigger audit_content after insert or update or delete on public.site_content for each row execute function public.audit_row_change();
create trigger audit_pages after insert or update or delete on public.pages for each row execute function public.audit_row_change();
create trigger audit_gateways after insert or update or delete on public.payment_gateways for each row execute function public.audit_row_change();
create trigger audit_gateway_secrets after insert or update on public.payment_gateway_secrets for each row execute function public.audit_gateway_change();
create trigger audit_discounts after insert or update or delete on public.discount_codes for each row execute function public.audit_row_change();
create trigger audit_shipping after insert or update or delete on public.shipping_methods for each row execute function public.audit_row_change();
create trigger audit_social after insert or update or delete on public.social_links for each row execute function public.audit_row_change();
create trigger audit_orders_update after update on public.orders for each row
  when (old.status is distinct from new.status or old.tracking_number is distinct from new.tracking_number or old.payment_status is distinct from new.payment_status)
  execute function public.audit_row_change();
create trigger audit_profiles_roles after update on public.profiles for each row
  when (old.role is distinct from new.role or old.is_active is distinct from new.is_active or old.permissions is distinct from new.permissions)
  execute function public.audit_row_change();
create trigger audit_requests after update on public.order_requests for each row execute function public.audit_row_change();

-- ───────────────────────── Reviews: verified purchase, no manipulation, rating rollup ─────────────────────────
create or replace function public.review_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.is_verified_purchase := exists (
      select 1 from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where o.user_id = new.user_id and oi.product_id = new.product_id and o.payment_status = 'paid'
    );
    if not public.is_service_role() and not public.is_admin() then
      new.status := 'approved';
    end if;
  else
    if not public.is_service_role() and not public.is_admin() then
      if new.user_id <> old.user_id or new.product_id <> old.product_id
         or new.is_verified_purchase <> old.is_verified_purchase or new.status <> old.status then
        raise exception 'You can only edit the text, rating and photos of your own review';
      end if;
    end if;
  end if;
  return new;
end $$;
create trigger trg_reviews_before before insert or update on public.reviews
for each row execute function public.review_before_write();

create or replace function public.refresh_product_rating() returns trigger
language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  pid := coalesce(new.product_id, old.product_id);
  update public.products p set
    rating_avg = coalesce((select round(avg(rating)::numeric, 2) from public.reviews where product_id = pid and status = 'approved'), 0),
    rating_count = (select count(*) from public.reviews where product_id = pid and status = 'approved')
  where p.id = pid;
  return null;
end $$;
create trigger trg_reviews_rating after insert or update or delete on public.reviews
for each row execute function public.refresh_product_rating();

-- ───────────────────────── Payment settlement (service role only) ─────────────────────────
-- Called ONLY after the server has verified the payment with the provider API
-- or validated a signed webhook. The browser can never call this.
create or replace function public.settle_payment(
  p_reference text, p_amount_cents int, p_currency text, p_provider_reference text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pay public.payments; ord public.orders; it record;
begin
  select * into pay from public.payments where reference = p_reference for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'unknown_reference'); end if;
  if pay.status = 'paid' then return jsonb_build_object('ok', true, 'already', true, 'order_id', pay.order_id); end if;

  select * into ord from public.orders where id = pay.order_id for update;

  if p_amount_cents <> pay.amount_cents or upper(p_currency) <> upper(pay.currency) or pay.amount_cents <> ord.total_cents then
    update public.payments set status = 'failed', failure_reason = 'amount_or_currency_mismatch' where id = pay.id;
    update public.orders set payment_status = 'failed' where id = ord.id and payment_status <> 'paid';
    return jsonb_build_object('ok', false, 'reason', 'amount_or_currency_mismatch');
  end if;

  update public.payments set status = 'paid', verified_at = now(), provider_reference = p_provider_reference, failure_reason = null where id = pay.id;

  for it in select * from public.order_items where order_id = ord.id and product_id is not null loop
    update public.products set stock_quantity = greatest(stock_quantity - it.quantity, 0)
      where id = it.product_id and track_inventory;
    if it.variant_id is not null then
      update public.product_variants set stock_quantity = greatest(stock_quantity - it.quantity, 0) where id = it.variant_id;
    end if;
    insert into public.inventory_movements (product_id, variant_id, delta, reason, order_id)
      values (it.product_id, it.variant_id, -it.quantity, 'order_paid', ord.id);
  end loop;

  if ord.discount_code is not null then
    update public.discount_codes set used_count = used_count + 1 where code = ord.discount_code;
  end if;

  update public.orders set
    payment_status = 'paid',
    paid_at = now(),
    status = case when status = 'pending' then 'confirmed' else status end
  where id = ord.id;

  return jsonb_build_object('ok', true, 'order_id', ord.id);
end $$;

create or replace function public.fail_payment(p_reference text, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pay public.payments;
begin
  select * into pay from public.payments where reference = p_reference for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'unknown_reference'); end if;
  if pay.status = 'paid' then return jsonb_build_object('ok', true, 'ignored', 'already_paid'); end if;
  update public.payments set status = 'failed', failure_reason = left(p_reason, 300) where id = pay.id;
  update public.orders set payment_status = 'failed' where id = pay.order_id and payment_status <> 'paid';
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.settle_payment(text, int, text, text) from public, anon, authenticated;
revoke all on function public.fail_payment(text, text) from public, anon, authenticated;
grant execute on function public.settle_payment(text, int, text, text) to service_role;
grant execute on function public.fail_payment(text, text) to service_role;

-- ───────────────────────── Notification plumbing ─────────────────────────
-- Admin e-mail recipients: configured list (site_settings.notification_recipients) or every active admin.
create or replace function public.admin_recipient_emails() returns setof citext
language plpgsql stable security definer set search_path = public as $$
declare cfg jsonb;
begin
  select value into cfg from public.site_settings where key = 'notification_recipients';
  if cfg is not null and jsonb_typeof(cfg) = 'array' and jsonb_array_length(cfg) > 0 then
    return query select (jsonb_array_elements_text(cfg))::citext;
  else
    return query select email from public.profiles where role in ('admin','super_admin') and is_active;
  end if;
end $$;

create or replace function public.notify_user(
  p_user uuid, p_email citext, p_event text, p_title text, p_body text, p_link text, p_dedupe text, p_payload jsonb
) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user is not null then
    insert into public.notifications (user_id, type, title, body, link, dedupe_key)
    values (p_user, p_event, p_title, p_body, p_link, p_dedupe)
    on conflict (user_id, dedupe_key) do nothing;
  end if;
  if p_email is not null then
    insert into public.notification_queue (event, to_email, to_user_id, audience, subject, template, payload, dedupe_key)
    values (p_event, p_email, p_user, 'customer', p_title, p_event, coalesce(p_payload, '{}'), p_dedupe)
    on conflict (to_email, dedupe_key) do nothing;
  end if;
end $$;

-- p_permission: which admins see the in-dashboard notification (super admin always does)
create or replace function public.notify_admins(
  p_permission text, p_event text, p_title text, p_body text, p_link text, p_dedupe text, p_payload jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare r record; e citext;
begin
  for r in select id from public.profiles
           where is_active and (role = 'super_admin' or (role = 'admin' and p_permission = any(permissions))) loop
    insert into public.notifications (user_id, type, title, body, link, dedupe_key)
    values (r.id, p_event, p_title, p_body, p_link, p_dedupe)
    on conflict (user_id, dedupe_key) do nothing;
  end loop;
  for e in select * from public.admin_recipient_emails() loop
    insert into public.notification_queue (event, to_email, audience, subject, template, payload, dedupe_key)
    values (p_event, e, 'admin', p_title, p_event, coalesce(p_payload, '{}') || jsonb_build_object('audience', 'admin'), p_dedupe)
    on conflict (to_email, dedupe_key) do nothing;
  end loop;
end $$;

revoke all on function public.notify_user(uuid, citext, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.notify_admins(text, text, text, text, text, text, jsonb) from public, anon, authenticated;

create or replace function public.order_payload(o public.orders) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'order_id', o.id,
    'order_number', o.order_number,
    'status', o.status,
    'payment_status', o.payment_status,
    'currency', o.currency,
    'subtotal_cents', o.subtotal_cents,
    'discount_cents', o.discount_cents,
    'shipping_cents', o.shipping_cents,
    'tax_cents', o.tax_cents,
    'total_cents', o.total_cents,
    'tracking_number', o.tracking_number,
    'tracking_url', o.tracking_url,
    'carrier', o.carrier,
    'customer_email', o.email,
    'shipping_address', o.shipping_address,
    'occurred_at', now(),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('name', oi.name, 'variant', oi.variant_name, 'quantity', oi.quantity,
                                          'unit_price_cents', oi.unit_price_cents, 'line_total_cents', oi.line_total_cents))
      from public.order_items oi where oi.order_id = o.id), '[]'::jsonb)
  );
$$;

create or replace function public.notify_order_event(o public.orders, p_event text, p_title text, p_body text, p_suffix text default '')
returns void language plpgsql security definer set search_path = public as $$
declare payload jsonb; dk text;
begin
  payload := public.order_payload(o);
  dk := p_event || ':' || o.id::text || p_suffix;
  perform public.notify_user(o.user_id, o.email, p_event, p_title, p_body, '/dashboard/orders/' || o.id::text, dk, payload);
  perform public.notify_admins('orders', p_event, p_title || ' — ' || o.order_number, p_body, '/admin/orders/' || o.id::text, dk, payload);
end $$;

-- Orders: every important state change is turned into notifications by the database itself,
-- so it never depends on a browser staying open.
create or replace function public.orders_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare it record;
begin
  if tg_op = 'INSERT' then
    perform public.notify_order_event(new, 'order.placed', 'Order received', 'We received order ' || new.order_number || '. We will confirm it as soon as payment clears.');
    return new;
  end if;

  if new.payment_status is distinct from old.payment_status then
    if new.payment_status = 'paid' then
      perform public.notify_order_event(new, 'payment.success', 'Payment successful', 'Payment for order ' || new.order_number || ' was received.');
    elsif new.payment_status = 'failed' then
      perform public.notify_order_event(new, 'payment.failed', 'Payment failed', 'Payment for order ' || new.order_number || ' did not go through.', ':' || extract(epoch from now())::bigint::text);
    elsif new.payment_status = 'pending' then
      perform public.notify_order_event(new, 'payment.pending', 'Payment pending', 'Payment for order ' || new.order_number || ' is awaiting confirmation.', ':' || extract(epoch from now())::bigint::text);
    end if;
  end if;

  if new.status is distinct from old.status then
    case new.status
      when 'confirmed' then
        perform public.notify_order_event(new, 'order.confirmed', 'Order confirmed', 'Order ' || new.order_number || ' is confirmed.');
      when 'processing' then
        perform public.notify_order_event(new, 'order.processing', 'Order is being prepared', 'Order ' || new.order_number || ' is being prepared.');
      when 'shipped' then
        new.shipped_at := coalesce(new.shipped_at, now());
        perform public.notify_order_event(new, 'order.shipped', 'Order shipped', 'Order ' || new.order_number || ' is on its way.');
      when 'delivered' then
        new.delivered_at := coalesce(new.delivered_at, now());
        perform public.notify_order_event(new, 'order.delivered', 'Order delivered', 'Order ' || new.order_number || ' has been delivered.');
      when 'cancelled' then
        new.cancelled_at := coalesce(new.cancelled_at, now());
        perform public.notify_order_event(new, 'order.cancelled', 'Order cancelled', 'Order ' || new.order_number || ' was cancelled.');
        if old.payment_status = 'paid' then
          for it in select * from public.order_items where order_id = new.id and product_id is not null loop
            update public.products set stock_quantity = stock_quantity + it.quantity where id = it.product_id and track_inventory;
            if it.variant_id is not null then
              update public.product_variants set stock_quantity = stock_quantity + it.quantity where id = it.variant_id;
            end if;
            insert into public.inventory_movements (product_id, variant_id, delta, reason, order_id)
              values (it.product_id, it.variant_id, it.quantity, 'order_cancelled', new.id);
          end loop;
        end if;
      when 'refunded' then
        perform public.notify_order_event(new, 'refund.completed', 'Refund completed', 'Your refund for order ' || new.order_number || ' has been processed.');
      else null;
    end case;
  end if;

  if new.tracking_number is distinct from old.tracking_number and new.tracking_number is not null then
    perform public.notify_order_event(new, 'order.tracking', 'Tracking number added', 'Tracking number for order ' || new.order_number || ': ' || new.tracking_number, ':' || md5(new.tracking_number));
  end if;

  return new;
end $$;

create trigger trg_orders_notify_insert after insert on public.orders for each row execute function public.orders_notify();
-- BEFORE UPDATE so we can stamp shipped_at / delivered_at / cancelled_at on the row
create trigger trg_orders_notify_update before update on public.orders for each row execute function public.orders_notify();

-- Cancellation / return / refund requests
create or replace function public.order_requests_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare o public.orders; ev text; title text; payload jsonb; dk text;
begin
  select * into o from public.orders where id = new.order_id;
  payload := public.order_payload(o) || jsonb_build_object('request_kind', new.kind, 'request_status', new.status, 'reason', new.reason, 'admin_note', new.admin_note);

  if tg_op = 'INSERT' then
    ev := case new.kind when 'cancellation' then 'cancellation.requested' when 'return' then 'return.requested' else 'refund.requested' end;
    title := case new.kind when 'cancellation' then 'Cancellation requested' when 'return' then 'Return requested' else 'Refund requested' end;
    dk := ev || ':' || new.id::text;
    perform public.notify_user(o.user_id, o.email, ev, title, 'We received your request for order ' || o.order_number || '.', '/dashboard/orders/' || o.id::text, dk, payload);
    perform public.notify_admins('orders', ev, title || ' — ' || o.order_number, new.reason, '/admin/orders/' || o.id::text, dk, payload);
  elsif new.status is distinct from old.status then
    ev := case
      when new.kind = 'refund' and new.status = 'approved' then 'refund.approved'
      when new.kind = 'refund' and new.status = 'completed' then 'refund.completed'
      when new.kind = 'return' and new.status = 'approved' then 'return.approved'
      when new.kind = 'return' and new.status = 'rejected' then 'return.rejected'
      when new.kind = 'cancellation' and new.status = 'approved' then 'cancellation.approved'
      when new.kind = 'cancellation' and new.status = 'rejected' then 'cancellation.rejected'
      else 'request.updated' end;
    title := initcap(replace(ev, '.', ' '));
    dk := ev || ':' || new.id::text;
    perform public.notify_user(o.user_id, o.email, ev, title, 'Update on your request for order ' || o.order_number || '.', '/dashboard/orders/' || o.id::text, dk, payload);
    perform public.notify_admins('orders', ev, title || ' — ' || o.order_number, 'Request ' || new.status, '/admin/orders/' || o.id::text, dk, payload);
  end if;
  return new;
end $$;
create trigger trg_order_requests_notify after insert or update on public.order_requests
for each row execute function public.order_requests_notify();

-- New customer registration
create or replace function public.profiles_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'customer' then
    perform public.notify_user(new.id, new.email, 'account.welcome', 'Welcome to GLOWNEST', 'Your account is ready. Explore your personalised routine any time.', '/dashboard', 'account.welcome:' || new.id::text, jsonb_build_object('name', new.full_name));
    perform public.notify_admins('customers', 'customer.registered', 'New customer registered', coalesce(new.full_name, new.email::text), '/admin/customers', 'customer.registered:' || new.id::text, jsonb_build_object('email', new.email, 'name', new.full_name));
  end if;
  return new;
end $$;
create trigger trg_profiles_notify after insert on public.profiles for each row execute function public.profiles_notify();

-- Security events: e-mail changes, role changes
create or replace function public.profiles_security_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email is distinct from old.email then
    perform public.notify_user(new.id, old.email, 'security.email_changed', 'Your account email was changed', 'If this was not you, contact support immediately.', '/dashboard/profile', 'security.email_changed:' || new.id::text || ':' || md5(new.email::text), jsonb_build_object('new_email', new.email));
  end if;
  if new.role is distinct from old.role then
    perform public.notify_user(new.id, new.email, 'security.role_changed', 'Your account permissions changed', 'An administrator updated your access level.', '/dashboard', 'security.role_changed:' || new.id::text || ':' || new.role::text, jsonb_build_object('role', new.role));
  end if;
  return new;
end $$;
create trigger trg_profiles_security_notify after update on public.profiles for each row execute function public.profiles_security_notify();

-- New review
create or replace function public.reviews_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare pname text;
begin
  select name into pname from public.products where id = new.product_id;
  perform public.notify_admins('reviews', 'review.created', 'New review on ' || coalesce(pname, 'a product'), new.rating || '★ — ' || left(new.body, 120), '/admin/reviews', 'review.created:' || new.id::text,
    jsonb_build_object('product', pname, 'rating', new.rating, 'body', new.body, 'display_name', new.display_name));
  return new;
end $$;
create trigger trg_reviews_notify after insert on public.reviews for each row execute function public.reviews_notify();

-- New newsletter subscriber
create or replace function public.subscribers_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_admins('newsletter', 'newsletter.subscribed', 'New newsletter subscriber', new.email::text, '/admin/newsletter', 'newsletter.subscribed:' || new.id::text, jsonb_build_object('email', new.email));
  perform public.notify_user(new.user_id, new.email, 'newsletter.welcome', 'You are subscribed to GLOWNEST', 'Thanks for subscribing. You can unsubscribe at any time.', '/dashboard/newsletter', 'newsletter.welcome:' || new.id::text, jsonb_build_object('unsubscribe_token', new.unsubscribe_token));
  return new;
end $$;
create trigger trg_subscribers_notify after insert on public.newsletter_subscribers for each row execute function public.subscribers_notify();

-- Contact form → admins
create or replace function public.contact_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_admins('customers', 'contact.message', 'New contact message', new.name || ': ' || coalesce(new.subject, ''), '/admin/messages', 'contact.message:' || new.id::text,
    jsonb_build_object('name', new.name, 'email', new.email, 'subject', new.subject, 'message', new.message));
  return new;
end $$;
create trigger trg_contact_notify after insert on public.contact_messages for each row execute function public.contact_notify();

-- ───────────────────────── Queue worker helpers (service role) ─────────────────────────
-- Atomically claims due jobs; SKIP LOCKED makes concurrent workers safe (no double sends).
create or replace function public.claim_notifications(p_limit int default 25)
returns setof public.notification_queue
language plpgsql security definer set search_path = public as $$
begin
  return query
  with due as (
    select id from public.notification_queue
    where (status = 'pending' and next_attempt_at <= now())
       or (status = 'processing' and locked_at < now() - interval '10 minutes')  -- recover crashed workers
    order by next_attempt_at
    limit p_limit
    for update skip locked
  )
  update public.notification_queue q
     set status = 'processing', locked_at = now(), attempts = q.attempts + 1
    from due where q.id = due.id
  returning q.*;
end $$;

create or replace function public.complete_notification(p_id uuid, p_ok boolean, p_error text, p_message_id text)
returns void language plpgsql security definer set search_path = public as $$
declare q public.notification_queue;
begin
  select * into q from public.notification_queue where id = p_id for update;
  if not found then return; end if;
  if p_ok then
    update public.notification_queue set status = 'sent', sent_at = now(), provider_message_id = p_message_id, last_error = null, locked_at = null where id = p_id;
  elsif q.attempts >= q.max_attempts then
    update public.notification_queue set status = 'dead', last_error = left(p_error, 500), locked_at = null where id = p_id;
  else
    -- exponential backoff: 1, 2, 4, 8… minutes
    update public.notification_queue
       set status = 'pending', last_error = left(p_error, 500), locked_at = null,
           next_attempt_at = now() + (power(2, q.attempts - 1) * interval '1 minute')
     where id = p_id;
  end if;
end $$;

create or replace function public.claim_newsletter_deliveries(p_campaign uuid, p_limit int default 50)
returns setof public.newsletter_deliveries
language plpgsql security definer set search_path = public as $$
begin
  return query
  with due as (
    select id from public.newsletter_deliveries
    where campaign_id = p_campaign and status = 'pending'
    limit p_limit for update skip locked
  )
  update public.newsletter_deliveries d set status = 'processing', attempts = d.attempts + 1
    from due where d.id = due.id
  returning d.*;
end $$;

revoke all on function public.claim_notifications(int) from public, anon, authenticated;
revoke all on function public.complete_notification(uuid, boolean, text, text) from public, anon, authenticated;
revoke all on function public.claim_newsletter_deliveries(uuid, int) from public, anon, authenticated;
grant execute on function public.claim_notifications(int) to service_role;
grant execute on function public.complete_notification(uuid, boolean, text, text) to service_role;
grant execute on function public.claim_newsletter_deliveries(uuid, int) to service_role;

-- Subscribing: suppression-aware upsert (an unsubscribed/suppressed address is never silently re-subscribed by an admin import)
create or replace function public.subscribe_email(p_email citext, p_user uuid default null, p_source text default 'website')
returns jsonb language plpgsql security definer set search_path = public as $$
declare s public.newsletter_subscribers;
begin
  select * into s from public.newsletter_subscribers where email = p_email;
  if not found then
    insert into public.newsletter_subscribers (email, user_id, source) values (p_email, p_user, p_source);
    return jsonb_build_object('ok', true, 'status', 'subscribed');
  end if;
  if s.status = 'suppressed' then
    return jsonb_build_object('ok', false, 'status', 'suppressed');
  end if;
  if s.status = 'unsubscribed' and p_source <> 'website' and p_source <> 'dashboard' then
    return jsonb_build_object('ok', false, 'status', 'unsubscribed');
  end if;
  update public.newsletter_subscribers
     set status = 'subscribed', unsubscribed_at = null, consented_at = now(), user_id = coalesce(p_user, user_id)
   where id = s.id;
  return jsonb_build_object('ok', true, 'status', 'subscribed');
end $$;
revoke all on function public.subscribe_email(citext, uuid, text) from public, anon, authenticated;
grant execute on function public.subscribe_email(citext, uuid, text) to service_role;
