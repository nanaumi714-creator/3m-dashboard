"""Parser for d-Payment (d払い) statements."""
from typing import Dict, Optional
from .base_parser import BaseParser, Transaction


class DPayParser(BaseParser):
    """Parser for d-Payment CSV format."""
    
    def parse_row(self, row: Dict[str, str]) -> Optional[Transaction]:
        """
        Parse d-Payment row.
        
        Expected columns (Japanese):
        - ご利用日
        - ご利用先
        - ご利用金額
        """
        # Get mapped column names
        date_col = self.column_mapping.get("occurred_on", "ご利用日")
        merchant_col = self.column_mapping.get("description", "ご利用先")
        amount_col = self.column_mapping.get("amount_yen", "ご利用金額")
        
        occurred_on = self.parse_date(row[date_col])
        description = row[merchant_col].strip()
        
        # d払いは常に支出（負の値）
        amount_str = row[amount_col].strip()
        amount_yen = -abs(self.parse_amount(amount_str))
        
        return Transaction(
            occurred_on=occurred_on,
            amount_yen=amount_yen,
            description=description,
            vendor_raw=description,
            metadata={"source_type": "csv_dpay"}
        )
