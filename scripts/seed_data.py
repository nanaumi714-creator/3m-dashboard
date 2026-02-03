import os
import random
from datetime import date, timedelta
from supabase import create_client, Client

# Default config for local dev
SUPABASE_URL = os.environ.get("SUPABASE_URL", "http://localhost:54321")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "your-anon-key-here") # Users need to provide this or rely on default if open

def get_supabase() -> Client:
    # In local dev, anon key is usually consistent or provided via env
    # If key is invalid, this will fail.
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def seed_data():
    client = get_supabase()
    print(f"Connecting to {SUPABASE_URL}...")

    # 1. Get or Create Payment Method
    res = client.table("payment_methods").select("id").eq("name", "Seed Card").execute()
    if res.data:
        pm_id = res.data[0]["id"]
    else:
        print("Creating 'Seed Card' payment method...")
        res = client.table("payment_methods").insert({
            "name": "Seed Card",
            "type": "credit"
        }).execute()
        pm_id = res.data[0]["id"]

    # 2. Generate Transactions
    transactions = []
    vendors = ["Amazon", "Google Cloud", "Starbucks", "Seven Eleven", "Uber", "Zoom", "Slack"]
    
    start_date = date.today().replace(day=1)
    
    print("Generating 20 transactions...")
    for i in range(20):
        occurred_on = start_date + timedelta(days=random.randint(0, 20))
        vendor = random.choice(vendors)
        amount = random.randint(100, 10000) * -1 # Expense
        
        # Simple fingerprint (not using the strict logic for seed, just unique enough)
        fingerprint = f"seed-{i}-{random.randint(1000,9999)}"

        transactions.append({
            "occurred_on": occurred_on.isoformat(),
            "amount_yen": amount,
            "description": f"{vendor} Payment",
            "payment_method_id": pm_id,
            "vendor_raw": vendor,
            "fingerprint": fingerprint,
            "source_row_number": i
        })

    # 3. Insert
    try:
        client.table("transactions").insert(transactions).execute()
        print(f"Successfully inserted {len(transactions)} transactions!")
    except Exception as e:
        print(f"Error inserting data: {e}")

if __name__ == "__main__":
    # Check if key is dummy
    if "your-anon-key" in SUPABASE_KEY:
        print("⚠️  Warning: Using default dummy key. If insertion fails, set SUPABASE_KEY env var.")
        # Try anyway as local supabase sometimes accepts it if unsecured or default
    
    seed_data()
