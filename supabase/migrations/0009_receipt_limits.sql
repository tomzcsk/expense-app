-- Hardening (R-05): the `receipts` bucket previously had no server-side content
-- restriction — the form's `accept` attribute is only a browser hint, so an
-- authenticated user could upload arbitrary/oversized files straight into their
-- own folder. Constrain the bucket to receipt-shaped files and a sane size.
-- (0003 created the bucket with `on conflict do nothing`, so this UPDATE is what
--  actually applies the limits to the already-provisioned production bucket.)
update storage.buckets
set
  file_size_limit = 10485760, -- 10 MB — comfortable for a phone-photo receipt
  allowed_mime_types = array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'image/heic', 'image/heif', 'application/pdf'
  ]
where id = 'receipts';
