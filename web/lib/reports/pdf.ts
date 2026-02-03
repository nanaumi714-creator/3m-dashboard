"""PDF report generation."""
from typing import Dict, List
from datetime import datetime
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont


def generate_monthly_report_pdf(
        year_month: str,
        summary_data: Dict,
        category_breakdown: List[Dict],
        output_path: str
    ) -> str:
"""
    Generate monthly expense report PDF.

    Args:
year_month: YYYY - MM format
summary_data: Summary statistics
category_breakdown: Category - wise breakdown
output_path: Output PDF path

Returns:
        Path to created PDF
"""
doc = SimpleDocTemplate(output_path, pagesize = A4)
story = []
styles = getSampleStyleSheet()
    
    # Title
title_style = ParagraphStyle(
    'CustomTitle',
    parent = styles['Heading1'],
    fontSize = 24,
    textColor = colors.HexColor('#1a1a1a'),
    spaceAfter = 30,
)

title = Paragraph(f"{year_month} 月次経費レポート", title_style)
story.append(title)
story.append(Spacer(1, 20))
    
    # Summary section
summary_data_list = [
    ["項目", "金額"],
    ["総支出", f"¥{summary_data.get('total_expense', 0):,}"],
    ["事業支出", f"¥{summary_data.get('business_expense', 0):,}"],
    ["個人支出", f"¥{summary_data.get('personal_expense', 0):,}"],
    ["取引件数", f"{summary_data.get('transaction_count', 0)}件"],
]

summary_table = Table(summary_data_list, colWidths = [80 * mm, 80 * mm])
summary_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 14),
    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
    ('GRID', (0, 0), (-1, -1), 1, colors.black)
]))

story.append(summary_table)
story.append(Spacer(1, 30))
    
    # Category breakdown
category_title = Paragraph("カテゴリ別内訳", styles['Heading2'])
story.append(category_title)
story.append(Spacer(1, 10))

category_data = [["カテゴリ", "金額", "割合"]]
for item in category_breakdown:
    category_data.append([
        item["category_name"],
        f"¥{item['amount']:,}",
        f"{item['percentage']:.1f}%"
    ])

category_table = Table(category_data, colWidths = [60 * mm, 50 * mm, 50 * mm])
category_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
    ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ('BACKGROUND', (0, 1), (-1, -1), colors.lightgrey),
]))

story.append(category_table)
    
    # Build PDF
doc.build(story)
return output_path
