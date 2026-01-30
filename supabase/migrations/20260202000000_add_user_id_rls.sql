-- ============================================================================
-- Phase 3: Add user ownership + RLS policies
-- ============================================================================

-- Add user_id columns for ownership
alter table transactions
add column if not exists user_id uuid not null default auth.uid();

comment on column transactions.user_id is 'Owner user id (auth.uid) for row-level security.';

alter table receipts
add column if not exists user_id uuid not null default auth.uid();

comment on column receipts.user_id is 'Owner user id (auth.uid) for row-level security.';

alter table vendors
add column if not exists user_id uuid not null default auth.uid();

comment on column vendors.user_id is 'Owner user id (auth.uid) for row-level security.';

alter table import_sources
add column if not exists user_id uuid not null default auth.uid();

comment on column import_sources.user_id is 'Owner user id (auth.uid) for row-level security.';

alter table expense_categories
add column if not exists user_id uuid not null default auth.uid();

comment on column expense_categories.user_id is 'Owner user id (auth.uid) for row-level security.';

-- Enable Row Level Security
alter table transactions enable row level security;
alter table receipts enable row level security;
alter table vendors enable row level security;
alter table import_sources enable row level security;
alter table expense_categories enable row level security;
alter table transaction_business_info enable row level security;

-- Policies for ownership-based access

drop policy if exists transactions_select_own on transactions;
create policy transactions_select_own
on transactions
for select
using (auth.uid() = user_id);

drop policy if exists transactions_insert_own on transactions;
create policy transactions_insert_own
on transactions
for insert
with check (auth.uid() = user_id);

drop policy if exists transactions_update_own on transactions;
create policy transactions_update_own
on transactions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists transactions_delete_own on transactions;
create policy transactions_delete_own
on transactions
for delete
using (auth.uid() = user_id);


drop policy if exists receipts_select_own on receipts;
create policy receipts_select_own
on receipts
for select
using (auth.uid() = user_id);

drop policy if exists receipts_insert_own on receipts;
create policy receipts_insert_own
on receipts
for insert
with check (auth.uid() = user_id);

drop policy if exists receipts_update_own on receipts;
create policy receipts_update_own
on receipts
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists receipts_delete_own on receipts;
create policy receipts_delete_own
on receipts
for delete
using (auth.uid() = user_id);


drop policy if exists vendors_select_own on vendors;
create policy vendors_select_own
on vendors
for select
using (auth.uid() = user_id);

drop policy if exists vendors_insert_own on vendors;
create policy vendors_insert_own
on vendors
for insert
with check (auth.uid() = user_id);

drop policy if exists vendors_update_own on vendors;
create policy vendors_update_own
on vendors
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists vendors_delete_own on vendors;
create policy vendors_delete_own
on vendors
for delete
using (auth.uid() = user_id);


drop policy if exists import_sources_select_own on import_sources;
create policy import_sources_select_own
on import_sources
for select
using (auth.uid() = user_id);

drop policy if exists import_sources_insert_own on import_sources;
create policy import_sources_insert_own
on import_sources
for insert
with check (auth.uid() = user_id);

drop policy if exists import_sources_update_own on import_sources;
create policy import_sources_update_own
on import_sources
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists import_sources_delete_own on import_sources;
create policy import_sources_delete_own
on import_sources
for delete
using (auth.uid() = user_id);


drop policy if exists expense_categories_select_own on expense_categories;
create policy expense_categories_select_own
on expense_categories
for select
using (auth.uid() = user_id);

drop policy if exists expense_categories_insert_own on expense_categories;
create policy expense_categories_insert_own
on expense_categories
for insert
with check (auth.uid() = user_id);

drop policy if exists expense_categories_update_own on expense_categories;
create policy expense_categories_update_own
on expense_categories
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists expense_categories_delete_own on expense_categories;
create policy expense_categories_delete_own
on expense_categories
for delete
using (auth.uid() = user_id);

-- transaction_business_info access via owning transaction

drop policy if exists transaction_business_info_select_own on transaction_business_info;
create policy transaction_business_info_select_own
on transaction_business_info
for select
using (
  exists (
    select 1
    from transactions
    where transactions.id = transaction_business_info.transaction_id
      and transactions.user_id = auth.uid()
  )
);

drop policy if exists transaction_business_info_insert_own on transaction_business_info;
create policy transaction_business_info_insert_own
on transaction_business_info
for insert
with check (
  exists (
    select 1
    from transactions
    where transactions.id = transaction_business_info.transaction_id
      and transactions.user_id = auth.uid()
  )
);

drop policy if exists transaction_business_info_update_own on transaction_business_info;
create policy transaction_business_info_update_own
on transaction_business_info
for update
using (
  exists (
    select 1
    from transactions
    where transactions.id = transaction_business_info.transaction_id
      and transactions.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from transactions
    where transactions.id = transaction_business_info.transaction_id
      and transactions.user_id = auth.uid()
  )
);

drop policy if exists transaction_business_info_delete_own on transaction_business_info;
create policy transaction_business_info_delete_own
on transaction_business_info
for delete
using (
  exists (
    select 1
    from transactions
    where transactions.id = transaction_business_info.transaction_id
      and transactions.user_id = auth.uid()
  )
);
