-- Generation completion must be tied to its source job so provider retries
-- cannot create duplicate assets or token ledger entries.

alter table public.generated_assets
  add column if not exists generation_job_id uuid references public.generation_jobs(id);

create unique index if not exists generated_assets_generation_job_id_unique
  on public.generated_assets (generation_job_id)
  where generation_job_id is not null;

create unique index if not exists token_ledgers_video_generation_reference_unique
  on public.token_ledgers (reference)
  where transaction_type = 'video_generation' and reference is not null;

create or replace function public.finalize_generation_job(
  p_job_id uuid,
  p_status text,
  p_output_url text default null,
  p_error_message text default null
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
  select *
    into v_job
  from public.generation_jobs
  where id = p_job_id
  for update;

  if not found then
    raise exception 'generation job not found';
  end if;

  if v_job.status in ('completed', 'failed') then
    return jsonb_build_object('status', 'already_processed');
  end if;

  if p_status = 'completed' then
    v_tokens := coalesce((v_job.request ->> 'tokens_to_charge')::integer, 0);

    if v_tokens <= 0 then
      raise exception 'invalid token charge for generation job';
    end if;

    insert into public.generated_assets (
      generation_job_id,
      user_id,
      project_id,
      asset_type,
      provider,
      storage_url,
      generation_status,
      tokens_consumed,
      meta_parameters
    ) values (
      v_job.id,
      v_job.user_id,
      v_job.project_id,
      'video',
      v_job.provider,
      p_output_url,
      'completed',
      v_tokens,
      v_job.request
    )
    returning id into v_asset_id;

    insert into public.token_ledgers (
      user_id,
      amount,
      transaction_type,
      entry_type,
      reference,
      description
    ) values (
      v_job.user_id,
      -v_tokens,
      'video_generation',
      'consumption',
      v_job.id::text,
      'Video generation: ' || coalesce(v_job.model, 'unknown')
    );

    update public.generation_jobs
      set status = 'completed', progress = 100, updated_at = now()
    where id = v_job.id;

    return jsonb_build_object('status', 'completed', 'asset_id', v_asset_id);
  end if;

  if p_status = 'failed' then
    insert into public.generated_assets (
      generation_job_id,
      user_id,
      project_id,
      asset_type,
      provider,
      generation_status,
      tokens_consumed,
      meta_parameters,
      error_message
    ) values (
      v_job.id,
      v_job.user_id,
      v_job.project_id,
      'video',
      v_job.provider,
      'failed',
      0,
      v_job.request,
      coalesce(p_error_message, 'Generation failed')
    )
    returning id into v_asset_id;

    update public.generation_jobs
      set status = 'failed', progress = 0, updated_at = now()
    where id = v_job.id;

    return jsonb_build_object('status', 'failed', 'asset_id', v_asset_id);
  end if;

  raise exception 'unsupported generation completion status';
end;
$$;

revoke all on function public.finalize_generation_job(uuid, text, text, text) from public;
grant execute on function public.finalize_generation_job(uuid, text, text, text) to service_role;
