import argparse
import csv
import hashlib
from datetime import datetime
from pathlib import Path

from supabase import Client, create_client

from fingerprint import generate_fingerprint, normalize_vendor


def build_supabase_client(url: str, key: str) -> Client:
    return create_client(url, key)


def calculate_checksum(file_path: Path) -> str:
    with open(file_path, "rb") as file:
        return hashlib.sha256(file.read()).hexdigest()


def import_csv(
    supabase: Client,
    file_path: Path,
    payment_method_id: str,
    column_mapping: dict,
) -> None:
    """
    Import CSV file into transactions table.

    column_mapping example:
    {
        "date": "transaction_date",
        "amount": "amount",
        "description": "memo"
    }
    """

    file_checksum = calculate_checksum(file_path)

    existing = (
        supabase.table("import_sources").select("id").eq("checksum", file_checksum).execute()
    )
    if existing.data:
        print(f"⚠️  File already imported (checksum: {file_checksum[:8]}...)")
        print("Inserted: 0 / Skipped: 0 / Duplicate candidates: 0 / Errors: 0")
        return

    import_source = (
        supabase.table("import_sources")
        .insert(
            {
                "source_type": "csv",
                "file_path": str(file_path),
                "checksum": file_checksum,
                "metadata": {"filename": file_path.name, "columns": column_mapping},
            }
        )
        .execute()
    )

    import_source_id = import_source.data[0]["id"]
    transactions = []
    errors = 0

    with open(file_path, "r", encoding="utf-8-sig") as file:
        reader = csv.DictReader(file)
        missing_columns = [
            column_mapping[key]
            for key in ("date", "amount", "description")
            if column_mapping[key] not in (reader.fieldnames or [])
        ]
        if missing_columns:
            raise ValueError(
                f"Missing required columns: {', '.join(missing_columns)}. "
                "Check the CSV header and column mapping arguments."
            )
        for row_num, row in enumerate(reader, start=1):
            try:
                occurred_on = datetime.strptime(
                    row[column_mapping["date"]], "%Y/%m/%d"
                ).date()
                amount_str = (
                    row[column_mapping["amount"]].replace(",", "").replace("¥", "")
                )
                amount_yen = int(amount_str)
                description = row[column_mapping["description"]].strip()
            except (KeyError, ValueError) as exc:
                errors += 1
                print(f"⚠️  Row {row_num} skipped: {exc}")
                continue

            vendor_raw = description
            vendor_norm = normalize_vendor(vendor_raw[:30])

            fingerprint = generate_fingerprint(
                occurred_on=occurred_on,
                amount_yen=amount_yen,
                payment_method_id=payment_method_id,
                vendor_norm=vendor_norm,
                source_type="csv",
            )

            transactions.append(
                {
                    "occurred_on": occurred_on.isoformat(),
                    "amount_yen": amount_yen,
                    "description": description,
                    "payment_method_id": payment_method_id,
                    "import_source_id": import_source_id,
                    "source_row_number": row_num,
                    "vendor_raw": vendor_raw,
                    "vendor_norm": vendor_norm,
                    "fingerprint": fingerprint,
                }
            )

    if not transactions:
        print("⚠️  No transactions to import")
        print(f"Inserted: 0 / Skipped: 0 / Duplicate candidates: 0 / Errors: {errors}")
        return

    fingerprints = [transaction["fingerprint"] for transaction in transactions]
    existing_fps = (
        supabase.table("transactions").select("fingerprint").in_("fingerprint", fingerprints)
    ).execute()
    existing_fps = {row["fingerprint"] for row in existing_fps.data}

    new_transactions = [
        transaction for transaction in transactions if transaction["fingerprint"] not in existing_fps
    ]
    duplicate_count = len(transactions) - len(new_transactions)

    if new_transactions:
        # Pre-load vendors for resolution (naive approach: load all names if small)
        # For scalability, we should query specific names. But for Phase 2 MVP, loading all vendors is fine.
        vendors_resp = supabase.table("vendors").select("id, name").execute()
        vendor_map = {row["name"]: row["id"] for row in vendors_resp.data}
        
        # Link vendor_id
        for tx in new_transactions:
            # Try exact match on normalized vendor name (assuming vendors.name IS normalized)
            # OR try match on vendor_norm.
            # In init.sql, vendors.name is unique. 
            # We assume vendors.name stores the 'vendor_norm' representation or detailed name?
            # Let's match vendor_norm first.
            if tx["vendor_norm"] in vendor_map:
                tx["vendor_id"] = vendor_map[tx["vendor_norm"]]
        
        # Insert transactions
        inserted_data = supabase.table("transactions").insert(new_transactions).execute()
        inserted_txs = inserted_data.data if inserted_data.data else []
        
        # Setup Rules
        rules_resp = supabase.table("vendor_rules").select("*").eq("is_active", True).order("rule_priority").execute()
        rules = rules_resp.data
        
        business_infos = []
        for tx in inserted_txs:
            if not tx.get("vendor_id"):
                continue
                
            # Find matching rule
            matched_rule = next((r for r in rules if r["vendor_id"] == tx["vendor_id"]), None)
            
            if matched_rule:
                business_infos.append({
                    "transaction_id": tx["id"],
                    "is_business": matched_rule["is_business"],
                    "business_ratio": matched_rule["business_ratio"],
                    "category_id": matched_rule["category_id"],
                    "judged_by": "system_rule",
                    "judged_at": datetime.now().isoformat(),
                    "audit_note": f"Applied rule: {matched_rule.get('note', '')}"
                })
        
        if business_infos:
            supabase.table("transaction_business_info").insert(business_infos).execute()
            print(f"✅  Applied rules to {len(business_infos)} transactions")

    inserted_count = len(new_transactions)
    skipped_count = len(transactions) - inserted_count

    print(
        "Inserted: {inserted} / Skipped: {skipped} / Duplicate candidates: "
        "{duplicate} / Errors: {errors}".format(
            inserted=inserted_count,
            skipped=skipped_count,
            duplicate=duplicate_count,
            errors=errors,
        )
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import CSV transactions")
    parser.add_argument("file", type=Path, help="Path to CSV file")
    parser.add_argument("payment_method_id", help="Payment method UUID")
    parser.add_argument("--date", dest="date", required=True, help="CSV column for date")
    parser.add_argument("--amount", dest="amount", required=True, help="CSV column for amount")
    parser.add_argument(
        "--description", dest="description", required=True, help="CSV column for description"
    )
    parser.add_argument("--url", required=True, help="Supabase URL")
    parser.add_argument("--key", required=True, help="Supabase anon key")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    supabase = build_supabase_client(args.url, args.key)

    import_csv(
        supabase=supabase,
        file_path=args.file,
        payment_method_id=args.payment_method_id,
        column_mapping={
            "date": args.date,
            "amount": args.amount,
            "description": args.description,
        },
    )


if __name__ == "__main__":
    main()
