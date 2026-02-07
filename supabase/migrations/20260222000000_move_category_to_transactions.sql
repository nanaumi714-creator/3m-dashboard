-- Move categories to transactions so they apply regardless of business judgment
-- Keeps transaction_business_info for business flags only

-- Add category_id to transactions
alter table transactions
  add column if not exists category_id uuid references expense_categories(id);

comment on column transactions.category_id is 'Category applied regardless of business judgment.';

create index if not exists idx_transactions_category_id on transactions(category_id);

-- Backfill from prior business info categories
update transactions t
set category_id = tbi.category_id
from transaction_business_info tbi
where tbi.transaction_id = t.id
  and tbi.category_id is not null
  and t.category_id is null;

comment on column transaction_business_info.category_id is 'Deprecated: categories now live on transactions.category_id.';