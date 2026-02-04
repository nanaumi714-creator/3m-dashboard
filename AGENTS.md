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

**Active Phase**: Phase 4 (see `ai/PHASE.md` for constraints)

**Tech Stack**:
- Frontend: Next.js 14+ (App Router), Tailwind CSS v3.4
- Backend: Supabase Cloud (PostgreSQL 15+)
- Importer: Python 3.11+
- Environment: Cloud deployment (Vercel + Supabase Cloud), local dev supported

**Currency**: JPY only (amount_yen BIGINT, expenses are negative)

---

## Phase 4 Features (Current)

✅ **Phase 2 Baseline (Already Implemented)**:
- Vendor master (`vendors`, `vendor_aliases` tables)
- Expense categories (`expense_categories` table)
- Enhanced Triage Queue with category selection
- Vendor management UI
- Category management UI
- Improved transaction listing with filters

✅ **Phase 3 Unlocks (Implemented)**:
- OCR integration (Google Vision API)
- Export (CSV/Excel)
- Advanced search (Japanese full-text)

✅ **Phase 4 Unlocks (Implemented)**:
- Cloud deployment (Vercel + Supabase Cloud)
- Authentication (Supabase Auth)
- RLS (Row Level Security)
- Mobile UI (responsive, camera upload)
- Gmail sync (cron/automation)

❌ **Phase 4 Constraints** (Still Forbidden):
- Foreign currency support
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
- **NEW**: Follow "Premium & Aesthetic" design: Use Blue as primary/accent, avoid plain Black/Gray for active states.
- **NEW**: Follow single-row header layout with whitespace-nowrap for navigation.
- **NEW**: Use glassmorphism (`backdrop-blur-md`, `bg-white/80`) for headers and modals.
- Use Tailwind utility classes only
- No `any` types, handle async errors
- **NEW**: Follow card-based layout (rounded-2xl+) for data display.
- **NEW**: Use proper loading states (spinners, skeletons) and error handling.

**Importer**:
- Verify idempotency (same CSV = safe)
- Use logging, not print statements
- Update `ai/specs/csv_spec.md` if changing format

**Phase Changes**:
- Update `ai/PHASE.md` when moving to Phase 2/3/4
- Review and remove obsolete constraints
- **NEW**: Update this file's "Current Status" section

---

## Design System (Phase 4 Premium)

**Color Palette**:
- **Primary Theme**: Blue (`blue-600`). Avoid using plain Black (`gray-900`) for headers, buttons, or active states.
- **Background**: `bg-gray-50` for pages, `bg-white` or `bg-white/80` for components.
- **Surface**: Use Glassmorphism (`bg-white/80 backdrop-blur-md`) for headers and floating modals.

**Expense Classification Colors**:
- **事業 (Business)**: `blue-600` (Text/BG) - Represents active business economy.
- **按分 (Allocation)**: `blue-100` background with `blue-800` text.
- **生活 (Personal)**: `purple-100` background with `purple-800` text. Soft color to distinguish from business.
- **未判定 (Pending)**: `gray-100` background with `gray-800` text. Neutral.

**Layout Patterns**:
- **Page Container**: `min-h-screen bg-gray-50`
- **Content Wrapper**: `max-w-6xl mx-auto px-4 py-8`
- **Premium Card**: `bg-white rounded-2xl p-6 shadow-sm border border-gray-100`
- **Navigation**: Desktop header must be single-row. Use `whitespace-nowrap` for all nav items to prevent ugly wrapping.

**Form Elements**:
- **Input**: `w-full border-none bg-gray-50 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-medium`
- **Button (Primary)**: `bg-blue-600 text-white px-8 py-3.5 rounded-2xl hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-100 active:scale-[0.98]`
- **Button (Secondary)**: `bg-white text-gray-700 border border-gray-100 px-6 py-3.5 rounded-2xl hover:bg-gray-50 transition-all font-bold`

**Typography**:
- **Page Title**: `text-3xl font-black text-gray-900 tracking-tight`
- **Section Title**: `text-xl font-bold text-gray-900 tracking-tight`
- **Nav Label**: `text-sm font-bold tracking-wide`
- **Body Text**: `text-gray-600 font-medium`

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

5. **Supabase auth/session or `never` type errors**
   - Use `@supabase/auth-helpers-nextjs` clients only:
     - Browser: `createClientComponentClient<Database>()` in `web/lib/supabase.ts`
     - Route handlers: `createRouteHandlerClient<Database>({ cookies })` in `web/lib/supabase-server.ts`
     - Middleware: `createMiddlewareClient<Database>({ req, res })` in `web/middleware.ts`
   - Do **not** reintroduce `@supabase/ssr` or custom cookie adapters.
   - If `from().insert()` becomes `never`, ensure the auth-helpers type override exists:
     - `web/types/supabase-auth-helpers-nextjs.d.ts`

6. **Build fails with `package.json` JSON parse error**
   - Cause: BOM or invalid encoding in `web/package.json`.
   - Fix: rewrite as UTF-8 **without BOM**.
   - Avoid editing `web/package.json` with tools that insert BOM.

7. **Auth callback issues**
   - `web/app/auth/callback/page.tsx` is client-based and handles PKCE + hash tokens.
   - Always start OAuth from `/login`; direct access to `/auth/callback` will show `missing_code`.

---

## Further Reading

- `ai/PHASE.md` - Current phase constraints and future roadmap
- `ai/DECISIONS.md` - Why we made key design choices
- `ai/ARCHITECTURE.md` - System architecture and data flow
- `ai/DB.md` - Database schema design intent
- `README.md` - Setup and daily operation guide
- `SETUP.md` - Environment setup instructions
