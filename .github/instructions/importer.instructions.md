# Importer-Specific Instructions

**Applies to**: `importer/**/*.py`

---

## Tech Stack

- Runtime: Python 3.11+ (in `.venv`)
- Libraries: `csv`, `hashlib`, `logging`, `psycopg2` (or `supabase-py` depending on implementation)
- Style: Google Docstrings, Type Hints

---

## Directory Structure

```
importer/
├── data/              # Place CSVs here
├── src/
│   ├── main.py        # Entry point
│   ├── config.py      # Env vars
│   └── parsers/       # CSV parsing logic
├── requirements.txt
└── README.md
```

---

## Setup & Run

### ✅ Virtual Environment Required

```bash
# Setup
python -m venv .venv
# Activate (Windows)
.venv\Scripts\activate
# Install deps
pip install -r requirements.txt

# Run
python src/main.py
```

---

## Code Patterns

### ✅ Idempotency Check

```python
import hashlib
from typing import Optional

def calculate_checksum(file_path: str) -> str:
    """Calculates SHA256 checksum of a file."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def is_already_imported(checksum: str, db_connection) -> bool:
    """Checks DB for existence of checksum."""
    # Implementation depends on DB lib
    pass
```

### ✅ Type Hints & Logging

```python
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

def process_row(row_index: int, row_data: Dict[str, Any]) -> bool:
    try:
        # processing logic...
        return True
    except ValueError as e:
        logger.warning(f"Skipping row {row_index}: {e}")
        return False
```

### ❌ Anti-Patterns

```python
# ❌ Checking "Has this file name been imported?" 
# (Files can be renamed. Check content checksum instead.)

# ❌ Printing errors
print("Error occurred") 

# ❌ Hardcoding DB credentials
db = connect("postgres://user:pass@localhost:5432")
```

---

## Database Interaction

- Use parameterized queries to prevent SQL injection (even if local).
- Batch inserts if processing > 1000 rows (Phase 1 volume is low, so row-by-row is acceptable for simplicity, but batching is better).

## Error Strategies

1. **File Level**: If CSV header doesn't match expected specific format → Abort immediately.
2. **Row Level**: If amount is non-numeric → Log error, skip row, continue.
