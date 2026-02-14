# Database Schema Guide (Phase 3)

This document explains the intent behind the schema design.
See `supabase/init.sql` for the actual DDL.

## Core Tables (Phase 1)

### 1. `transactions`
**Role**: Immutable raw log of money movement.
**Source**: Imported from CSVs.

| Column | Type | Purpose |
|--------|------|---------|
| occurred_on| DATE | Date of transaction |
| amount_yen| BIGINT | Value. Negative = Expense. Positive = Income. |
| description| TEXT | Raw description from CSV. |
| vendor_norm| TEXT | Normalized vendor name (e.g. "amazon web services" -> "amazon") |
| vendor_id| UUID | **Phase 2**: FK to vendors table |
| category_id| UUID | Category applied regardless of business judgment |
| fingerprint| TEXT | Derived hash for duplicate detection. |
| duplicate_group_id| UUID | Nullable. If set, this transaction is part of a duplicate group. |
| user_id| UUID | Owner user id for row-level security (auth.uid). |

### 2. `transaction_business_info`
**Role**: The human judgment overlay.
**Cardinality**: 1:0..1 with `transactions`. created ONLY when judged.

| Column | Type | Purpose |
|--------|------|---------|
| transaction_id | UUID | FK to transactions. |
| is_business | BOOLEAN | True if this is a business expense. |
| business_ratio | INTEGER | 0-100. Percentage deductible. |
| judged_at | TIMESTAMP | Audit trail. |
| note | TEXT | Audit note / context. |

Notes:
- `transaction_business_info.category_id` is deprecated. Categories now live on `transactions.category_id`.

### 3. `receipts`
**Role**: Attachments and OCR text linked to transactions.

| Column | Type | Purpose |
|--------|------|---------|
| transaction_id | UUID | FK to transactions (nullable for unlinked uploads). |
| storage_url | TEXT | File location in storage. |
| original_filename | TEXT | Original uploaded filename. |
| content_type | TEXT | MIME type. |
| file_size_bytes | INTEGER | File size in bytes. |
| uploaded_at | TIMESTAMP | Upload timestamp. |
| ocr_text | TEXT | OCR-extracted text. |
| ocr_confidence | NUMERIC | OCR confidence score. |
| user_id | UUID | Owner user id for row-level security (auth.uid). |

### 4. `import_sources`
**Role**: Traceability and Idempotency.

| Column | Type | Purpose |
|--------|------|---------|
| source_type | TEXT | Source type (csv/gmail/form/manual). |
| imported_at | TIMESTAMP | When it happened. |
| file_path | TEXT | Imported file path (optional). |
| checksum | TEXT | SHA256 of the CSV content. Used to skip re-imports. |
| metadata | JSONB | Source-specific metadata. |
| created_at | TIMESTAMP | Record creation time. |
| user_id | UUID | Owner user id for row-level security (auth.uid). |

### 5. `payment_methods`
**Role**: Master data for source of funds.

| Column | Type | Purpose |
|--------|------|---------|
| name | TEXT | Human readable name (e.g. "Rakuten Card"). |
| type | TEXT | cash/bank/credit/emoney/qr/other. |
| settlement_timing | TEXT | immediate / next_month（残高反映タイミング）. |
| user_id | UUID | NULLはシステム既定、値ありはユーザー定義。 |

## Phase 2 Tables

### 6. `expense_categories`
**Role**: Business expense categorization for better organization.

| Column | Type | Purpose |
|--------|------|---------|
| name | TEXT | Category name (e.g. "通信費", "交通費") |
| description | TEXT | Detailed description |
| is_active | BOOLEAN | Whether category is still in use |
| user_id | UUID | Owner user id for row-level security (auth.uid). |

### 6.1 `user_category_preferences`
**Role**: Per-user visibility overrides for categories.

| Column | Type | Purpose |
|--------|------|---------|
| user_id | UUID | Owner user id (auth.uid). |
| category_id | UUID | Target category id. |
| is_visible | BOOLEAN | Whether the user wants this category visible. |
| updated_at | TIMESTAMP | Last visibility change time. |

Notes:
- `expense_categories.is_active` remains the global/system flag.
- User-specific hide/show is managed by `user_category_preferences`.
- Effective visibility = `expense_categories.is_active` AND user override (`is_visible`, default true when no row exists).

### 7. `vendors`
**Role**: Master table for vendor normalization and automation.

| Column | Type | Purpose |
|--------|------|---------|
| name | TEXT | Canonical vendor name |
| description | TEXT | Additional vendor information |
| default_category_id | UUID | Default expense category for this vendor |
| is_active | BOOLEAN | Whether vendor is still active |
| user_id | UUID | Owner user id for row-level security (auth.uid). |

### 8. `vendor_aliases`
**Role**: Multiple names that map to the same canonical vendor.

| Column | Type | Purpose |
|--------|------|---------|
| vendor_id | UUID | FK to vendors table |
| alias | TEXT | Alternative name for the vendor |
| confidence_score | NUMERIC | 0.0-1.0, for fuzzy matching quality |

### 9. `vendor_rules`
**Role**: Automation rules for vendor-based expense judgment.

| Column | Type | Purpose |
|--------|------|---------|
| vendor_id | UUID | FK to vendors table |
| is_business | BOOLEAN | Auto-judgment: business expense? |
| business_ratio | INTEGER | Auto-judgment: deductible percentage |
| category_id | UUID | Auto-suggested category |
| rule_priority | INTEGER | Rule precedence (lower = higher priority) |
| is_active | BOOLEAN | Whether rule is enabled |

---

## Phase 3 Tables

### 10. `export_templates`
**Role**: Saved export presets for CSV/Excel output.

| Column | Type | Purpose |
|--------|------|---------|
| name | TEXT | Human-friendly template name |
| format | TEXT | csv/excel |
| columns | JSONB | Output column definitions |
| filters | JSONB | Default filters |
| created_at | TIMESTAMP | Created time |

### 11. `export_history`
**Role**: Audit trail for export executions.

| Column | Type | Purpose |
|--------|------|---------|
| template_id | UUID | Optional FK to export_templates |
| format | TEXT | csv/excel |
| filters | JSONB | Filters applied at export time |
| row_count | INTEGER | Rows exported |
| created_at | TIMESTAMP | Export time |

### 12. `saved_searches`
**Role**: Reusable advanced search presets.

| Column | Type | Purpose |
|--------|------|---------|
| name | TEXT | Saved search name |
| query | TEXT | Full-text search input |
| filters | JSONB | Structured filters |
| created_at | TIMESTAMP | Created time |

### 13. `ocr_usage_logs`
**Role**: OCR usage tracking for monthly caps.

| Column | Type | Purpose |
|--------|------|---------|
| receipt_id | UUID | FK to receipts (nullable) |
| provider | TEXT | OCR provider identifier |
| status | TEXT | success/failed |
| pages | INTEGER | Billable pages |
| error_message | TEXT | Failure context |
| request_at | TIMESTAMP | OCR request timestamp |

---

## Key Constraints

1. **Amount check**: `amount_yen` is never 0 (usually).
2. **Business Ratio**: Must be 0 <= ratio <= 100.
3. **Null Judgment**: If a transaction has NO row in `transaction_business_info`, it is "Untriaged".
4. **Vendor Aliases**: Each alias maps to exactly one vendor (unique constraint).
5. **Confidence Score**: Must be between 0.0 and 1.0.

## Phase 2 Data Flow

```
CSV Import → transactions (with vendor_norm)
     ↓
Vendor Matching → vendor_aliases lookup → vendors
     ↓
Rule Application → vendor_rules → suggested judgment
     ↓
User Confirmation → transactions.category_id + transaction_business_info (business flags)
```

## Phase 3 Data Flow (OCR + Export + Search)

```
Receipt Upload → receipts (ocr_text)
     ↓
OCR Run → ocr_usage_logs (cost tracking)
     ↓
Advanced Search → saved_searches (query presets)
     ↓
Export → export_templates → export_history
```

**Receipts Storage Notes**
- `receipts.user_id` stores the Supabase auth user id to align Storage ownership.
- `receipts.storage_url` stores the Storage path (bucket object key), not a public URL.


## Phase 4 Tables (Asset Management)

### 14. `accounts`
**Role**: 残高を管理する場所（財布、銀行、PayPay、Suicaなど）。

| Column | Type | Purpose |
|--------|------|---------|
| user_id | UUID | Owner user id for row-level security (auth.uid). |
| name | TEXT | 管理場所名（例: 財布、三菱UFJ銀行）。 |
| asset_type | TEXT | cash / qr / bank / emoney。 |
| opening_balance_yen | BIGINT | 初期残高（JPY）。 |
| is_active | BOOLEAN | 非表示化・運用停止用のフラグ。 |

### 15. `transfers`
**Role**: 管理場所間の資金移動（振替）。

| Column | Type | Purpose |
|--------|------|---------|
| user_id | UUID | Owner user id for row-level security (auth.uid). |
| from_account_id | UUID | 振替元の管理場所。 |
| to_account_id | UUID | 振替先の管理場所。 |
| amount_yen | BIGINT | 正の金額のみ（> 0）。 |
| occurred_on | DATE | 振替日。 |
| note | TEXT | メモ。 |

Notes:
- 振替は資産総額を変えない内部移動として扱う。
- `from_account_id <> to_account_id` の制約で自己振替を禁止。
- カード系は `payment_methods.settlement_timing = 'next_month'` で未払金として別集計する。
