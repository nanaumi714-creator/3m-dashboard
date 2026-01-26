-- ============================================================================
-- Phase 3: Search indexes for pg_bigm
-- ============================================================================

create index if not exists idx_transactions_description_bigm
  on transactions using gin (description gin_bigm_ops);

create index if not exists idx_transactions_vendor_raw_bigm
  on transactions using gin (vendor_raw gin_bigm_ops);

create index if not exists idx_receipts_ocr_text_bigm
  on receipts using gin (ocr_text gin_bigm_ops);

comment on index idx_transactions_description_bigm is 'Phase 3: pg_bigm index for description searches.';
comment on index idx_transactions_vendor_raw_bigm is 'Phase 3: pg_bigm index for vendor_raw searches.';
comment on index idx_receipts_ocr_text_bigm is 'Phase 3: pg_bigm index for OCR text searches.';
