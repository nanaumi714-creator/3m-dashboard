-- ============================================================================
-- Phase 5: Extended Asset Management (balance adjustments, card settlements)
-- ============================================================================

-- 1. Add opened_on to accounts for balance calculation start date
-- Transactions before this date will NOT be included in balance calculation
alter table accounts add column if not exists opened_on date;

comment on column accounts.opened_on is 'Balance tracking start date. Transactions before this date are excluded from balance calculation.';

-- Backfill: set opened_on to created_at for existing accounts
update accounts
set opened_on = date(created_at)
where opened_on is null;

-- Make opened_on required for future inserts (soft enforcement via app)
-- Note: keeping it nullable for backwards compatibility with existing data

-- 2. Extend accounts to support liability accounts (credit card payables)
-- Update the constraint to allow 'credit_payable' type
alter table accounts drop constraint if exists chk_accounts_asset_type;
alter table accounts add constraint chk_accounts_asset_type 
  check (asset_type in ('cash', 'qr', 'bank', 'emoney', 'credit_payable'));

-- Add account_type column to distinguish assets from liabilities
alter table accounts add column if not exists account_type text not null default 'asset';

alter table accounts drop constraint if exists chk_accounts_account_type;
alter table accounts add constraint chk_accounts_account_type 
  check (account_type in ('asset', 'liability'));

comment on column accounts.account_type is 'Account type: asset (positive balance) or liability (credit card unpaid).';

-- 3. Extend payment_methods to link to accounts
-- source_account_id: for immediate deduction (cash, debit, emoney, qr)
-- liability_account_id: for credit card payables
-- settlement_account_id: for credit card settlement (bank account)
alter table payment_methods add column if not exists source_account_id uuid references accounts(id);
alter table payment_methods add column if not exists liability_account_id uuid references accounts(id);
alter table payment_methods add column if not exists settlement_account_id uuid references accounts(id);

comment on column payment_methods.source_account_id is 'For immediate payments: account to deduct from.';
comment on column payment_methods.liability_account_id is 'For credit cards: account to record unpaid balance.';
comment on column payment_methods.settlement_account_id is 'For credit cards: bank account for monthly settlement.';

-- 4. Create balance_adjustments table for manual balance corrections
create table if not exists balance_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  adjusted_on date not null,
  amount_yen bigint not null, -- positive or negative adjustment
  reason text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  constraint chk_balance_adjustments_reason_nonempty check (length(trim(reason)) > 0)
);

comment on table balance_adjustments is 'Manual balance adjustments for correcting discrepancies.';
comment on column balance_adjustments.account_id is 'Target account for adjustment.';
comment on column balance_adjustments.adjusted_on is 'Date of adjustment (for balance calculation ordering).';
comment on column balance_adjustments.amount_yen is 'Adjustment amount: positive increases balance, negative decreases.';
comment on column balance_adjustments.reason is 'Required reason for audit trail.';

create index if not exists idx_balance_adjustments_user on balance_adjustments(user_id);
create index if not exists idx_balance_adjustments_account on balance_adjustments(account_id);
create index if not exists idx_balance_adjustments_date on balance_adjustments(adjusted_on);

-- 5. Create card_settlements table for credit card bill payments
create table if not exists card_settlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  liability_account_id uuid not null references accounts(id) on delete restrict,
  settlement_account_id uuid not null references accounts(id) on delete restrict,
  settled_on date not null,
  amount_yen bigint not null,
  billing_period_start date,
  billing_period_end date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  constraint chk_card_settlements_amount_positive check (amount_yen > 0),
  constraint chk_card_settlements_accounts_distinct check (liability_account_id <> settlement_account_id)
);

comment on table card_settlements is 'Credit card bill payments. Reduces both liability and bank account balance.';
comment on column card_settlements.liability_account_id is 'Credit card unpaid balance account.';
comment on column card_settlements.settlement_account_id is 'Bank account for payment.';
comment on column card_settlements.settled_on is 'Date of settlement.';
comment on column card_settlements.amount_yen is 'Settlement amount in JPY.';
comment on column card_settlements.billing_period_start is 'Optional: billing period start date.';
comment on column card_settlements.billing_period_end is 'Optional: billing period end date.';

create index if not exists idx_card_settlements_user on card_settlements(user_id);
create index if not exists idx_card_settlements_settled on card_settlements(settled_on);
create index if not exists idx_card_settlements_liability on card_settlements(liability_account_id);
create index if not exists idx_card_settlements_settlement on card_settlements(settlement_account_id);

-- 6. Triggers for updated_at
drop trigger if exists trg_balance_adjustments_set_updated_at on balance_adjustments;
create trigger trg_balance_adjustments_set_updated_at
before update on balance_adjustments
for each row execute function set_updated_at();

drop trigger if exists trg_card_settlements_set_updated_at on card_settlements;
create trigger trg_card_settlements_set_updated_at
before update on card_settlements
for each row execute function set_updated_at();

-- 7. Enable RLS and policies for new tables
alter table balance_adjustments enable row level security;
alter table card_settlements enable row level security;

-- Balance adjustments policies
drop policy if exists balance_adjustments_select_own on balance_adjustments;
create policy balance_adjustments_select_own on balance_adjustments
for select using (auth.uid() = user_id);

drop policy if exists balance_adjustments_insert_own on balance_adjustments;
create policy balance_adjustments_insert_own on balance_adjustments
for insert with check (
  auth.uid() = user_id
  and exists (
    select 1 from accounts a
    where a.id = balance_adjustments.account_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists balance_adjustments_update_own on balance_adjustments;
create policy balance_adjustments_update_own on balance_adjustments
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists balance_adjustments_delete_own on balance_adjustments;
create policy balance_adjustments_delete_own on balance_adjustments
for delete using (auth.uid() = user_id);

-- Card settlements policies
drop policy if exists card_settlements_select_own on card_settlements;
create policy card_settlements_select_own on card_settlements
for select using (auth.uid() = user_id);

drop policy if exists card_settlements_insert_own on card_settlements;
create policy card_settlements_insert_own on card_settlements
for insert with check (
  auth.uid() = user_id
  and exists (
    select 1 from accounts a
    where a.id = card_settlements.liability_account_id
      and a.user_id = auth.uid()
  )
  and exists (
    select 1 from accounts a
    where a.id = card_settlements.settlement_account_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists card_settlements_update_own on card_settlements;
create policy card_settlements_update_own on card_settlements
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists card_settlements_delete_own on card_settlements;
create policy card_settlements_delete_own on card_settlements
for delete using (auth.uid() = user_id);

-- 8. Create view for account balances (event-sourced calculation)
-- This view calculates current balance from events, not stored snapshots
create or replace view account_balances as
select
  a.id,
  a.user_id,
  a.name,
  a.asset_type,
  a.account_type,
  a.opened_on,
  a.opening_balance_yen,
  a.is_active,
  a.created_at,
  a.updated_at,
  -- Calculate current balance based on account type
  case
    when a.account_type = 'asset' then
      coalesce(a.opening_balance_yen, 0)
      + coalesce(bal.income, 0)
      + coalesce(bal.expense, 0)  -- expense is negative
      + coalesce(bal.transfer_in, 0)
      - coalesce(bal.transfer_out, 0)
      - coalesce(bal.settlements_paid, 0)
      + coalesce(bal.adjustments, 0)
    when a.account_type = 'liability' then
      coalesce(bal.liability_charges, 0)
      - coalesce(bal.liability_settled, 0)
    else 0
  end as current_balance_yen
from accounts a
left join lateral (
  -- Income (positive amounts from transactions linked via payment_methods)
  select sum(case when t.amount_yen > 0 then t.amount_yen else 0 end) as income,
         -- Expense (negative amounts)
         sum(case when t.amount_yen < 0 then t.amount_yen else 0 end) as expense,
         -- Liability charges (credit card transactions)
         sum(case when t.amount_yen < 0 then abs(t.amount_yen) else 0 end) as liability_charges
  from transactions t
  inner join payment_methods pm on pm.id = t.payment_method_id
  where (pm.source_account_id = a.id or pm.liability_account_id = a.id)
    and (a.opened_on is null or t.occurred_on >= a.opened_on)
) tx_agg on true
left join lateral (
  select coalesce(sum(tr.amount_yen), 0) as transfer_in
  from transfers tr
  where tr.to_account_id = a.id
    and (a.opened_on is null or tr.occurred_on >= a.opened_on)
) tr_in on true
left join lateral (
  select coalesce(sum(tr.amount_yen), 0) as transfer_out
  from transfers tr
  where tr.from_account_id = a.id
    and (a.opened_on is null or tr.occurred_on >= a.opened_on)
) tr_out on true
left join lateral (
  select coalesce(sum(cs.amount_yen), 0) as settlements_paid
  from card_settlements cs
  where cs.settlement_account_id = a.id
    and (a.opened_on is null or cs.settled_on >= a.opened_on)
) settle_pay on true
left join lateral (
  select coalesce(sum(cs.amount_yen), 0) as liability_settled
  from card_settlements cs
  where cs.liability_account_id = a.id
    and (a.opened_on is null or cs.settled_on >= a.opened_on)
) settle_liab on true
left join lateral (
  select coalesce(sum(ba.amount_yen), 0) as adjustments
  from balance_adjustments ba
  where ba.account_id = a.id
    and (a.opened_on is null or ba.adjusted_on >= a.opened_on)
) adj on true
cross join lateral (
  select
    tx_agg.income,
    tx_agg.expense,
    tx_agg.liability_charges,
    tr_in.transfer_in,
    tr_out.transfer_out,
    settle_pay.settlements_paid,
    settle_liab.liability_settled,
    adj.adjustments
) bal;

comment on view account_balances is 'Real-time account balances calculated from events (event sourcing pattern).';
