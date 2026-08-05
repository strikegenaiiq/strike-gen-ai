# infra/worker/README.md

Long-job worker (PoC) — runloop and deployment notes

Purpose
- This document is a planning-level runbook for the long-running video generation worker (5–15 minute jobs).
- The worker should be containerized and run on an infra capable of long CPU/GPU tasks (do NOT run heavy jobs in Vercel serverless functions).

Runloop (high level)
1. Poll the database (generation_jobs) for rows with status = 'pending' AND is_long_running = true.
2. Acquire a lease/lock (row-level locking or advisory lock) to avoid double-processing.
3. Update the job status to 'running' and record a started_at timestamp.
4. Submit a request to Replicate (or other provider) and stream logs/output where supported.
5. On completion, upload generated artifacts to S3 and create job_artifacts rows.
6. Update the job status to 'completed' (or 'failed' with error details).
7. Emit metrics and logs for monitoring and alerting.

Environment variables (examples — do NOT commit secrets)
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY (worker-only service role for DB writes)
- REPLICATE_API_TOKEN
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- S3_BUCKET_NAME
- S3_UPLOAD_REGION
- WORKER_CONCURRENCY (tunable integer)

Operational notes
- Use a small, configurable concurrency value initially (e.g., 1–2) and scale up after load testing.
- Implement robust retries with exponential backoff for transient provider errors.
- Keep idempotency keys for provider submissions so reprocessing does not create duplicate outputs or charges.
- Record detailed trace/log lines for each job run and surface in Sentry/monitoring.

Deployment
- Dockerfile + minimal entrypoint script recommended; keep the worker stateless.
- Provide resource sizing guidance in the Docker/infra manifest (CPU, memory, GPUs if required by provider/models).

This file is a planning artifact and does not modify runtime code.
