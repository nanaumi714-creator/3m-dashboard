"""Data validation script for cloud migration."""
import sys
from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv()


def validate_data_integrity(supabase_url: str, supabase_key: str):
    """Validate data integrity before/after migration."""
    supabase = create_client(supabase_url, supabase_key)
    
    print("=" * 60)
    print("Data Validation Report")
    print("=" * 60)
    
    errors = []
    warnings = []
    
    # 1. Check transactions have valid payment methods
    print("\n1. Validating payment methods...")
    result = supabase.rpc("check_orphaned_payment_methods").execute()
    orphaned_count = result.data if result.data else 0
    
    if orphaned_count > 0:
        errors.append(f"{orphaned_count} transactions with invalid payment_method_id")
    else:
        print("   ✓ All transactions have valid payment methods")
    
    # 2. Check fingerprint uniqueness
    print("\n2. Validating fingerprint uniqueness...")
    result = supabase.rpc("count_duplicate_fingerprints").execute()
    duplicate_count = result.data if result.data else 0
    
    if duplicate_count > 0:
        warnings.append(f"{duplicate_count} duplicate fingerprints found")
    else:
        print("   ✓ No duplicate fingerprints")
    
    # 3. Check vendor references
    print("\n3. Validating vendor references...")
    result = supabase.table("transactions").select("id").not_.is_("vendor_id", "null").limit(1).execute()
    
    if result.data:
        # Check if all vendor_ids exist
        result = supabase.rpc("check_orphaned_vendors").execute()
        orphaned = result.data if result.data else 0
        
        if orphaned > 0:
            errors.append(f"{orphaned} transactions with invalid vendor_id")
        else:
            print("   ✓ All vendor references are valid")
    
    # 4. Check RLS policies
    print("\n4. Validating RLS policies...")
    tables_with_rls = [
        "transactions",
        "vendors",
        "expense_categories",
        "receipts",
        "export_history"
    ]
    
    for table in tables_with_rls:
        # This would need a custom RPC function to check RLS
        print(f"   - {table}: Check manually")
    
    # 5. Summary
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    
    if errors:
        print(f"\n❌ {len(errors)} ERRORS:")
        for error in errors:
            print(f"   - {error}")
    
    if warnings:
        print(f"\n⚠️  {len(warnings)} WARNINGS:")
        for warning in warnings:
            print(f"   - {warning}")
    
    if not errors and not warnings:
        print("\n✅ All validation checks passed!")
    
    return len(errors) == 0


if __name__ == "__main__":
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    
    if not url or not key:
        print("Error: SUPABASE_URL and SUPABASE_KEY must be set")
        sys.exit(1)
    
    success = validate_data_integrity(url, key)
    sys.exit(0 if success else 1)
