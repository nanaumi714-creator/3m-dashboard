# Database-Specific Instructions

**Applies to**: `database/**/*.sql`, `supabase/migrations/*.sql`

---

## Tech Stack

- Engine: PostgreSQL 15+
- Provider: Supabase Local

---

## Migration Guidelines

1. **One Change per File**: Don't bundle extensive schema refactors with data fixes.
2. **Down Migrations**: Phase 1 doesn't strictly require down migrations (we can reset DB), but they are good practice.

## SQL Style Guide

### ✅ Best Practices

```sql
-- Use snake_case
create table public.import_sources (
    id uuid primary key default gen_random_uuid(),
    file_checksum text not null,
    imported_at timestamptz default now()
);

-- Add comments
comment on table public.import_sources is 'Tracks imported CSV files to prevent duplicates';
comment on column public.import_sources.file_checksum is 'SHA256 hash of the source file';

-- Use explicit constraints
alter table public.transactions
    add constraint check_amount_nonzero check (amount_yen != 0);
```

### ❌ Anti-Patterns

```sql
-- ❌ CAMEL CASE
create table public.UserTransactions ...

-- ❌ Money as float
amount_yen float, 

-- ❌ Missing Foreign Keys
user_id uuid, -- (Should be references auth.users(id))
```

## Security (RLS)

**Phase 1**:
- RLS is NOT required.
- If you add RLS, making it `true` for everyone (local dev) is acceptable.

**Phase 4 (Future)**:
- Will require strict `auth.uid() = user_id` policies.
