-- Public, read-only bucket for phrase audio (American in the bucket root, British under gb/).
-- Writes happen only from the upload script with the service_role key, which bypasses RLS,
-- so no insert/update/delete policy is defined here.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('audio', 'audio', true, 5242880, array['audio/mpeg'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['audio/mpeg'];

create policy "audio bucket: public read"
  on storage.objects for select
  using (bucket_id = 'audio');
