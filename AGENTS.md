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

**Active Phase**: Phase 2 (see `ai/PHASE.md` for constraints)

**Tech Stack**:
- Frontend: Next.js 14+ (App Router), Tailwind CSS v3.4
- Backend: Supabase Local (PostgreSQL 15+)
- Importer: Python 3.11+
- Environment: Local-only, zero-cost

**Currency**: JPY only (amount_yen BIGINT, expenses are negative)

---

## Phase 2 Features (Current)

✅ **Implemented**:
- Vendor master (`vendors`, `vendor_aliases` tables)
- Expense categories (`expense_categories` table)
- Enhanced Triage Queue with category selection
- Vendor management UI
- Category management UI
- Improved transaction listing with filters

❌ **Phase 2 Constraints** (Still Forbidden):
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
- **NEW**: Consistent UI design using Tailwind CSS
- **NEW**: Type-safe database operations with generated types

---

## Quick Commands

```bash
# Start environment
supabase start
cd web && npm run dev

# Stop environment
supabase stop
cd web && npm run dev (Ctrl+C)

# Import CSV
cd importer
# Windows:
.venv\Scripts\activate
# Mac/Linux:
# source .venv/bin/activate
python import_csv.py ../data/card_202501.csv --payment-method <uuid>

# Backup DB
supabase db dump -f backup_$(date +%Y%m%d).sql

# Regenerate types after DB changes
supabase gen types typescript --local > web/lib/database.types.ts
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
  ↓ (is_business, business_ratio, audit_note, category_id)
transaction_business_info Table
  ↓
Overview Dashboard (monthly aggregation)
```

**Phase 2 Enhancements**:
- Vendor normalization and management
- Category-based expense classification
- Smart suggestions based on vendor rules (future)

**Key Design Decisions** (see `ai/DECISIONS.md`):
- Why separate `transaction_business_info`? → Judgment is an action, not a nullable field
- Why BIGINT not DECIMAL? → JPY-only, 1-yen precision, simpler aggregation
- Why no unique constraint on fingerprint? → Same-day same-amount transactions exist
- **NEW**: Why card-based UI? → Better information hierarchy and visual grouping

---

## Definition of Done (DoD)

Before considering a task complete:

- [ ] Code follows conventions in `ai/` directory
- [ ] No violations of current Phase constraints (`ai/PHASE.md`)
- [ ] Error handling present (logged, not silent failure)
- [ ] Idempotency verified (for importer changes)
- [ ] **NEW**: UI follows design system (Tailwind CSS, consistent patterns)
- [ ] **NEW**: TypeScript types regenerated if DB schema changed
- [ ] Updated relevant docs (`ai/DB.md`, `ai/specs/`, etc.)
- [ ] Manually tested with realistic data

---

## When Making Changes

**Database**:
- Read `ai/DB.md` for schema design intent
- Add comments to all DDL changes
- **NEW**: Always regenerate types: `supabase gen types typescript --local > web/lib/database.types.ts`
- Update `ai/DB.md` if adding/modifying tables

**Frontend**:
- **NEW**: Use consistent design patterns (see Design System below)
- Use Tailwind utility classes only
- No `any` types, handle async errors
- **NEW**: Follow card-based layout for data display
- **NEW**: Use proper loading states and error handling

**Importer**:
- Verify idempotency (same CSV = safe)
- Use logging, not print statements
- Update `ai/specs/csv_spec.md` if changing format

**Phase Changes**:
- Update `ai/PHASE.md` when moving to Phase 2/3/4
- Review and remove obsolete constraints
- **NEW**: Update this file's "Current Status" section

---

## Design System (Phase 2)

**Layout Patterns**:
- Page container: `min-h-screen bg-gray-50`
- Content wrapper: `max-w-6xl mx-auto px-4 py-8`
- Card: `bg-white rounded-xl p-6 shadow-sm border border-gray-200`

**Form Elements**:
- Input: `w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`
- Button (primary): `bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm`
- Toggle switch: Custom component with blue/gray states

**Status Indicators**:
- Active: `bg-green-100 text-green-800`
- Inactive: `bg-red-100 text-red-800`
- Pending: `bg-gray-100 text-gray-800`

**Typography**:
- Page title: `text-3xl font-bold text-gray-900 mb-2`
- Section title: `text-lg font-semibold text-gray-900 mb-4`
- Body text: `text-gray-600`

---

## Common Pitfalls

❌ **Don't**:
- Add features "for the future" (YAGNI violation)
- Use `any` in TypeScript
- Skip error handling
- Add currency columns (JPY-only in Phase 2)
- Use localStorage/sessionStorage
- Create non-idempotent imports
- **NEW**: Mix design patterns (stick to card-based layouts)
- **NEW**: Forget to regenerate types after DB changes
- **NEW**: Use inline styles instead of Tailwind classes

✅ **Do**:
- Check `ai/PHASE.md` before starting
- Prefer simple solutions
- Add audit trails (judged_at, judged_by)
- Keep imports idempotent
- Handle errors explicitly
- **NEW**: Follow the design system consistently
- **NEW**: Test UI changes across different screen sizes
- **NEW**: Regenerate types immediately after DB schema changes

---

## Troubleshooting

**Common Issues**:

1. **TypeScript errors with Supabase operations**
   - Solution: Regenerate types with `supabase gen types typescript --local > web/lib/database.types.ts`

2. **Tailwind CSS not working**
   - Check `package.json` doesn't have `"type": "module"`
   - Ensure `tailwind.config.js` and `postcss.config.js` use CommonJS syntax
   - Verify `@tailwind` directives in `globals.css`

3. **Database migration issues**
   - Use `supabase/migrations/` directory for schema changes
   - Run `supabase db reset` to apply all migrations
   - Check migration file syntax for SQL errors

4. **UI inconsistencies**
   - Follow the Design System section above
   - Use card-based layouts for data display
   - Maintain consistent spacing and colors

---

## Further Reading

- `ai/PHASE.md` - Current phase constraints and future roadmap
- `ai/DECISIONS.md` - Why we made key design choices
- `ai/ARCHITECTURE.md` - System architecture and data flow
- `ai/DB.md` - Database schema design intent
- `README.md` - Setup and daily operation guide
- `SETUP.md` - Environment setup instructions
