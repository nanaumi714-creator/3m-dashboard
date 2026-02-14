# Architecture Decision Records (ADR)

This file documents critical architectural decisions and the "Why" behind them.
AI Agents must respect these decisions and NOT propose changes unless the context fundamentally changes (e.g., Phase shift).

---

## ADR-001: Separate Table for Business Judgement

**Decision**: Store expense classification in a separate `transaction_business_info` table, not as columns in `transactions`.

**Context**: 
We need to distinguish between "raw bank data" and "human interpretation". 
- `transactions`: Immutable, mirrors the CSV exactly.
- `transaction_business_info`: Mutable, represents user's judgment.

**Why**:
1.  **Immutability**: We should never accidentally modify the raw transaction data when updating a category.
2.  **Auditability**: Judgment is an action (`judged_at`, `judged_by`).
3.  **Triage Queue**: Easiest way to find un-judged items is `LEFT JOIN ... WHERE tbi.id IS NULL`.
4.  **Nullable Hell**: Avoids having `is_business`, `category`, `ratio` all being nullable in the main table.

---

## ADR-002: JPY Amounts as BIGINT

**Decision**: Store all currency amounts as `BIGINT` representing integers.

**Context**:
The system currently only supports JPY (Phase 1 constraint).

**Why**:
1.  **Precision**: JPY has no decimal places in consumer banking. Floating point math issues are avoided entirely.
2.  **Simplicity**: `DECIMAL(10,2)` suggests cents support, which is YAGNI.
3.  **Performance**: Integer math is faster (negligible scale, but cleaner).

**Consequences**:
- Dividends/Interest that might be fractional (e.g. 0.5 JPY) must be floored/rounded/stored as float? 
- *Refinement*: For Phase 1 (Consumer Credit Card), fractional yen does not exist. Round to nearest integer if encountered.

---

## ADR-003: Non-Unique Fingerprints

**Decision**: The `fingerprint` column does NOT have a database-level `UNIQUE` constraint.

**Context**:
Transactions are often identical in data but distinct in reality (e.g., buying two identical coffees at the same convenience store on the same day).

**Why**:
1.  **False Positives**: A unique constraint would reject valid purchases.
2.  **Handling**: We use `fingerprint` for "Duplicate Candidates" detection only.
3.  **Grouping**: Users manually group duplicates using `duplicate_group_id` if they are actually the same.

---

## ADR-004: Idempotent Importers

**Decision**: Importers must rely on file checksums and row-level checks, capable of running multiple times without duplication.

**Context**:
Users will likely run `import_csv.py` on the same file multiple times (forgetting they did it).

**Why**:
1.  **Safety**: Prevents double-counting expenses.
2.  **UX**: User doesn't need to manually move "processed" files.
3.  **Logic**: 
    - Calculate SHA256 of the CSV file.
    - Check `import_sources` table.
    - If exists → Skip entire file.
    - If new → Process rows.

---

## ADR-005: Local-Only Auth (Phase 1)

**Decision**: No login screen, no RLS in Phase 1.

**Context**:
The app runs on `localhost`.

**Why**:
1.  **Speed**: No need to implement Auth hooks, Login pages, etc.
2.  **YAGNI**: It's a personal tool on a personal machine.
3.  **Migration**: Auth will be added in Phase 4 (Cloud).

---

## ADR-006: OCR Provider for Phase 3

**Decision**: Use **Google Vision API only** for Phase 3 OCR.

**Context**:
Phase 3 introduces OCR to unlock export/search improvements.  
Supporting multiple OCR providers in Phase 3 increases cost and operational complexity.

**Why**:
1.  **Simplicity**: One provider keeps auth, retries, and error handling manageable.
2.  **Cost Control**: Avoids parallel billing streams and reduces variance.
3.  **Focus**: Enables faster delivery of OCR-dependent features.

**Consequences**:
- AWS Textract is deferred to Phase 4+ as an optional fallback if needed.

---

## ADR-007: Gmail Sync Deferred to Phase 4

**Decision**: Defer Gmail sync to Phase 4 (cloud deployment).

**Context**:
Phase 3 remains local-only. Gmail OAuth on localhost introduces UX and token lifecycle issues.

**Why**:
1.  **UX**: Re-auth flows on local dev are fragile and disruptive.
2.  **Security**: Token storage is riskier without a cloud auth layer.
3.  **Device Limitation**: Local-only tokens don't sync across machines.

**Consequences**:
- Phase 3 focuses on manual upload → OCR.
- Gmail sync becomes part of Phase 4 once auth + hosting is available.

---

## ADR-008: Japanese Full-Text Search via pg_bigm

**Decision**: Use PostgreSQL `pg_bigm` for Japanese full-text search in Phase 3.

**Context**:
Default PostgreSQL full-text search is English-centric and not reliable for Japanese.

**Why**:
1.  **Relevance**: Bigram matching yields practical results for Japanese text.
2.  **Local Fit**: Works within Supabase Local without external search services.
3.  **Performance**: Faster than naive LIKE scans on large text fields.

**Consequences**:
- Requires enabling `pg_bigm` extension in local PostgreSQL.
- Search scope is limited to key fields (description, vendor_raw, ocr_text).

---
