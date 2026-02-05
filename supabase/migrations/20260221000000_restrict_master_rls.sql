-- Tighten RLS on master tables and migrate orphaned records to an owner.

-- Assign existing records without a user_id to the earliest user (owner migration rule).
update expense_categories
set user_id = (
  select id
  from auth.users
  order by created_at
  limit 1
)
where user_id is null;

update payment_methods
set user_id = (
  select id
  from auth.users
  order by created_at
  limit 1
)
where user_id is null;

-- Ensure new records default to the current user.
alter table payment_methods
alter column user_id set default auth.uid();

comment on column payment_methods.user_id is 'Owner user id (auth.uid) for row-level security.';

-- Enforce owner-only access for master tables.
alter table payment_methods enable row level security;

-- expense_categories policies
DROP POLICY IF EXISTS expense_categories_select ON expense_categories;
DROP POLICY IF EXISTS expense_categories_select_own ON expense_categories;

CREATE POLICY expense_categories_select_own ON expense_categories
FOR SELECT USING (auth.uid() = user_id);

-- payment_methods policies
DROP POLICY IF EXISTS payment_methods_select ON payment_methods;
DROP POLICY IF EXISTS payment_methods_select_own ON payment_methods;

CREATE POLICY payment_methods_select_own ON payment_methods
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS payment_methods_insert_own ON payment_methods;
CREATE POLICY payment_methods_insert_own ON payment_methods
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS payment_methods_update_own ON payment_methods;
CREATE POLICY payment_methods_update_own ON payment_methods
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS payment_methods_delete_own ON payment_methods;
CREATE POLICY payment_methods_delete_own ON payment_methods
FOR DELETE USING (auth.uid() = user_id);
