-- Migration: create generation jobs and artifacts tables
-- NOTE: Planning-level migration stub. Review and adjust types/indexes/RLS before applying to production.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Jobs table: track model generation requests
CREATE TABLE IF NOT EXISTS public.generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  model_name text NOT NULL,
  params jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | running | completed | failed | cancelled
  replicate_job_id text, -- external provider job id
  is_long_running boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_id ON public.generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON public.generation_jobs(status);

-- Artifacts table: store metadata for generated artifacts (S3 keys stored in storage_key)
CREATE TABLE IF NOT EXISTS public.job_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.generation_jobs(id) ON DELETE CASCADE,
  storage_key text NOT NULL,
  mime_type text,
  size_bytes bigint,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_artifacts_job_id ON public.job_artifacts(job_id);

-- Credit ledger (planning stub) — production-ready ledger should include idempotency and reconciliation
CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  delta integer NOT NULL,
  balance integer,
  reason text,
  reference_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_id ON public.credit_ledger(user_id);
