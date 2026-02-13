-- ============================================================================
-- Phase 4: Harden exposed public objects (RLS + safe view execution)
-- ============================================================================

-- account_balances must run with caller permissions to respect base-table RLS.
alter view public.account_balances
set (security_invoker = true);

comment on view public.account_balances is 'Real-time account balances calculated from events (event sourcing pattern). SECURITY INVOKER to enforce caller RLS.';

-- Add explicit ownership columns for user-scoped Phase 3 artifacts.
alter table public.export_templates
add column if not exists user_id uuid references auth.users(id);

comment on column public.export_templates.user_id is 'Owner user id (auth.uid) for row-level security.';

alter table public.export_history
add column if not exists user_id uuid references auth.users(id);

comment on column public.export_history.user_id is 'Owner user id (auth.uid) for row-level security.';

alter table public.saved_searches
add column if not exists user_id uuid references auth.users(id);

comment on column public.saved_searches.user_id is 'Owner user id (auth.uid) for row-level security.';

alter table public.ocr_usage_logs
add column if not exists user_id uuid references auth.users(id);

comment on column public.ocr_usage_logs.user_id is 'Owner user id (auth.uid) for row-level security.';

-- Ensure new inserts get ownership automatically.
alter table public.export_templates alter column user_id set default auth.uid();
alter table public.export_history alter column user_id set default auth.uid();
alter table public.saved_searches alter column user_id set default auth.uid();
alter table public.ocr_usage_logs alter column user_id set default auth.uid();

-- Backfill ownership where relation-based inference is possible.
update public.export_history eh
set user_id = et.user_id
from public.export_templates et
where eh.template_id = et.id
  and eh.user_id is null
  and et.user_id is not null;

update public.ocr_usage_logs oul
set user_id = r.user_id
from public.receipts r
where oul.receipt_id = r.id
  and oul.user_id is null;

-- Enable RLS on linter-targeted tables.
alter table public.vendor_aliases enable row level security;
alter table public.vendor_rules enable row level security;
alter table public.export_templates enable row level security;
alter table public.export_history enable row level security;
alter table public.saved_searches enable row level security;
alter table public.ocr_usage_logs enable row level security;

-- vendor_aliases policies (ownership inherited from parent vendor).
drop policy if exists vendor_aliases_select_own on public.vendor_aliases;
create policy vendor_aliases_select_own on public.vendor_aliases
for select
using (
  exists (
    select 1
    from public.vendors v
    where v.id = vendor_aliases.vendor_id
      and v.user_id = auth.uid()
  )
);

drop policy if exists vendor_aliases_insert_own on public.vendor_aliases;
create policy vendor_aliases_insert_own on public.vendor_aliases
for insert
with check (
  exists (
    select 1
    from public.vendors v
    where v.id = vendor_aliases.vendor_id
      and v.user_id = auth.uid()
  )
);

drop policy if exists vendor_aliases_update_own on public.vendor_aliases;
create policy vendor_aliases_update_own on public.vendor_aliases
for update
using (
  exists (
    select 1
    from public.vendors v
    where v.id = vendor_aliases.vendor_id
      and v.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.vendors v
    where v.id = vendor_aliases.vendor_id
      and v.user_id = auth.uid()
  )
);

drop policy if exists vendor_aliases_delete_own on public.vendor_aliases;
create policy vendor_aliases_delete_own on public.vendor_aliases
for delete
using (
  exists (
    select 1
    from public.vendors v
    where v.id = vendor_aliases.vendor_id
      and v.user_id = auth.uid()
  )
);

-- vendor_rules policies (ownership inherited from parent vendor).
drop policy if exists vendor_rules_select_own on public.vendor_rules;
create policy vendor_rules_select_own on public.vendor_rules
for select
using (
  exists (
    select 1
    from public.vendors v
    where v.id = vendor_rules.vendor_id
      and v.user_id = auth.uid()
  )
);

drop policy if exists vendor_rules_insert_own on public.vendor_rules;
create policy vendor_rules_insert_own on public.vendor_rules
for insert
with check (
  exists (
    select 1
    from public.vendors v
    where v.id = vendor_rules.vendor_id
      and v.user_id = auth.uid()
  )
);

drop policy if exists vendor_rules_update_own on public.vendor_rules;
create policy vendor_rules_update_own on public.vendor_rules
for update
using (
  exists (
    select 1
    from public.vendors v
    where v.id = vendor_rules.vendor_id
      and v.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.vendors v
    where v.id = vendor_rules.vendor_id
      and v.user_id = auth.uid()
  )
);

drop policy if exists vendor_rules_delete_own on public.vendor_rules;
create policy vendor_rules_delete_own on public.vendor_rules
for delete
using (
  exists (
    select 1
    from public.vendors v
    where v.id = vendor_rules.vendor_id
      and v.user_id = auth.uid()
  )
);

-- export_templates policies.
drop policy if exists export_templates_select_own on public.export_templates;
create policy export_templates_select_own on public.export_templates
for select using (auth.uid() = user_id);

drop policy if exists export_templates_insert_own on public.export_templates;
create policy export_templates_insert_own on public.export_templates
for insert with check (auth.uid() = user_id);

drop policy if exists export_templates_update_own on public.export_templates;
create policy export_templates_update_own on public.export_templates
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists export_templates_delete_own on public.export_templates;
create policy export_templates_delete_own on public.export_templates
for delete using (auth.uid() = user_id);

-- export_history policies.
drop policy if exists export_history_select_own on public.export_history;
create policy export_history_select_own on public.export_history
for select using (auth.uid() = user_id);

drop policy if exists export_history_insert_own on public.export_history;
create policy export_history_insert_own on public.export_history
for insert with check (auth.uid() = user_id);

drop policy if exists export_history_update_own on public.export_history;
create policy export_history_update_own on public.export_history
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists export_history_delete_own on public.export_history;
create policy export_history_delete_own on public.export_history
for delete using (auth.uid() = user_id);

-- saved_searches policies.
drop policy if exists saved_searches_select_own on public.saved_searches;
create policy saved_searches_select_own on public.saved_searches
for select using (auth.uid() = user_id);

drop policy if exists saved_searches_insert_own on public.saved_searches;
create policy saved_searches_insert_own on public.saved_searches
for insert with check (auth.uid() = user_id);

drop policy if exists saved_searches_update_own on public.saved_searches;
create policy saved_searches_update_own on public.saved_searches
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists saved_searches_delete_own on public.saved_searches;
create policy saved_searches_delete_own on public.saved_searches
for delete using (auth.uid() = user_id);

-- ocr_usage_logs policies.
drop policy if exists ocr_usage_logs_select_own on public.ocr_usage_logs;
create policy ocr_usage_logs_select_own on public.ocr_usage_logs
for select using (auth.uid() = user_id);

drop policy if exists ocr_usage_logs_insert_own on public.ocr_usage_logs;
create policy ocr_usage_logs_insert_own on public.ocr_usage_logs
for insert with check (auth.uid() = user_id);

drop policy if exists ocr_usage_logs_update_own on public.ocr_usage_logs;
create policy ocr_usage_logs_update_own on public.ocr_usage_logs
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists ocr_usage_logs_delete_own on public.ocr_usage_logs;
create policy ocr_usage_logs_delete_own on public.ocr_usage_logs
for delete using (auth.uid() = user_id);
