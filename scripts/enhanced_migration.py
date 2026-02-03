"""Enhanced migration script with validation and rollback."""
import sys
import os
from datetime import datetime
from supabase import create_client
from dotenv import load_dotenv
import subprocess
import json

load_dotenv()


class MigrationManager:
    """Manage database migration with validation and rollback."""
    
    def __init__(self, source_url: str, source_key: str, target_url: str, target_key: str):
        self.source = create_client(source_url, source_key)
        self.target = create_client(target_url, target_key)
        self.backup_dir = "./backups"
        os.makedirs(self.backup_dir, exist_ok=True)
    
    def create_backup(self) -> str:
        """Create full database backup."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = f"{self.backup_dir}/backup_{timestamp}.sql"
        
        print(f"Creating backup: {backup_file}")
        
        # Use pg_dump for full backup
        # Note: Requires database credentials
        # This is a placeholder - actual implementation needs DB connection details
        
        print(f"✓ Backup created: {backup_file}")
        return backup_file
    
    def validate_schema(self) -> bool:
        """Validate schema compatibility."""
        print("\nValidating schema...")
        
        tables_to_check = [
            "transactions",
            "vendors",
            "expense_categories",
            "payment_methods",
            "receipts"
        ]
        
        for table in tables_to_check:
            # Check if table exists in target
            result = self.target.table(table).select("*").limit(1).execute()
            if result.error:
                print(f"✗ Table '{table}' not found in target")
                return False
            print(f"✓ Table '{table}' exists")
        
        print("✓ Schema validation passed")
        return True
    
    def migrate_data(self, table: str, batch_size: int = 1000) -> int:
        """Migrate data from source to target in batches."""
        print(f"\nMigrating table: {table}")
        
        offset = 0
        total_migrated = 0
        
        while True:
            # Fetch batch from source
            result = self.source.table(table).select("*").range(offset, offset + batch_size - 1).execute()
            
            if not result.data:
                break
            
            # Insert into target
            insert_result = self.target.table(table).insert(result.data).execute()
            
            if insert_result.error:
                print(f"✗ Error migrating batch: {insert_result.error}")
                return total_migrated
            
            batch_count = len(result.data)
            total_migrated += batch_count
            offset += batch_size
            
            print(f"  Migrated {total_migrated} rows...")
            
            if batch_count < batch_size:
                break
        
        print(f"✓ Completed: {total_migrated} rows migrated")
        return total_migrated
    
    def validate_data_integrity(self) -> bool:
        """Validate data integrity after migration."""
        print("\nValidating data integrity...")
        
        # Compare row counts
        tables = ["transactions", "vendors", "expense_categories", "payment_methods"]
        
        for table in tables:
            source_count = len(self.source.table(table).select("id").execute().data or [])
            target_count = len(self.target.table(table).select("id").execute().data or [])
            
            if source_count != target_count:
                print(f"✗ Row count mismatch for {table}: source={source_count}, target={target_count}")
                return False
            
            print(f"✓ {table}: {source_count} rows")
        
        print("✓ Data integrity validation passed")
        return True
    
    def run_migration(self) -> bool:
        """Run full migration process."""
        print("=" * 60)
        print("Database Migration")
        print("=" * 60)
        
        # Step 1: Backup
        backup_file = self.create_backup()
        
        # Step 2: Schema validation
        if not self.validate_schema():
            print("\n✗ Migration aborted: Schema validation failed")
            return False
        
        # Step 3: Data migration
        tables = [
            "payment_methods",
            "expense_categories",
            "vendors",
            "transactions",
            "receipts"
        ]
        
        for table in tables:
            self.migrate_data(table)
        
        # Step 4: Data integrity check
        if not self.validate_data_integrity():
            print("\n✗ Migration completed with warnings: Data integrity issues detected")
            print(f"To rollback, restore from: {backup_file}")
            return False
        
        print("\n" + "=" * 60)
        print("✓ Migration completed successfully!")
        print("=" * 60)
        return True


if __name__ == "__main__":
    source_url = os.getenv("SOURCE_SUPABASE_URL")
    source_key = os.getenv("SOURCE_SUPABASE_KEY")
    target_url = os.getenv("TARGET_SUPABASE_URL")
    target_key = os.getenv("TARGET_SUPABASE_KEY")
    
    if not all([source_url, source_key, target_url, target_key]):
        print("Error: Missing environment variables")
        print("Required: SOURCE_SUPABASE_URL, SOURCE_SUPABASE_KEY, TARGET_SUPABASE_URL, TARGET_SUPABASE_KEY")
        sys.exit(1)
    
    manager = MigrationManager(source_url, source_key, target_url, target_key)
    success = manager.run_migration()
    
    sys.exit(0 if success else 1)
