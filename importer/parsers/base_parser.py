"""Base parser for CSV imports."""
from abc import ABC, abstractmethod
from datetime import date
from typing import Dict, List, Optional
import csv
import chardet


class Transaction:
    """Parsed transaction data."""
    def __init__(
        self,
        occurred_on: date,
        amount_yen: int,
        description: str,
        vendor_raw: Optional[str] = None,
        metadata: Optional[Dict] = None,
    ):
        self.occurred_on = occurred_on
        self.amount_yen = amount_yen
        self.description = description
        self.vendor_raw = vendor_raw or description
        self.metadata = metadata or {}


class BaseParser(ABC):
    """Abstract base class for CSV parsers."""
    
    def __init__(self, config: Dict):
        """
        Initialize parser with configuration.
        
        config example:
        {
            "column_mapping": {
                "occurred_on": "取引日",
                "amount_yen": "お支払金額",
                "description": "摘要"
            },
            "parser_options": {
                "date_format": "YYYY/MM/DD",
                "encoding": "shift_jis",
                "skip_rows": 1
            }
        }
        """
        self.column_mapping = config.get("column_mapping", {})
        self.parser_options = config.get("parser_options", {})
        self.encoding = self.parser_options.get("encoding", "utf-8")
        self.skip_rows = self.parser_options.get("skip_rows", 0)
        self.date_format = self.parser_options.get("date_format", "YYYY-MM-DD")
    
    def detect_encoding(self, file_path: str) -> str:
        """Auto-detect file encoding."""
        with open(file_path, "rb") as f:
            raw_data = f.read()
            result = chardet.detect(raw_data)
            return result["encoding"] or "utf-8"
    
    def parse_date(self, date_str: str) -> date:
        """Parse date string according to format."""
        # Convert format: YYYY/MM/DD or YYYY-MM-DD
        date_str = date_str.replace("/", "-")
        return date.fromisoformat(date_str)
    
    def parse_amount(self, amount_str: str) -> int:
        """Parse amount string to integer."""
        # Remove commas, yen symbol, etc.
        amount_str = amount_str.replace(",", "").replace("円", "").replace("¥", "").strip()
        
        # Handle parentheses for negative (e.g., "(1,000)" = -1000)
        if amount_str.startswith("(") and amount_str.endswith(")"):
            amount_str = "-" + amount_str[1:-1]
        
        return int(float(amount_str))
    
    @abstractmethod
    def parse_row(self, row: Dict[str, str]) -> Optional[Transaction]:
        """Parse a single row into Transaction. Return None to skip."""
        pass
    
    def parse_file(self, file_path: str) -> List[Transaction]:
        """Parse entire CSV file."""
        # Detect encoding if not specified
        encoding = self.encoding
        if encoding == "auto":
            encoding = self.detect_encoding(file_path)
        
        transactions = []
        
        with open(file_path, "r", encoding=encoding) as f:
            # Skip header rows
            for _ in range(self.skip_rows):
                next(f)
            
            reader = csv.DictReader(f)
            for row_num, row in enumerate(reader, start=1):
                try:
                    transaction = self.parse_row(row)
                    if transaction:
                        transactions.append(transaction)
                except Exception as e:
                    print(f"Warning: Failed to parse row {row_num}: {e}")
                    continue
        
        return transactions
