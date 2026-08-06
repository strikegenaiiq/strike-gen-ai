-- Reconcile generation economics and webhook delivery with the production flow.
-- Tokens are reserved atomically before provider submission, then finalized once.

create table if not exists public.generation_webhook_events (
  webhook_id text primary key,
  received_at timestamptz not null default now()
);

create index if not exists generation_webhook_events_received_at_idx
  on public.generation_webhook_events (received_at);

alter table public.generation_webhook_events enable row level security;

create unique index if not exists token_ledgers_generation_reservation_reference_unique
  on public.token_ledgers (reference)
  where transaction_type in ('video_generation_reservation', 'video_generation_refund')
    and reference is not null;

create or replace function public.reserve_generation_tokens(
  p_user_id uuid,
  p_job_id uuid,
  p_tokens integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance bigint;
begin
  if p_tokens is null or p_tokens <= 0 then
    raise exception 'invalid token reservation';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  if exists (
    select 1 from public.token_ledgers
    where reference = p_job_id::text and transaction_type = 'video_generation_reservation'
  ) then
    return jsonb_build_object('status', 'already_reserved', 'tokens', p_tokens);
  end if;

  select coalesce(sum(amount), 0) into v_balance
  from public.token_ledgers
  where user_id = p_user_id;

  if v_balance < p_tokens then
    raise exception 'insufficient token balance';
  end if;

  insert into public.token_ledgers (
    user_id, amount, transaction_type, entry_type, reference, description
  ) values (
    p_user_id, -p_tokens, 'video_generation_reservation', 'consumption',
    p_job_id::text, 'Reserved for video generation'
  );

  return jsonb_build_object('status', 'reserved', 'tokens', p_tokens, 'remaining', v_balance - p_tokens);
end;
$$;

create or replace function public.refund_generation_tokens(
  p_user_id uuid,
  p_job_id uuid,
  p_tokens integer,
  p_reason text default 'Generation failed'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_tokens is null or p_tokens <= 0 then
    raise exception 'invalid token refund';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  if not exists (
    select 1 from public.token_ledgers
    where user_id = p_user_id
      and reference = p_job_id::text
      and transaction_type = 'video_generation_reservation'
      and amount = -p_tokens
  ) then
    raise exception 'generation reservation not found';
  end if;

  if exists (
    select 1 from public.token_ledgers
    where user_id = p_user_id
      and reference = p_job_id::text
      and transaction_type = 'video_generation_refund'
  ) then
    return jsonb_build_object('status', 'already_refunded', 'tokens', p_tokens);
  end if;

  insert into public.token_ledgers (
    user_id, amount, transaction_type, entry_type, reference, description
  ) values (
    p_user_id, p_tokens, 'video_generation_refund', 'refund',
    p_job_id::text, p_reason
  );

  return jsonb_build_object('status', 'refunded', 'tokens', p_tokens);
end;
$$;

create or replace function public.finalize_generation_job(
  p_job_id uuid,
  p_status text,
  p_output_url text default null,
  p_error_message text default null,
  p_storage_bucket text default null,
  p_storage_path text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.generation_jobs%rowtype;
  v_tokens integer;
  v_asset_id uuid;
begin
  select * into v_job
  from public.generation_jobs
  where id = p_job_id
  for update;

  if not found then raise exception 'generation job not found'; end if;
  if v_job.status in ('completed', 'failed') then
    return jsonb_build_object('status', 'already_processed');
  end if;

  v_tokens := coalesce((v_job.request ->> 'tokens_to_charge')::integer, 0);
  if v_tokens <= 0 then raise exception 'invalid token charge for generation job'; end if;

  if p_status = 'completed' then
    if p_storage_bucket is null or p_storage_path is null then
      raise exception 'stored output is required for completed generation';
    end if;

    if not exists (
      select 1 from public.token_ledgers
      where user_id = v_job.user_id
        and reference = v_job.id::text
        and transaction_type = 'video_generation_reservation'
        and amount = -v_tokens
    ) then
      raise exception 'generation token reservation not found';
    end if;

    insert into public.generated_assets (
      generation_job_id, user_id, project_id, asset_type, provider,
      storage_url, storage_bucket, storage_path, generation_status,
      tokens_consumed, meta_parameters
    ) values (
      v_job.id, v_job.user_id, v_job.project_id, 'video', v_job.provider,
      null, p_storage_bucket, p_storage_path, 'completed', v_tokens, v_job.request
    ) returning id into v_asset_id;

    update public.generation_jobs
      set status = 'completed', progress = 100, updated_at = now()
    where id = v_job.id;

    return jsonb_build_object('status', 'completed', 'asset_id', v_asset_id, 'tokens_consumed', v_tokens);
  end if;

  if p_status = 'failed' then
    insert into public.generated_assets (
      generation_job_id, user_id, project_id, asset_type, provider,
      generation_status, tokens_consumed, meta_parameters, error_message
    ) values (
      v_job.id, v_job.user_id, v_job.project_id, 'video', v_job.provider,
      'failed', 0, v_job.request, coalesce(p_error_message, 'Generation failed')
    ) returning id into v_asset_id;

    perform public.refund_generation_tokens(
      v_job.user_id, v_job.id, v_tokens, coalesce(p_error_message, 'Generation failed')
    );

    update public.generation_jobs
      set status = 'failed', progress = 0, updated_at = now()
    where id = v_job.id;

    return jsonb_build_object('status', 'failed', 'asset_id', v_asset_id, 'tokens_refunded', v_tokens);
  end if;

  raise exception 'unsupported generation completion status';
end;
$$;

revoke all on function public.reserve_generation_tokens(uuid, uuid, integer) from public;
revoke all on function public.refund_generation_tokens(uuid, uuid, integer, text) from public;
revoke all on function public.finalize_generation_job(uuid, text, text, text, text, text) from public;
grant execute on function public.reserve_generation_tokens(uuid, uuid, integer) to service_role;
grant execute on function public.refund_generation_tokens(uuid, uuid, integer, text) to service_role;
grant execute on function public.finalize_generation_job(uuid, text, text, text, text, text) to service_role;
