-- Add backups log table for automated and manual backup checkpoints.

create table if not exists backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  backup_type text not null,
  status text not null,
  backup_timestamp timestamptz not null,
  notes text,
  created_at timestamptz not null default now()
);

comment on table backups is 'Backup checkpoints logged by automation or manual runs.';
comment on column backups.id is 'Primary key for backup log rows.';
comment on column backups.user_id is 'Owner user id (auth.uid) for row-level security. Null for system entries.';
comment on column backups.backup_type is 'Backup origin, e.g., automated or manual.';
comment on column backups.status is 'Status label for backup checkpoint.';
comment on column backups.backup_timestamp is 'Timestamp captured for the backup event.';
comment on column backups.notes is 'Optional notes for the backup checkpoint.';
comment on column backups.created_at is 'Row creation timestamp.';

create index if not exists idx_backups_user_timestamp on backups (user_id, backup_timestamp desc);

alter table backups enable row level security;

drop policy if exists backups_select_own on backups;
create policy backups_select_own on backups
for select using (auth.uid() = user_id);

drop policy if exists backups_insert_own on backups;
create policy backups_insert_own on backups
for insert with check (auth.uid() = user_id);

drop policy if exists backups_update_own on backups;
create policy backups_update_own on backups
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists backups_delete_own on backups;
create policy backups_delete_own on backups
for delete using (auth.uid() = user_id);
