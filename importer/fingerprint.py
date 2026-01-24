import hashlib
import re
import unicodedata
from datetime import date


def normalize_vendor(raw: str) -> str:
    """
    Normalize vendor name for matching.
    - Convert full-width to half-width
    - Remove symbols and spaces
    - Lowercase
    """
    if not raw:
        return ""

    normalized = unicodedata.normalize("NFKC", raw)
    normalized = re.sub(r"[^\w]", "", normalized)
    return normalized.lower()


def generate_fingerprint(
    occurred_on: date,
    amount_yen: int,
    payment_method_id: str,
    vendor_norm: str,
    source_type: str,
) -> str:
    """
    Generate SHA256 fingerprint for duplicate detection.

    Components:
    - occurred_on (YYYY-MM-DD)
    - amount_yen
    - payment_method_id
    - vendor_norm
    - source_type
    """
    components = [
        occurred_on.isoformat(),
        str(amount_yen),
        payment_method_id,
        vendor_norm if vendor_norm else "",
        source_type,
    ]

    fingerprint_input = "|".join(components)
    return hashlib.sha256(fingerprint_input.encode("utf-8")).hexdigest()
