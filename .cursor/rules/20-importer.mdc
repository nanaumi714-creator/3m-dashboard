# Importer Rules

---
description: Guidelines for Python Importer scripts
globs: 
  - "importer/**/*.py"
---

## Critical Rules

1. **Idempotency is King**: The script must be runnable 100 times on the same file without creating duplicate data or crashing.
   - Mechanism: Calculate File Checksum -> Check `import_sources` -> Skip if exists.
2. **Virtual Environment**: Always run in a virtual environment (`.venv`).
3. **No `print()`**: Use the `logging` module.
4. **Atomic Transactions**: If the CLI crashes halfway, DB should not be left in a half-written state (where possible).

## Code Style

- **Type Hints**: Required for all function arguments and returns.
  ```python
  def parse_row(row: Dict[str, str]) -> Transaction | None:
  ```
- **Error Handling**: 
  - Wrap row processing in `try/except`.
  - Log errors but (optionally) continue to next row if configured, OR fail fast.
  - Phase 1 preference: Fail fast on CSV format errors, log warning on data validation errors.

## Phase 1 Constraints

- Support only **1 specific CSV format** (e.g., Rakuten Card).
- Do not implement generic "Auto-detect format" logic yet.
- No external API calls during import.
