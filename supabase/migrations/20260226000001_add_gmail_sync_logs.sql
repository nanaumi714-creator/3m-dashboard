-- Add gmail sync logs for cron-driven automation.

create table if not exists gmail_sync_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  status text not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  emails_processed int,
  receipts_saved int,
  error_message text,
  created_at timestamptz not null default now()
);

comment on table gmail_sync_logs is 'Gmail sync execution logs (cron checkpoints).';
comment on column gmail_sync_logs.id is 'Primary key for sync log rows.';
comment on column gmail_sync_logs.user_id is 'Owner user id (auth.uid) for row-level security. Null for system entries.';
comment on column gmail_sync_logs.status is 'Sync status label (running/completed/failed).';
comment on column gmail_sync_logs.started_at is 'Timestamp when the sync started.';
comment on column gmail_sync_logs.completed_at is 'Timestamp when the sync completed.';
comment on column gmail_sync_logs.emails_processed is 'Number of Gmail messages processed.';
comment on column gmail_sync_logs.receipts_saved is 'Number of receipts saved from Gmail.';
comment on column gmail_sync_logs.error_message is 'Error message if sync failed.';
comment on column gmail_sync_logs.created_at is 'Row creation timestamp.';

create index if not exists idx_gmail_sync_logs_user_started_at
  on gmail_sync_logs (user_id, started_at desc);

alter table gmail_sync_logs enable row level security;

drop policy if exists gmail_sync_logs_select_own on gmail_sync_logs;
create policy gmail_sync_logs_select_own on gmail_sync_logs
for select using (user_id is null or auth.uid() = user_id);

drop policy if exists gmail_sync_logs_insert_own on gmail_sync_logs;
create policy gmail_sync_logs_insert_own on gmail_sync_logs
for insert with check (auth.uid() = user_id);

drop policy if exists gmail_sync_logs_update_own on gmail_sync_logs;
create policy gmail_sync_logs_update_own on gmail_sync_logs
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists gmail_sync_logs_delete_own on gmail_sync_logs;
create policy gmail_sync_logs_delete_own on gmail_sync_logs
for delete using (auth.uid() = user_id);
