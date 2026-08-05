create or replace function public.fulfill_payment(
  p_user_id uuid,
  p_tx_ref text,
  p_payment_type text,
  p_plan_id smallint default null,
  p_pack_id bigint default null,
  p_amount_paid numeric default null,
  p_currency text default 'NGN',
  p_provider text default 'unknown'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_intent payment_intents%rowtype;
  v_credit_amount int;
  v_payment_id uuid;
  v_subscription_id uuid;
begin
  select * into v_intent
  from payment_intents
  where tx_ref = p_tx_ref
  for update;

  if not found then
    return jsonb_build_object('status','error','reason','payment_intent_not_found');
  end if;

  if v_intent.user_id is distinct from p_user_id then
    return jsonb_build_object('status','error','reason','payment_user_mismatch');
  end if;

  if v_intent.status = 'fulfilled' then
    return jsonb_build_object('status','already_processed');
  end if;

  if v_intent.status = 'expired' or v_intent.expires_at <= now() then
    update payment_intents set status = 'expired' where id = v_intent.id and status = 'pending';
    return jsonb_build_object('status','error','reason','payment_intent_expired');
  end if;

  if v_intent.status <> 'pending' then
    return jsonb_build_object('status','error','reason','invalid_payment_intent_state');
  end if;

  if p_payment_type is distinct from v_intent.payment_type then
    return jsonb_build_object('status','error','reason','payment_type_mismatch');
  end if;

  if p_amount_paid is null or p_amount_paid <> v_intent.expected_amount then
    return jsonb_build_object('status','error','reason','amount_mismatch');
  end if;

  if p_currency is null or upper(p_currency) <> upper(v_intent.expected_currency) then
    return jsonb_build_object('status','error','reason','currency_mismatch');
  end if;

  if p_provider not in ('paystack','flutterwave','stripe','manual') then
    return jsonb_build_object('status','error','reason','unsupported_provider');
  end if;

  if v_intent.payment_type = 'subscription' then
    if p_plan_id is distinct from v_intent.plan_id or p_pack_id is not null then
      return jsonb_build_object('status','error','reason','plan_or_pack_mismatch');
    end if;

    select monthly_tokens into v_credit_amount
    from subscription_plans
    where id = v_intent.plan_id and is_active;
  else
    if p_pack_id is distinct from v_intent.pack_id or p_plan_id is not null then
      return jsonb_build_object('status','error','reason','plan_or_pack_mismatch');
    end if;

    select credits into v_credit_amount
    from token_packs
    where id = v_intent.pack_id and is_active;
  end if;

  if v_credit_amount is null then
    return jsonb_build_object('status','error','reason','unknown_plan_or_pack');
  end if;

  if exists (select 1 from payments where payment_reference = p_tx_ref) then
    update payment_intents set status = 'fulfilled' where id = v_intent.id;
    return jsonb_build_object('status','already_processed');
  end if;

  insert into payments (user_id, provider, payment_reference, amount, currency, status, payment_type, paid_at)
  values (v_intent.user_id, p_provider, p_tx_ref, v_intent.expected_amount, upper(v_intent.expected_currency), 'successful', v_intent.payment_type, now())
  returning id into v_payment_id;

  if v_intent.payment_type = 'subscription' then
    insert into subscriptions (user_id, plan_id, provider, status, current_period_start, current_period_end)
    values (v_intent.user_id, v_intent.plan_id, p_provider, 'active', now(), now() + interval '30 days')
    on conflict (user_id) where status = 'active'
    do update set plan_id = v_intent.plan_id, status = 'active',
      current_period_start = now(), current_period_end = now() + interval '30 days',
      provider = p_provider, updated_at = now()
    returning id into v_subscription_id;

    update profiles set tier_level = v_intent.plan_id, subscription_status = 'active', updated_at = now()
    where id = v_intent.user_id;

    update payments set subscription_id = v_subscription_id where id = v_payment_id;
  end if;

  insert into token_ledgers (user_id, subscription_id, payment_id, amount, transaction_type, entry_type, reference, description)
  values (
    v_intent.user_id, v_subscription_id, v_payment_id, v_credit_amount,
    case when v_intent.payment_type = 'subscription' then 'monthly_allocation' else 'purchase' end,
    case when v_intent.payment_type = 'subscription' then 'subscription_grant' else 'top_up' end,
    p_tx_ref,
    initcap(p_provider) || ' fulfillment: ' || v_intent.payment_type
  );

  update payment_intents set status = 'fulfilled' where id = v_intent.id;

  insert into audit_logs (action, target_type, target_id, description, metadata)
  values (
    p_provider || '_webhook', 'payment', v_payment_id,
    'Fulfilled ' || v_intent.payment_type,
    jsonb_build_object('tx_ref', p_tx_ref, 'credited', v_credit_amount, 'plan_id', v_intent.plan_id, 'pack_id', v_intent.pack_id, 'provider', p_provider)
  );

  return jsonb_build_object('status','fulfilled','payment_id',v_payment_id,'credited',v_credit_amount);
end;
$function$;

revoke execute on function public.fulfill_payment(uuid, text, text, smallint, bigint, numeric, text, text) from anon, authenticated;
revoke execute on function public.fulfill_flutterwave_payment(uuid, text, text, smallint, bigint, numeric, text, text) from anon, authenticated;
