-- Shop photo on the tenant, served from a public storage bucket.
alter table public.tenants
  add column if not exists logo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-logos',
  'business-logos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view business logos" on storage.objects;
create policy "Anyone can view business logos"
  on storage.objects for select
  using (bucket_id = 'business-logos');

drop policy if exists "Owners upload business logos" on storage.objects;
create policy "Owners upload business logos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] = (
      select tenant_id::text
      from public.profiles
      where id = auth.uid()
        and tenant_id is not null
        and role = 'VENDOR_ADMIN'
    )
  );

drop policy if exists "Owners update business logos" on storage.objects;
create policy "Owners update business logos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] = (
      select tenant_id::text
      from public.profiles
      where id = auth.uid()
        and tenant_id is not null
        and role = 'VENDOR_ADMIN'
    )
  )
  with check (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] = (
      select tenant_id::text
      from public.profiles
      where id = auth.uid()
        and tenant_id is not null
        and role = 'VENDOR_ADMIN'
    )
  );

drop policy if exists "Owners delete business logos" on storage.objects;
create policy "Owners delete business logos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] = (
      select tenant_id::text
      from public.profiles
      where id = auth.uid()
        and tenant_id is not null
        and role = 'VENDOR_ADMIN'
    )
  );
