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

    with open(file_path, "r", encoding="utf-8-sig") as file:
        reader = csv.DictReader(file)
        for row_num, row in enumerate(reader, start=1):
            occurred_on = datetime.strptime(row[column_mapping["date"]], "%Y/%m/%d").date()
            amount_str = (
                row[column_mapping["amount"]].replace(",", "").replace("¥", "")
            )
            amount_yen = int(amount_str)
            description = row[column_mapping["description"]].strip()

            vendor_raw = description.split()[0] if description else ""
            vendor_norm = normalize_vendor(vendor_raw)

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
        supabase.table("transactions").insert(new_transactions).execute()
        print(f"✅ Imported {len(new_transactions)} transactions")

    if duplicate_count > 0:
        print(f"⚠️  Skipped {duplicate_count} potential duplicates")


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
