-- Ensure payment_methods has user_id column (it was missing from earlier migrations)
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- UNIQUE constraints do not support WHERE clauses; using a UNIQUE INDEX instead.
-- This ensures system defaults (user_id IS NULL) are unique by name.
CREATE UNIQUE INDEX IF NOT EXISTS ux_payment_methods_name_system 
ON payment_methods (name) 
WHERE user_id IS NULL;

INSERT INTO payment_methods (name, type) VALUES
  ('現金', 'cash'),
  ('銀行振込', 'bank'),
  ('QR決済', 'qr'),
  ('カード', 'credit'),
  ('電子マネー', 'emoney')
ON CONFLICT DO NOTHING;
