# Database Schema Guide (Phase 2)

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
| fingerprint| TEXT | Derived hash for duplicate detection. |
| duplicate_group_id| UUID | Nullable. If set, this transaction is part of a duplicate group. |

### 2. `transaction_business_info`
**Role**: The human judgment overlay.
**Cardinality**: 1:0..1 with `transactions`. created ONLY when judged.

| Column | Type | Purpose |
|--------|------|---------|
| transaction_id | UUID | FK to transactions. |
| is_business | BOOLEAN | True if this is a business expense. |
| business_ratio | INTEGER | 0-100. Percentage deductible. |
| category_id | UUID | **Phase 2**: FK to expense_categories |
| judged_at | TIMESTAMP | Audit trail. |
| note | TEXT | Audit note / context. |

### 3. `import_sources`
**Role**: Traceability and Idempotency.

| Column | Type | Purpose |
|--------|------|---------|
| file_name | TEXT | Name of imported file. |
| file_checksum | TEXT | SHA256 of the CSV content. Used to skip re-imports. |
| row_count | INTEGER | How many lines were in the file. |
| imported_at | TIMESTAMP | When it happened. |

### 4. `payment_methods`
**Role**: Master data for source of funds.

| Column | Type | Purpose |
|--------|------|---------|
| name | TEXT | Human readable name (e.g. "Rakuten Card"). |
| type | TEXT | 'credit_card', 'bank_account', 'cash'. |

## Phase 2 Tables

### 5. `expense_categories`
**Role**: Business expense categorization for better organization.

| Column | Type | Purpose |
|--------|------|---------|
| name | TEXT | Category name (e.g. "通信費", "交通費") |
| description | TEXT | Detailed description |
| is_active | BOOLEAN | Whether category is still in use |

### 6. `vendors`
**Role**: Master table for vendor normalization and automation.

| Column | Type | Purpose |
|--------|------|---------|
| name | TEXT | Canonical vendor name |
| description | TEXT | Additional vendor information |
| default_category_id | UUID | Default expense category for this vendor |
| is_active | BOOLEAN | Whether vendor is still active |

### 7. `vendor_aliases`
**Role**: Multiple names that map to the same canonical vendor.

| Column | Type | Purpose |
|--------|------|---------|
| vendor_id | UUID | FK to vendors table |
| alias | TEXT | Alternative name for the vendor |
| confidence_score | NUMERIC | 0.0-1.0, for fuzzy matching quality |

### 8. `vendor_rules`
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
User Confirmation → transaction_business_info (with category_id)
```

## Phase 3+ Planned Tables (Do Not Create Yet)
- `export_templates` (Export configurations)
- `saved_searches` (Complex filter presets)
- `gmail_sync_configs` (Email integration)
