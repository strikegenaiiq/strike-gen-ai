-- Allow authenticated users to read only generated videos they own.
-- The bucket remains private; the policy only permits signed URL creation for owned assets.

create policy "Users can read their generated videos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'generated-videos'
  and exists (
    select 1
    from public.generated_assets as ga
    where ga.storage_bucket = storage.objects.bucket_id
      and ga.storage_path = storage.objects.name
      and ga.user_id = auth.uid()
  )
);
