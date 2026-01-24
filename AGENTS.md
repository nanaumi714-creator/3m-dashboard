# AGENTS.md - Freelance Finance Management System

## Project Intent

**Purpose**: Personal expense tracking and business expense judgment for freelancers. NOT an accounting automation system.

**Core Principles**:
- See the money flow with your own eyes (no black box automation)
- Sustainable operation (avoid complexity that breaks in 3 months)
- Incremental implementation (Phase 1 is minimal, expand later)
- Data auditability (always know where transactions came from)

**Key Philosophy**:
- Judgment is an action (record who/when/why for expense classification)
- YAGNI over future-proofing (don't add features "just in case")
- Idempotency is sacred (same CSV import = safe, not broken)

---

## Current Status

**Active Phase**: Phase 1 (see `ai/PHASE.md` for constraints)

**Tech Stack**:
- Frontend: Next.js 14+ (App Router), Tailwind CSS
- Backend: Supabase Local (PostgreSQL 15+)
- Importer: Python 3.11+
- Environment: Local-only, zero-cost

**Currency**: JPY only (amount_yen BIGINT, expenses are negative)

---

## Critical Constraints (Phase 1)

Read `ai/PHASE.md` before making any changes. Current prohibitions:

❌ **Absolutely Forbidden**:
- Cloud services (Supabase Cloud, Vercel, OCR APIs)
- Foreign currency support
- localStorage/sessionStorage
- Multiple CSV formats (only 1 card CSV supported)
- Mobile optimization
- Revenue input UI (expense-focused for now)

✅ **Required Practices**:
- Idempotent imports (checksum-based)
- Error handling (try-catch in Python, async/await in TS)
- Comments on all DDL
- Type hints (Python) and strict TypeScript (no `any`)

---

## Quick Commands

```bash
# Start environment
supabase start
cd frontend && npm run dev

# Stop environment
supabase stop
cd frontend && npm run dev (Ctrl+C)

# Import CSV
cd importer
# Windows:
.venv\Scripts\activate
# Mac/Linux:
# source .venv/bin/activate
python import_csv.py ../data/card_202501.csv --payment-method <uuid>

# Backup DB
supabase db dump -f backup_$(date +%Y%m%d).sql
```

---

## Architecture Overview

See `ai/ARCHITECTURE.md` for details. Key flow:

```
CSV File → Python Importer
  ↓ (checksum check, fingerprint generation)
Transactions Table
  ↓ (LEFT JOIN WHERE tbi IS NULL)
Triage Queue UI → User judgment
  ↓ (is_business, business_ratio, audit_note)
transaction_business_info Table
  ↓
Overview Dashboard (monthly aggregation)
```

**Key Design Decisions** (see `ai/DECISIONS.md`):
- Why separate `transaction_business_info`? → Judgment is an action, not a nullable field
- Why BIGINT not DECIMAL? → JPY-only, 1-yen precision, simpler aggregation
- Why no unique constraint on fingerprint? → Same-day same-amount transactions exist

---

## Definition of Done (DoD)

Before considering a task complete:

- [ ] Code follows conventions in `ai/` directory
- [ ] No violations of current Phase constraints (`ai/PHASE.md`)
- [ ] Error handling present (logged, not silent failure)
- [ ] Idempotency verified (for importer changes)
- [ ] Updated relevant docs (`ai/DB.md`, `ai/specs/`, etc.)
- [ ] Manually tested with realistic data

---

## When Making Changes

**Database**:
- Read `ai/DB.md` for schema design intent
- Add comments to all DDL changes
- Update `ai/DB.md` if adding/modifying tables

**Importer**:
- Verify idempotency (same CSV = safe)
- Use logging, not print statements
- Update `ai/specs/csv_spec.md` if changing format

**Frontend**:
- Follow `.github/instructions/frontend.instructions.md`
- Use Tailwind utility classes only
- No `any` types, handle async errors

**Phase Changes**:
- Update `ai/PHASE.md` when moving to Phase 2/3/4
- Review and remove obsolete constraints

---

## Common Pitfalls

❌ **Don't**:
- Add features "for the future" (YAGNI violation)
- Use `any` in TypeScript
- Skip error handling
- Add currency columns (JPY-only in Phase 1)
- Use localStorage/sessionStorage
- Create non-idempotent imports

✅ **Do**:
- Check `ai/PHASE.md` before starting
- Prefer simple solutions
- Add audit trails (judged_at, judged_by)
- Keep imports idempotent
- Handle errors explicitly

---

## Further Reading

- `ai/PHASE.md` - Current phase constraints and future roadmap
- `ai/DECISIONS.md` - Why we made key design choices
- `ai/ARCHITECTURE.md` - System architecture and data flow
- `ai/DB.md` - Database schema design intent
- `README.md` - Setup and daily operation guide
