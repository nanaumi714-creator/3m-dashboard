-- Phase 3: receipts storage ownership and policies
alter table public.receipts
  add column if not exists user_id uuid;

comment on column public.receipts.user_id is 'Owner user id for receipt storage access.';

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict do nothing;

alter table storage.objects enable row level security;

create policy "Receipts objects are readable by owner"
  on storage.objects
  for select
  using (bucket_id = 'receipts' and auth.uid() = owner);

comment on policy "Receipts objects are readable by owner" on storage.objects
  is 'Allow receipt owners to read their storage objects.';

create policy "Receipts objects are insertable by owner"
  on storage.objects
  for insert
  with check (bucket_id = 'receipts' and auth.uid() = owner);

comment on policy "Receipts objects are insertable by owner" on storage.objects
  is 'Allow receipt owners to upload to the receipts bucket.';

create policy "Receipts objects are updatable by owner"
  on storage.objects
  for update
  using (bucket_id = 'receipts' and auth.uid() = owner)
  with check (bucket_id = 'receipts' and auth.uid() = owner);

comment on policy "Receipts objects are updatable by owner" on storage.objects
  is 'Allow receipt owners to update their storage objects.';

create policy "Receipts objects are deletable by owner"
  on storage.objects
  for delete
  using (bucket_id = 'receipts' and auth.uid() = owner);

comment on policy "Receipts objects are deletable by owner" on storage.objects
  is 'Allow receipt owners to delete their storage objects.';
