-- ============================================================================
-- Phase 4: Asset management foundation (payment settlement, accounts, transfers)
-- ============================================================================

-- Add settlement timing to payment methods for payable vs immediate cash-out handling.
alter table payment_methods
add column if not exists settlement_timing text not null default 'immediate';

comment on column payment_methods.settlement_timing is 'Settlement timing for balance accounting: immediate or next_month.';

alter table payment_methods
  drop constraint if exists chk_payment_methods_settlement_timing;

alter table payment_methods
  add constraint chk_payment_methods_settlement_timing
  check (settlement_timing in ('immediate', 'next_month'));

-- Backfill existing methods by type.
update payment_methods
set settlement_timing = case
  when type = 'credit' then 'next_month'
  else 'immediate'
end
where settlement_timing is null
   or settlement_timing not in ('immediate', 'next_month');

-- Accounts: management places for balances (wallet, bank, PayPay, Suica, etc.)
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  asset_type text not null,
  opening_balance_yen bigint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_accounts_name_nonempty check (length(trim(name)) > 0),
  constraint chk_accounts_asset_type check (asset_type in ('cash', 'qr', 'bank', 'emoney'))
);

comment on table accounts is 'User-managed balance containers. No external API sync; internal bookkeeping only.';
comment on column accounts.user_id is 'Owner user id (auth.uid) for row-level security.';
comment on column accounts.name is 'Account display name such as 財布, 三菱UFJ銀行, PayPay, Suica.';
comment on column accounts.asset_type is 'Asset category: cash/qr/bank/emoney.';
comment on column accounts.opening_balance_yen is 'Opening/current baseline balance in JPY at operation start.';
comment on column accounts.is_active is 'Soft-delete flag for account management UI.';

create unique index if not exists ux_accounts_user_name on accounts (user_id, name);
create index if not exists idx_accounts_user_asset_type on accounts (user_id, asset_type);

-- Transfers: movements between user accounts.
create table if not exists transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  from_account_id uuid not null references accounts(id) on delete restrict,
  to_account_id uuid not null references accounts(id) on delete restrict,
  amount_yen bigint not null,
  occurred_on date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_transfers_amount_positive check (amount_yen > 0),
  constraint chk_transfers_accounts_distinct check (from_account_id <> to_account_id)
);

comment on table transfers is 'Internal fund movements between accounts. Not expense/income transactions.';
comment on column transfers.user_id is 'Owner user id (auth.uid) for row-level security.';
comment on column transfers.from_account_id is 'Source account for transfer outflow.';
comment on column transfers.to_account_id is 'Destination account for transfer inflow.';
comment on column transfers.amount_yen is 'Transfer amount in JPY. Always positive.';
comment on column transfers.occurred_on is 'Transfer execution date.';

create index if not exists idx_transfers_user_date on transfers (user_id, occurred_on desc);
create index if not exists idx_transfers_from_account on transfers (from_account_id);
create index if not exists idx_transfers_to_account on transfers (to_account_id);

-- updated_at trigger for new tables
drop trigger if exists trg_accounts_set_updated_at on accounts;
create trigger trg_accounts_set_updated_at
before update on accounts
for each row execute function set_updated_at();

drop trigger if exists trg_transfers_set_updated_at on transfers;
create trigger trg_transfers_set_updated_at
before update on transfers
for each row execute function set_updated_at();

-- Enable RLS and policies
alter table accounts enable row level security;
alter table transfers enable row level security;

drop policy if exists accounts_select_own on accounts;
create policy accounts_select_own on accounts
for select using (auth.uid() = user_id);

drop policy if exists accounts_insert_own on accounts;
create policy accounts_insert_own on accounts
for insert with check (auth.uid() = user_id);

drop policy if exists accounts_update_own on accounts;
create policy accounts_update_own on accounts
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists accounts_delete_own on accounts;
create policy accounts_delete_own on accounts
for delete using (auth.uid() = user_id);

drop policy if exists transfers_select_own on transfers;
create policy transfers_select_own on transfers
for select using (auth.uid() = user_id);

drop policy if exists transfers_insert_own on transfers;
create policy transfers_insert_own on transfers
for insert with check (
  auth.uid() = user_id
  and exists (
    select 1 from accounts a
    where a.id = transfers.from_account_id
      and a.user_id = auth.uid()
  )
  and exists (
    select 1 from accounts a
    where a.id = transfers.to_account_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists transfers_update_own on transfers;
create policy transfers_update_own on transfers
for update using (auth.uid() = user_id) with check (
  auth.uid() = user_id
  and exists (
    select 1 from accounts a
    where a.id = transfers.from_account_id
      and a.user_id = auth.uid()
  )
  and exists (
    select 1 from accounts a
    where a.id = transfers.to_account_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists transfers_delete_own on transfers;
create policy transfers_delete_own on transfers
for delete using (auth.uid() = user_id);

-- Default starter accounts (idempotent, per user) are intentionally omitted.
-- Users create accounts explicitly to keep bookkeeping auditable.
