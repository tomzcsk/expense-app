insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
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
