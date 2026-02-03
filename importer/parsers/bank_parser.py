"""Parser for bank account statements."""
from typing import Dict, Optional
from .base_parser import BaseParser, Transaction


class BankParser(BaseParser):
    """Parser for bank CSV format."""
    
    def parse_row(self, row: Dict[str, str]) -> Optional[Transaction]:
        """
        Parse bank statement row.
        
        Expected columns (Japanese):
        - 取引日
        - お支払金額 (negative)
        - お預り金額 (positive)
        - 摘要 (description)
        """
        # Get mapped column names
        date_col = self.column_mapping.get("occurred_on", "取引日")
        debit_col = self.column_mapping.get("debit", "お支払金額")
        credit_col = self.column_mapping.get("credit", "お預り金額")
        desc_col = self.column_mapping.get("description", "摘要")
        
        occurred_on = self.parse_date(row[date_col])
        description = row[desc_col].strip()
        
        # Amount: debit (negative) or credit (positive)
        debit_str = row.get(debit_col, "").strip()
        credit_str = row.get(credit_col, "").strip()
        
        if debit_str and debit_str != "":
            amount_yen = -abs(self.parse_amount(debit_str))
        elif credit_str and credit_str != "":
            amount_yen = abs(self.parse_amount(credit_str))
        else:
            # Skip rows with no amount
            return None
        
        return Transaction(
            occurred_on=occurred_on,
            amount_yen=amount_yen,
            description=description,
            vendor_raw=description,
            metadata={"source_type": "csv_bank"}
        )
