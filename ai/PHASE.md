# Phase Gate - Current Constraints and Future Roadmap

## Current Phase: **3** (Advanced Management)

**Last Updated**: January 24, 2026

---

## Phase 1: MVP (Current)

### Active Constraints

#### Environment
- ✅ **Local-only**: Supabase Local, no cloud deployment
- ✅ **Zero-cost**: No external APIs, no paid services
- ✅ **Single user**: No authentication, no RLS
- ✅ **JPY-only**: `amount_yen BIGINT`, no currency columns

#### Features
- ✅ **Single CSV import**: Only 1 card format supported
- ✅ **Expense-focused**: No revenue input UI (optional in data)
- ✅ **Basic UI**: Transactions list, Triage Queue, Overview
- ✅ **Manual receipts**: DB links only (Storage upload is Phase 1 late)

#### Forbidden
- ❌ Cloud services (Supabase Cloud, Vercel)
- ❌ External APIs (OCR, Gmail)
- ❌ Foreign currency support
- ❌ Multiple CSV formats
- ❌ Mobile UI optimization
- ❌ Revenue input UI
- ❌ localStorage/sessionStorage
- ❌ Complex state management (Redux, etc.)

#### Required Practices
- ✅ Idempotent imports (checksum-based)
- ✅ Error handling everywhere
- ✅ Type hints (Python) and strict TypeScript
- ✅ Comments on DDL
- ✅ Audit trails (judged_at, judged_by)

---

## Phase 2: Efficiency + Multiple Inputs (3 months later)

### What Unlocks
- ✅ **Vendor master**: `vendors`, `vendor_aliases` tables
- ✅ **Smart suggestions**: Past judgment history
- ✅ **Batch actions**: Vendor-level rules
- ✅ **Categories**: `expense_categories` table
- ✅ **Multiple CSVs**: Bank, d-pay, cash input
- ✅ **Receipt upload UI**: Drag & drop to Storage
- ✅ **Duplicate management UI**: Manual merge

### Still Forbidden
- ❌ Cloud services
- ❌ External APIs (OCR, Gmail)
- ❌ Foreign currency
- ❌ Mobile optimization

### New Tables
- `vendors`
- `vendor_aliases`
- `expense_categories`
- `vendor_rules`
- `import_configs`

---

## Phase 3: Advanced Management (When needed)

### What Unlocks
- ✅ **OCR integration**: Google Vision API (cost allowed)
- ✅ **Export**: CSV, Excel formats
- ✅ **Advanced search**: Full-text, complex filters (Japanese support)

### Cost Acceptable
- ✅ OCR API usage (within budget)


### Still Forbidden
- ❌ Cloud deployment
- ❌ Foreign currency
- ❌ Mobile optimization

### New Tables
- `export_templates`
- `export_history`
- `saved_searches`
- `ocr_usage_logs`

### Deferred to Phase 4
- Gmail sync (OAuth + background fetch)

---

## Phase 4: Cloud Migration (When remote access needed)

### What Unlocks
- ✅ **Cloud deployment**: Vercel, Supabase Cloud
- ✅ **Authentication**: Supabase Auth (email/password)
- ✅ **RLS**: Row Level Security
- ✅ **Mobile UI**: Responsive design, camera upload
- ✅ **Remote input**: Manual entry from anywhere
- ✅ **Gmail sync**: Automatic receipt download

### Cost Acceptable
- ✅ Vercel hosting
- ✅ Supabase Cloud storage/DB
- ✅ CI/CD (GitHub Actions)

### Still Recommended Against
- ⚠️ Foreign currency (unless truly needed)
- ⚠️ Multi-user/team features (single user is simpler)

### New Features
- Authentication/authorization
- Mobile-optimized UI
- Offline support (optional)
- Data migration from local

---

## How to Use This File

### For AI Agents
**Before generating code**, check:
1. What is `Current Phase`?
2. Is the requested feature in `Active Constraints` → Forbidden?
3. Is it in a future phase → Defer or suggest phase upgrade

### For Developers
**Before implementing**:
1. Verify feature is allowed in current phase
2. If not, either:
   - Skip it (YAGNI)
   - Propose phase upgrade with justification
   - Implement as "hidden/experimental" flag

**When changing phases**:
1. Update `Current Phase` at top
2. Move constraints from "Forbidden" to "Unlocks"
3. Update `AGENTS.md` if core principles change
4. Run migration script if schema changes

---

## Phase Transition Checklist

### Moving to Phase 2
- [ ] Phase 1 acceptance criteria all met
- [ ] 3+ months of stable Phase 1 usage
- [ ] Vendor name variations causing pain
- [ ] Update `PHASE.md` current phase to 2
- [ ] Run `migrations/phase2/*.sql`
- [ ] Update `ai/DB.md` with new tables

### Moving to Phase 3
- [ ] Phase 2 acceptance criteria all met
- [ ] Receipt management is bottleneck
- [ ] Need to export data for external use
- [ ] Budget approved for OCR API
- [ ] Update `PHASE.md` current phase to 3
- [ ] Set up API credentials

### Moving to Phase 4
- [ ] Need remote access (traveling, mobile use)
- [ ] Budget approved for cloud hosting
- [ ] Data migration plan tested
- [ ] Update `PHASE.md` current phase to 4
- [ ] Deploy to Vercel + Supabase Cloud
- [ ] Enable RLS policies
- [ ] Migrate local data

---

## Emergency Downgrade

If a phase proves too complex/costly:

1. Revert `PHASE.md` to previous phase
2. Disable new features (feature flags)
3. Keep data (don't drop tables)
4. Document why downgrade happened
5. Re-evaluate in 1 month

**Example**: Phase 3 OCR costs too much → Downgrade to Phase 2, disable OCR, keep receipts stored
