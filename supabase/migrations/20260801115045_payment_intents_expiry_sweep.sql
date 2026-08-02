create extension if not exists pg_cron;

create or replace function public.expire_stale_payment_intents()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update payment_intents
  set status = 'expired'
  where status = 'pending'
    and expires_at < now();
end;
$$;

select cron.schedule(
  'expire-stale-payment-intents',
  '*/5 * * * *',
  $$select public.expire_stale_payment_intents();$$
);
