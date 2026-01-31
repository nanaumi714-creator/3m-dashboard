-- ============================================================================
-- Phase 3: Search indexes for pg_bigm
-- ============================================================================

create index if not exists idx_transactions_description_trgm
  on transactions using gin (description gin_trgm_ops);

create index if not exists idx_transactions_vendor_raw_trgm
  on transactions using gin (vendor_raw gin_trgm_ops);

create index if not exists idx_receipts_ocr_text_trgm
  on receipts using gin (ocr_text gin_trgm_ops);

comment on index idx_transactions_description_trgm is 'Phase 3: pg_trgm index for description searches.';
comment on index idx_transactions_vendor_raw_trgm is 'Phase 3: pg_trgm index for vendor_raw searches.';
comment on index idx_receipts_ocr_text_trgm is 'Phase 3: pg_trgm index for OCR text searches.';
