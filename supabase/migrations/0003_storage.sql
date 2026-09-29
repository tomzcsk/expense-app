-- Private bucket, constrained to receipt-shaped files ≤ 10 MB (server-side, so a
-- direct upload can't bypass the form's `accept` hint — see 0009 for the matching
-- UPDATE applied to buckets provisioned before these limits existed).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts', 'receipts', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'image/heic', 'image/heif', 'application/pdf']
)
on conflict (id) do nothing;

-- Authenticated users may upload to a folder named after their own uid.
create policy "receipt upload own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

-- Owner reads own; managers read all receipts.
create policy "receipt read own"
  on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and (
    (storage.foldername(name))[1] = auth.uid()::text or public.is_manager()
  ));
