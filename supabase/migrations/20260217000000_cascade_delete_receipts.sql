-- Add ON DELETE CASCADE to receipts.transaction_id
-- This ensures that when a transaction is deleted, associated receipt records are also cleaned up.

ALTER TABLE receipts
DROP CONSTRAINT IF EXISTS receipts_transaction_id_fkey;

ALTER TABLE receipts
ADD CONSTRAINT receipts_transaction_id_fkey
FOREIGN KEY (transaction_id)
REFERENCES transactions(id)
ON DELETE CASCADE;

-- Also check ocr_usage_logs (it already has ON DELETE SET NULL, but let's make it CASCADE if preferred)
-- For now, transaction_business_info already has CASCADE from initial_schema.sql.
