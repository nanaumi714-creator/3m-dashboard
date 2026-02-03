import unittest
from datetime import date
import sys
import os

# Add parent directory to path to import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fingerprint import generate_fingerprint, normalize_vendor

class TestFingerprint(unittest.TestCase):
    def test_normalize_vendor_basic(self):
        """Basic normalization: lowercase and remove spaces"""
        self.assertEqual(normalize_vendor("Amazon Web Services"), "amazonwebservices")
        self.assertEqual(normalize_vendor("  Starbucks  "), "starbucks")

    def test_normalize_vendor_symbols(self):
        """Remove symbols"""
        self.assertEqual(normalize_vendor("セブン-イレブン"), "セブンイレブン")
        self.assertEqual(normalize_vendor("D.D. 4.0"), "dd40")

    def test_normalize_vendor_fullwidth(self):
        """Convert full-width to half-width (NFKC)"""
        self.assertEqual(normalize_vendor("Ａｍａｚｏｎ"), "amazon")
        self.assertEqual(normalize_vendor("１２３"), "123")

    def test_normalize_empty(self):
        """Handle empty input"""
        self.assertEqual(normalize_vendor(""), "")
        self.assertEqual(normalize_vendor(None), "")

    def test_fingerprint_deterministic(self):
        """Fingerprint should be deterministic for same inputs"""
        fp1 = generate_fingerprint(
            occurred_on=date(2025, 1, 1),
            amount_yen=1000,
            payment_method_id="uuid-123",
            vendor_norm="testvendor",
            source_type="csv"
        )
        fp2 = generate_fingerprint(
            occurred_on=date(2025, 1, 1),
            amount_yen=1000,
            payment_method_id="uuid-123",
            vendor_norm="testvendor",
            source_type="csv"
        )
        self.assertEqual(fp1, fp2)

    def test_fingerprint_diff(self):
        """Changing any field should change fingerprint"""
        base_args = {
            "occurred_on": date(2025, 1, 1),
            "amount_yen": 1000,
            "payment_method_id": "uuid-123",
            "vendor_norm": "testvendor",
            "source_type": "csv"
        }
        base_fp = generate_fingerprint(**base_args)

        # Change date
        args_date = base_args.copy()
        args_date["occurred_on"] = date(2025, 1, 2)
        self.assertNotEqual(base_fp, generate_fingerprint(**args_date))

        # Change amount
        args_amount = base_args.copy()
        args_amount["amount_yen"] = 1001
        self.assertNotEqual(base_fp, generate_fingerprint(**args_amount))

if __name__ == "__main__":
    unittest.main()
