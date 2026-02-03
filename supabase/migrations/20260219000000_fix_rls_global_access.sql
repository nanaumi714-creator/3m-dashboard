-- Fixed RLS policies for global visibility of system-defined categories and payment methods
-- Allows users to see both their own records and records where user_id is NULL (system defaults).

-- 1. expense_categories
DROP POLICY IF EXISTS expense_categories_select_own ON expense_categories;
CREATE POLICY expense_categories_select ON expense_categories
FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

-- 2. payment_methods
-- First ensure RLS is enabled (it might not have been enabled yet for this table)
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_methods_select ON payment_methods;
CREATE POLICY payment_methods_select ON payment_methods
FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS payment_methods_insert_own ON payment_methods;
CREATE POLICY payment_methods_insert_own ON payment_methods
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS payment_methods_update_own ON payment_methods;
CREATE POLICY payment_methods_update_own ON payment_methods
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS payment_methods_delete_own ON payment_methods;
CREATE POLICY payment_methods_delete_own ON payment_methods
FOR DELETE USING (auth.uid() = user_id);

-- Ensure user_id column in payment_methods has correct ownership for existing RLS setups
COMMENT ON COLUMN payment_methods.user_id IS 'Owner user id (auth.uid) for row-level security. NULL for system defaults.';
