-- ============================================================================
-- Phase 1: Core tables for transaction tracking + future expense calculation
-- ============================================================================

-- Extensions
create extension if not exists pgcrypto;

-- payment_methods: cards, cash, e-money, etc.
create table if not exists payment_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null, -- cash/bank/credit/emoney/qr/other
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- import_sources: track where transactions came from
create table if not exists import_sources (
  id uuid primary key default gen_random_uuid(),
  source_type text not null, -- csv/gmail/form/manual
  imported_at timestamptz not null default now(),
  file_path text,
  checksum text, -- file-level hash to prevent re-import
  metadata jsonb, -- flexible storage for source-specific info
  created_at timestamptz not null default now()
);

-- transactions: core financial records
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  occurred_on date not null,
  amount_yen bigint not null, -- negative for expenses, positive for income
  description text not null,
  payment_method_id uuid not null references payment_methods(id),
  import_source_id uuid references import_sources(id),
  source_row_number int, -- row number in CSV, null for manual entry
  vendor_raw text, -- original vendor name from import
  vendor_norm text, -- normalized vendor name (Phase 2: link to vendors table)
  fingerprint text not null, -- SHA256 hash for duplicate detection
  duplicate_group_id uuid, -- manual merge of duplicates
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_transactions_amount_nonzero check (amount_yen <> 0),
  constraint chk_transactions_fingerprint_nonempty check (length(trim(fingerprint)) > 0)
);

create index if not exists idx_transactions_occurred_on on transactions(occurred_on);
create index if not exists idx_transactions_fingerprint on transactions(fingerprint);
create index if not exists idx_transactions_vendor_norm on transactions(vendor_norm);

-- Prevent double-import of same row from same source
create unique index if not exists ux_transactions_import_row
  on transactions(import_source_id, source_row_number)
  where import_source_id is not null and source_row_number is not null;

-- transaction_business_info: expense judgment (separate table for auditability)
create table if not exists transaction_business_info (
  transaction_id uuid primary key references transactions(id) on delete cascade,
  is_business boolean not null,
  business_ratio int not null default 100 check (business_ratio between 0 and 100),
  category_id uuid, -- Phase 2: FK to expense_categories (added below)
  judged_at timestamptz not null default now(),
  judged_by text, -- user who made the judgment
  audit_note text
);

-- receipts: attachments for transactions
create table if not exists receipts (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references transactions(id),
  storage_url text not null,
  original_filename text,
  content_type text,
  file_size_bytes int,
  uploaded_at timestamptz not null default now(),
  ocr_text text, -- Phase 3: OCR extraction
  ocr_confidence numeric(5,4) -- Phase 3: OCR quality score
);

create index if not exists idx_receipts_transaction_id on receipts(transaction_id);

-- Trigger: auto-update updated_at on transactions
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_transactions_set_updated_at on transactions;
create trigger trg_transactions_set_updated_at
before update on transactions
for each row execute function set_updated_at();

-- Seed data: basic payment methods (optional, can delete if not needed)
insert into payment_methods (name, type) values
  ('現金', 'cash'),
  ('銀行振込', 'bank')
on conflict do nothing;

-- ============================================================================
-- Phase 2: Vendor Management + Categories
-- ============================================================================

-- expense_categories: business expense categories for better organization
create table if not exists expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- vendors: master table for vendor normalization
create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, -- canonical vendor name
  description text,
  default_category_id uuid references expense_categories(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- vendor_aliases: multiple names that map to the same vendor
create table if not exists vendor_aliases (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors(id) on delete cascade,
  alias text not null,
  confidence_score numeric(3,2) default 1.0, -- 0.0-1.0, for fuzzy matching
  created_at timestamptz not null default now(),
  
  constraint chk_vendor_aliases_confidence check (confidence_score between 0.0 and 1.0)
);

create unique index if not exists ux_vendor_aliases_alias on vendor_aliases(lower(trim(alias)));
create index if not exists idx_vendor_aliases_vendor_id on vendor_aliases(vendor_id);

-- vendor_rules: automation rules for vendor-based judgment
create table if not exists vendor_rules (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors(id) on delete cascade,
  is_business boolean not null,
  business_ratio int not null default 100 check (business_ratio between 0 and 100),
  category_id uuid references expense_categories(id),
  rule_priority int not null default 100, -- lower number = higher priority
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by text,
  note text
);

create index if not exists idx_vendor_rules_vendor_id on vendor_rules(vendor_id);
create index if not exists idx_vendor_rules_priority on vendor_rules(rule_priority);

-- Add vendor_id to transactions table for Phase 2 vendor linking
alter table transactions 
add column if not exists vendor_id uuid references vendors(id);

create index if not exists idx_transactions_vendor_id on transactions(vendor_id);

-- Add FK constraint to transaction_business_info for categories
alter table transaction_business_info 
add constraint fk_transaction_business_info_category 
foreign key (category_id) references expense_categories(id);

-- Trigger: auto-update updated_at on vendors
drop trigger if exists trg_vendors_set_updated_at on vendors;
create trigger trg_vendors_set_updated_at
before update on vendors
for each row execute function set_updated_at();

-- Seed data: basic expense categories
insert into expense_categories (name, description) values
  ('事務用品', 'Office supplies, stationery'),
  ('通信費', 'Internet, phone, hosting'),
  ('交通費', 'Transportation, travel'),
  ('会議費', 'Meeting expenses, meals'),
  ('研修費', 'Training, books, courses'),
  ('その他', 'Other business expenses')
on conflict (name) do nothing;

-- Comments for Phase 2 tables
comment on table expense_categories is 'Phase 2: Business expense categories for better organization';
comment on table vendors is 'Phase 2: Master table for vendor normalization and rules';
comment on table vendor_aliases is 'Phase 2: Multiple names that map to the same vendor';
comment on table vendor_rules is 'Phase 2: Automation rules for vendor-based expense judgment';
