"""Excel export functionality."""
from typing import List, Dict
from datetime import datetime
import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter


def export_transactions_to_excel(
        transactions: List[Dict],
        output_path: str,
        template_config: Dict = None
    ) -> str:
"""
    Export transactions to Excel file.

    Args:
transactions: List of transaction dicts
output_path: Output file path
template_config: Optional template configuration

Returns:
        Path to created Excel file
"""
wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Transactions"
    
    # Header style
header_fill = PatternFill(start_color = "366092", end_color = "366092", fill_type = "solid")
header_font = Font(color = "FFFFFF", bold = True)
header_alignment = Alignment(horizontal = "center", vertical = "center")
    
    # Define columns
columns = template_config.get("columns", [
    { "key": "occurred_on", "label": "取引日", "width": 12 },
    { "key": "description", "label": "内容", "width": 30 },
    { "key": "vendor_name", "label": "取引先", "width": 20 },
    { "key": "amount_yen", "label": "金額", "width": 12 },
    { "key": "category_name", "label": "カテゴリ", "width": 15 },
    { "key": "is_business", "label": "事業", "width": 8 },
    { "key": "business_ratio", "label": "按分率", "width": 10 },
]) if template_config else[
    { "key": "occurred_on", "label": "取引日", "width": 12 },
    { "key": "description", "label": "内容", "width": 30 },
    { "key": "amount_yen", "label": "金額", "width": 12 },
]
    
    # Write headers
for col_idx, col_config in enumerate(columns, start = 1):
    cell = ws.cell(row = 1, column = col_idx)
cell.value = col_config["label"]
cell.fill = header_fill
cell.font = header_font
cell.alignment = header_alignment
        
        # Set column width
ws.column_dimensions[get_column_letter(col_idx)].width = col_config.get("width", 15)
    
    # Write data
for row_idx, tx in enumerate(transactions, start = 2):
    for col_idx, col_config in enumerate(columns, start = 1):
        key = col_config["key"]
value = tx.get(key, "")
            
            # Format values
if key == "amount_yen":
    value = f"¥{value:,}" if value else ""
            elif key == "is_business":
value = "○" if value else ""
            elif key == "business_ratio":
value = f"{value}%" if value else ""

ws.cell(row = row_idx, column = col_idx, value = value)
    
    # Freeze header row
ws.freeze_panes = "A2"
    
    # Save
wb.save(output_path)
return output_path
