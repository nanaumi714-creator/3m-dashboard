# Missing Features Report (Gap Analysis)

Current Status: **Mid-Phase 3 (Partial)**
Target Status: **Phase 4 Complete**

To achieve the "Phase 4 Complete" status, the following features and configurations are missing or incomplete.

## 🚨 Critical Missing Blocks

### 1. Phase 3: Gmail Integration
*   **Status**: ❌ Not Implemented
*   **Missing**:
    *   Gmail OAuth authentication flow.
    *   Email fetching and receipt extraction logic (`importer` or `web` api).
    *   Automatic attachment download and linkage to transactions.

### 2. Phase 4: Cloud Infrastructure & Security
*   **Status**: ⚠️ Partial (Local only)
*   **Missing**:
    *   **RLS Policies**: `init.sql` has basic tables but lacks comprehensive Row Level Security (RLS) policies for user isolation (currently `user_id` is mixed or null).
    *   **Supabase Auth**: Frontend has `middleware.ts` for cookie check, but full Auth UI (Signup, Password Reset, Email Confirmation) and Supabase Auth linkage is likely incomplete.
    *   **Vercel Configuration**: `vercel.json` or specific environment variable documentation for production deployment.

### 3. Phase 2: Advanced Vendor Management
*   **Status**: ⚠️ Stub / Minimal
*   **Missing**:
    *   **Vendor Merge UI**: UI to manually merge duplicate vendors.
    *   **Vendor Rules Engine**: Logic to automatically apply categories based on `vendor_rules` table (Database exists, logic likely missing in `importer` or `triage`).

## 🏗️ Foundational & Operational Gaps (From Step 60)

### 4. Test Code (Critical)
*   **Status**: ❌ Missing
*   **Details**:
    *   No Python tests in `importer/tests/` (especially for Fingerprint/Idempotency logic).
    *   No Frontend unit tests for business logic (e.g., `business_ratio` calculation).

### 5. Documentation & UX
*   **Status**: ⚠️ Incomplete
*   **Details**:
    *   **Importer UX**: No easy way to get `PAYMENT_METHOD_ID` without DB access.
    *   **Env Config**: Missing concrete examples for `OCR_MONTHLY_LIMIT` and other env vars in `.env.example`.

### 6. Seed Data
*   **Status**: ❌ Missing
*   **Details**:
    *   No `sample_data/` directory or scripts to quickly populate `transactions` for development/testing.

## 🛠 Missing Tasks Overview

| Phase | Feature | Current State | Action Required |
| :--- | :--- | :--- | :--- |
| **Phase 2** | **Vendor Rules** | DB Only | Implement rule application logic in Importer/Triage |
| **Phase 2** | **Batch Actions** | Missing | Add UI for bulk categorization in Transaction List |
| **Phase 3** | **Gmail Sync** | Missing | Create Gmail Token Store & Sync Worker |
| **Phase 3** | **Export History** | DB Only | Create UI to view/download past exports |
| **Phase 4** | **Mobile UI** | Basic | Verify Receipt Camera/Upload UX on Mobile |
| **Phase 4** | **Data Migration** | Missing | Create `local_to_cloud.sh` script for DB dump/restore |
| **Foundation** | **Tests** | Missing | Create `importer/tests` and frontend unit tests |
| **Foundation** | **Sample Data** | Missing | Create `sample_csv/` and load script |

## Recommended Next Steps

1.  **Create Test Suite**: Before adding complex features like Gmail, ensure `importer` is stable.
2.  **Implement Gmail Sync**: This is the largest missing functional block for Phase 3.
3.  **Harden Security (RLS)**: Essential before any Cloud deployment (Phase 4).
