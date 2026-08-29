-- Product photos: public bucket + URL on products.
alter table public.products
  add column if not exists image_url text;

comment on column public.products.image_url is
  'Public URL of the product photo in the product-images bucket.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view product images" on storage.objects;
create policy "Anyone can view product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "Tenant members upload product images" on storage.objects;
create policy "Tenant members upload product images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (
      select tenant_id::text
      from public.profiles
      where id = auth.uid()
        and tenant_id is not null
    )
  );

drop policy if exists "Tenant members update product images" on storage.objects;
create policy "Tenant members update product images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (
      select tenant_id::text
      from public.profiles
      where id = auth.uid()
        and tenant_id is not null
    )
  )
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (
      select tenant_id::text
      from public.profiles
      where id = auth.uid()
        and tenant_id is not null
    )
  );

drop policy if exists "Tenant members delete product images" on storage.objects;
create policy "Tenant members delete product images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (
      select tenant_id::text
      from public.profiles
      where id = auth.uid()
        and tenant_id is not null
    )
  );
