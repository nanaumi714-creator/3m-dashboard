# Database Schema Guide (Phase 1)

This document explains the intent behind the schema design.
See `database/schema.sql` for the actual DDL.

## Core Tables

### 1. `transactions`
**Role**: Immutable raw log of money movement.
**Source**: Imported from CSVs.

| Column | Type | Purpose |
|Ocurred_on| DATE | Date of transaction |
| Amount_yen| BIGINT | Value. Negative = Expense. Positive = Income. |
| Description| TEXT | Raw description from CSV. |
| Vendor_norm| TEXT | Normalized vendor name (e.g. "amazon web services" -> "amazon") |
| Fingerprint| TEXT | Derived hash for duplicate detection. |
| duplicate_group_id| UUID | Nullable. If set, this transaction is part of a duplicate group. |

### 2. `transaction_business_info`
**Role**: The human judgment overlay.
**Cardinality**: 1:0..1 with `transactions`. created ONLY when judged.

| Column | Type | Purpose |
| Transaction_id | UUID | FK to transactions. |
| Is_business | BOOLEAN | True if this is a business expense. |
| Business_ratio | INTEGER | 0-100. Percentage deductible. |
| Judged_at | TIMESTAMP | Audit trail. |
| Note | TEXT | Audit note / context. |

### 3. `import_sources`
**Role**: Traceability and Idempotency.

| Column | Type | Purpose |
| File_name | TEXT | Name of imported file. |
| File_checksum | TEXT | SHA256 of the CSV content. Used to skip re-imports. |
| Row_count | INTEGER | How many lines were in the file. |
| Imported_at | TIMESTAMP | When it happened. |

### 4. `payment_methods`
**Role**: Master data for source of funds.

| Column | Type | Purpose |
| Name | TEXT | Human readable name (e.g. "Rakuten Card"). |
| Type | TEXT | 'credit_card', 'bank_account', 'cash'. |

---

## Key Constraints

1. **Amount check**: `amount_yen` is never 0 (usually).
2. **Business Ratio**: Must be OLD 0 <= ratio <= 100.
3. **Null Judgment**: If a transaction has NO row in `transaction_business_info`, it is "Untriaged".

## Phase 2+ Planned Tables (Do Not Create Yet)
- `vendors` (Master table)
- `transaction_tags` (Categories)
- `vendor_rules` (Automation)
