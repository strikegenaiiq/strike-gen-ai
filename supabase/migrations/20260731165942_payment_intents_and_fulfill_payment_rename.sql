-- 1. payment_intents: locks the expected charge amount (and FX rate used)
--    at checkout initiation time, so webhook verification never has to
--    re-derive or guess an exchange rate later.
create table public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  tx_ref text not null unique,
  user_id uuid not null references public.profiles(id),
  payment_type text not null check (payment_type in ('subscription','token_purchase')),
  plan_id smallint references public.subscription_plans(id),
  pack_id bigint references public.token_packs(id),
  expected_amount numeric not null,
  expected_currency text not null,
  usd_reference_price numeric not null,
  fx_rate_used numeric,
  fx_rate_source text,
  fx_rate_fetched_at timestamptz,
  status text not null default 'pending' check (status in ('pending','fulfilled','expired')),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  created_at timestamptz not null default now()
);

alter table public.payment_intents enable row level security;

create policy "Users can view their own payment intents"
  on public.payment_intents for select
  using (auth.uid() = user_id);

create index idx_payment_intents_tx_ref on public.payment_intents(tx_ref);
create index idx_payment_intents_user_id on public.payment_intents(user_id);

-- 2. Rename fulfill_flutterwave_payment -> fulfill_payment, generalizing the
--    two hardcoded "flutterwave" strings. All idempotency and token-crediting
--    logic is preserved byte-for-byte.
create or replace function public.fulfill_payment(
  p_user_id uuid,
  p_tx_ref text,
  p_payment_type text,
  p_plan_id smallint default null,
  p_pack_id bigint default null,
  p_amount_paid numeric default null,
  p_currency text default 'NGN',
  p_provider text default 'unknown'
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_credit_amount int;
  v_payment_id uuid;
  v_subscription_id uuid;
begin
  if exists (select 1 from payments where payment_reference = p_tx_ref) then
    return jsonb_build_object('status','already_processed');
  end if;

  if p_payment_type = 'subscription' then
    select monthly_tokens into v_credit_amount from subscription_plans where id = p_plan_id and is_active;
  elsif p_payment_type = 'token_purchase' then
    select credits into v_credit_amount from token_packs where id = p_pack_id and is_active;
  else
    return jsonb_build_object('status','error','reason','invalid_payment_type');
  end if;

  if v_credit_amount is null then
    return jsonb_build_object('status','error','reason','unknown_plan_or_pack');
  end if;

  insert into payments (user_id, provider, payment_reference, amount, currency, status, payment_type, paid_at)
  values (p_user_id, p_provider, p_tx_ref, p_amount_paid, p_currency, 'successful', p_payment_type, now())
  returning id into v_payment_id;

  if p_payment_type = 'subscription' then
    insert into subscriptions (user_id, plan_id, provider, status, current_period_start, current_period_end)
    values (p_user_id, p_plan_id, p_provider, 'active', now(), now() + interval '30 days')
    on conflict (user_id) where status = 'active'
    do update set plan_id = p_plan_id, status = 'active',
      current_period_start = now(), current_period_end = now() + interval '30 days',
      provider = p_provider, updated_at = now()
    returning id into v_subscription_id;

    update profiles set tier_level = p_plan_id, subscription_status = 'active', updated_at = now()
    where id = p_user_id;

    update payments set subscription_id = v_subscription_id where id = v_payment_id;
  end if;

  insert into token_ledgers (user_id, subscription_id, payment_id, amount, transaction_type, entry_type, reference, description)
  values (
    p_user_id, v_subscription_id, v_payment_id, v_credit_amount,
    case when p_payment_type = 'subscription' then 'monthly_allocation' else 'purchase' end,
    case when p_payment_type = 'subscription' then 'subscription_grant' else 'top_up' end,
    p_tx_ref,
    initcap(p_provider) || ' fulfillment: ' || p_payment_type
  );

  update payment_intents set status = 'fulfilled' where tx_ref = p_tx_ref;

  insert into audit_logs (action, target_type, target_id, description, metadata)
  values (
    p_provider || '_webhook', 'payment', v_payment_id,
    'Fulfilled ' || p_payment_type,
    jsonb_build_object('tx_ref', p_tx_ref, 'credited', v_credit_amount, 'plan_id', p_plan_id, 'pack_id', p_pack_id, 'provider', p_provider)
  );

  return jsonb_build_object('status','fulfilled','payment_id',v_payment_id,'credited',v_credit_amount);
end;
$function$;

-- Old function kept temporarily as a thin wrapper so nothing breaks mid-deploy;
-- drop this once both edge functions are confirmed calling fulfill_payment.
create or replace function public.fulfill_flutterwave_payment(
  p_user_id uuid, p_tx_ref text, p_payment_type text,
  p_plan_id smallint default null, p_pack_id bigint default null,
  p_amount_paid numeric default null, p_currency text default 'NGN',
  p_provider text default 'flutterwave'
) returns jsonb
language sql
security definer
set search_path to 'public'
as $$
  select public.fulfill_payment(p_user_id, p_tx_ref, p_payment_type, p_plan_id, p_pack_id, p_amount_paid, p_currency, p_provider);
$$;
