-- GLOWNEST — durable rate limiting (works across serverless instances)
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits int not null default 1,
  primary key (key, window_start)
);
alter table public.rate_limits enable row level security;  -- no policies: service role only

create or replace function public.check_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
declare w timestamptz; h int;
begin
  w := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.rate_limits (key, window_start) values (p_key, w)
    on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
    returning hits into h;
  delete from public.rate_limits where window_start < now() - interval '1 day';
  return h <= p_max;
end $$;
revoke all on function public.check_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, int, int) to service_role;
