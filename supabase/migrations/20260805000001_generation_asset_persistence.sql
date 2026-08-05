-- Persist generated files independently of Replicate's temporary output URLs.
-- Replicate output files are temporary, so production assets must be copied into
-- our private generated-videos bucket before the generation is finalized.
alter table public.generated_assets
  add column if not exists generation_job_id uuid references public.generation_jobs(id) on delete restrict,
  add column if not exists storage_path text;

create unique index if not exists generated_assets_generation_job_id_unique
  on public.generated_assets(generation_job_id)
  where generation_job_id is not null;

create unique index if not exists token_ledgers_generation_reference_unique
  on public.token_ledgers(reference, transaction_type)
  where transaction_type = 'video_generation';

create index if not exists generated_assets_user_id_created_at_idx
  on public.generated_assets(user_id, created_at desc);

create index if not exists generation_jobs_user_id_created_at_idx
  on public.generation_jobs(user_id, created_at desc);
