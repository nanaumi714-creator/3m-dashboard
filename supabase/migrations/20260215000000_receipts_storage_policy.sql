-- Phase 3: receipts storage ownership and policies


insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict do nothing;



create policy "Receipts objects are readable by owner"
  on storage.objects
  for select
  using (bucket_id = 'receipts' and auth.uid() = owner);



create policy "Receipts objects are insertable by owner"
  on storage.objects
  for insert
  with check (bucket_id = 'receipts' and auth.uid() = owner);



create policy "Receipts objects are updatable by owner"
  on storage.objects
  for update
  using (bucket_id = 'receipts' and auth.uid() = owner)
  with check (bucket_id = 'receipts' and auth.uid() = owner);



create policy "Receipts objects are deletable by owner"
  on storage.objects
  for delete
  using (bucket_id = 'receipts' and auth.uid() = owner);


