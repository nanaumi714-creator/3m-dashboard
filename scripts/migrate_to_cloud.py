import os
import subprocess
import sys
from datetime import datetime

def run_command(command, shell=False):
    try:
        if shell:
            subprocess.run(command, check=True, shell=True)
        else:
            subprocess.run(command.split(), check=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {command}")
        print(e)
        return False

def dump_local_db():
    print("=== 3M Dashboard Cloud Migration Helper ===")
    print("1. Dumping local database from Docker...")
    
    # Try to find the container
    # Assuming standard docker-compose naming: 3m-dashboard-db-1 or similar
    # We can try 'docker ps' to find it
    
    try:
        result = subprocess.check_output("docker ps --format '{{.Names}}'", shell=True).decode()
        containers = result.splitlines()
        db_container = next((c for c in containers if "db" in c and "3m-dashboard" in c), None)
        
        if not db_container:
            # Fallback attempts
             db_container = next((c for c in containers if "db" in c), None)
             
        if not db_container:
            print("❌ Could not find running database container. Please ensure 'docker-compose up' is running.")
            return

        print(f"Found container: {db_container}")
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        dump_file = f"dump_{timestamp}.sql"
        
        # Dump command
        # Exclude 'auth' schema if it causes issues, but Supabase usually handles it.
        # We need to be careful not to overwrite cloud 'auth'.
        # Safest: Dump only 'public' schema?
        # But Phase 4 adds references to 'auth.users'.
        # Since we cannot dump 'auth' from local (it's incomplete), we should dump only 'public'.
        
        cmd = f"docker exec -t {db_container} pg_dump -U postgres --schema=public --clean --if-exists postgres > {dump_file}"
        
        print(f"Running: {cmd}")
        # Shell=True needed for redirection >
        if run_command(cmd, shell=True):
             print(f"✅ Database dumped to: {dump_file}")
             print("\n=== Next Steps ===")
             print(f"1. Import this file to your Supabase Cloud project:")
             print(f"   psql -h <your-project-ref>.supabase.co -U postgres -d postgres -f {dump_file}")
             print("   (You can find connection strings in Supabase Dashboard > Settings > Database)")
             print("2. Ensure you have run the RLS policies if this dump does not include them (it should if init.sql was applied locally).")
             print("3. Warning: The dump includes 'DROP SCHEMA public'. Use with caution on existing Cloud logic.")
        else:
             print("❌ Dump failed.")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    dump_local_db()
