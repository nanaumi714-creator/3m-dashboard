-- ============================================================================
-- Phase 3: OCR usage logging + export/search foundations
-- ============================================================================

-- Extensions
create extension if not exists pg_trgm;

-- export_templates: saved export presets
create table if not exists export_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  format text not null, -- csv/excel
  columns jsonb not null, -- output columns definition
  filters jsonb, -- default filters
  created_at timestamptz not null default now(),

  constraint chk_export_templates_format check (format in ('csv', 'excel'))
);

comment on table export_templates is 'Phase 3: Saved export presets for CSV/Excel output.';
comment on column export_templates.name is 'Human-friendly template name.';
comment on column export_templates.format is 'Export format: csv or excel.';
comment on column export_templates.columns is 'JSON definition of selected columns and ordering.';
comment on column export_templates.filters is 'JSON definition of default filters.';
comment on column export_templates.created_at is 'Timestamp when the template was created.';

-- export_history: audit trail for exports
create table if not exists export_history (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references export_templates(id) on delete set null,
  format text not null, -- csv/excel
  filters jsonb, -- filters used at export time
  row_count int not null default 0,
  created_at timestamptz not null default now(),

  constraint chk_export_history_format check (format in ('csv', 'excel')),
  constraint chk_export_history_row_count check (row_count >= 0)
);

comment on table export_history is 'Phase 3: Audit trail of export executions.';
comment on column export_history.template_id is 'Optional link to the export template used.';
comment on column export_history.format is 'Export format at runtime.';
comment on column export_history.filters is 'Filters applied when exporting.';
comment on column export_history.row_count is 'Number of rows included in the export.';
comment on column export_history.created_at is 'Timestamp when the export was generated.';

create index if not exists idx_export_history_created_at on export_history(created_at);

-- saved_searches: reusable query presets
create table if not exists saved_searches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  query text, -- full-text search input
  filters jsonb, -- structured filters
  created_at timestamptz not null default now()
);

comment on table saved_searches is 'Phase 3: Saved search presets for advanced filtering.';
comment on column saved_searches.name is 'Human-friendly saved search name.';
comment on column saved_searches.query is 'Full-text search input.';
comment on column saved_searches.filters is 'Structured filter definition (JSON).';
comment on column saved_searches.created_at is 'Timestamp when the saved search was created.';

-- ocr_usage_logs: OCR usage tracking for monthly cap enforcement
create table if not exists ocr_usage_logs (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid references receipts(id) on delete set null,
  provider text not null default 'google_vision',
  status text not null, -- success/failed
  pages int not null default 1,
  error_message text,
  request_at timestamptz not null default now(),

  constraint chk_ocr_usage_logs_pages check (pages > 0),
  constraint chk_ocr_usage_logs_status check (status in ('success', 'failed'))
);

comment on table ocr_usage_logs is 'Phase 3: OCR usage tracking for cost monitoring.';
comment on column ocr_usage_logs.receipt_id is 'Receipt processed by OCR (nullable for manual runs).';
comment on column ocr_usage_logs.provider is 'OCR provider identifier.';
comment on column ocr_usage_logs.status is 'OCR result status: success or failed.';
comment on column ocr_usage_logs.pages is 'Billable pages for OCR request.';
comment on column ocr_usage_logs.error_message is 'Error details when OCR fails.';
comment on column ocr_usage_logs.request_at is 'Timestamp when OCR was requested.';

create index if not exists idx_ocr_usage_logs_request_at on ocr_usage_logs(request_at);
