-- Per-user category visibility preferences.
-- Keeps shared/system categories immutable while allowing each user to hide/show independently.

create table if not exists user_category_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references expense_categories(id) on delete cascade,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id)
);

comment on table user_category_preferences is 'Per-user visibility overrides for expense categories.';
comment on column user_category_preferences.user_id is 'Owner user id (auth.uid).';
comment on column user_category_preferences.category_id is 'Target expense category id.';
comment on column user_category_preferences.is_visible is 'Whether this category is visible for the user.';

drop trigger if exists trg_user_category_preferences_set_updated_at on user_category_preferences;
create trigger trg_user_category_preferences_set_updated_at
before update on user_category_preferences
for each row execute function set_updated_at();

alter table user_category_preferences enable row level security;

drop policy if exists user_category_preferences_select_own on user_category_preferences;
create policy user_category_preferences_select_own
on user_category_preferences
for select
using (auth.uid() = user_id);

drop policy if exists user_category_preferences_insert_own on user_category_preferences;
create policy user_category_preferences_insert_own
on user_category_preferences
for insert
with check (auth.uid() = user_id);

drop policy if exists user_category_preferences_update_own on user_category_preferences;
create policy user_category_preferences_update_own
on user_category_preferences
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists user_category_preferences_delete_own on user_category_preferences;
create policy user_category_preferences_delete_own
on user_category_preferences
for delete
using (auth.uid() = user_id);
