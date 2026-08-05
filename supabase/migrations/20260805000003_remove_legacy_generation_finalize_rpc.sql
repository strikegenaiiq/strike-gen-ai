-- Remove the pre-storage function signature so only the storage-aware RPC remains callable.
drop function if exists public.finalize_generation_job(uuid, text, text, text);
