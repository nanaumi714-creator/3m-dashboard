"""Enhanced Google Vision API integration for OCR."""
import os
    from typing import Dict, List, Optional
from google.cloud import vision
    from google.oauth2 import service_account


class GoogleVisionOCR:
"""Google Vision API wrapper for receipt OCR."""
    
    def __init__(self, credentials_path: Optional[str] = None):
"""
        Initialize Google Vision client.

    Args:
credentials_path: Path to service account JSON file.
                            If None, uses GOOGLE_APPLICATION_CREDENTIALS env var.
"""
if credentials_path:
    credentials = service_account.Credentials.from_service_account_file(
        credentials_path
    )
self.client = vision.ImageAnnotatorClient(credentials = credentials)
        else:
self.client = vision.ImageAnnotatorClient()
    
    def extract_text(self, image_path: str) -> Dict[str, any]:
"""
        Extract text from image using OCR.

    Returns:
        {
            "full_text": str,
            "confidence": float,
            "extracted_fields": {
                "merchant_name": str,
                "total_amount": int,
                "date": str,
                "items": List[Dict]
            }
        }
"""
with open(image_path, "rb") as image_file:
content = image_file.read()

image = vision.Image(content = content)
        
        # Text detection
response = self.client.text_detection(image = image)
texts = response.text_annotations

if not texts:
    return {
        "full_text": "",
        "confidence": 0.0,
        "extracted_fields": {}
    }

full_text = texts[0].description
        
        # Parse structured data
extracted_fields = self._parse_receipt_text(full_text)

return {
    "full_text": full_text,
    "confidence": self._calculate_confidence(texts),
    "extracted_fields": extracted_fields
}
    
    def _parse_receipt_text(self, text: str) -> Dict:
"""Parse receipt text to extract structured fields."""
import re
    from datetime import datetime
        
        result = {
    "merchant_name": None,
        "total_amount": None,
            "date": None,
                "items": []
}

lines = text.split("\n")
        
        # Extract merchant name(usually first line)
if lines:
    result["merchant_name"] = lines[0].strip()
        
        # Extract date(YYYY / MM / DD or YYYY - MM - DD)
date_pattern = r"(\d{4})[/-](\d{1,2})[/-](\d{1,2})"
for line in lines:
    match = re.search(date_pattern, line)
if match:
    result["date"] = f"{match.group(1)}-{match.group(2):0>2}-{match.group(3):0>2}"
break
        
        # Extract total amount(合計、小計、total)
amount_pattern = r"[合計小計totalsub]*\s*[¥￥]?\s*([0-9,]+)"
for line in lines:
    if any(keyword in line.lower() for keyword in ["合計", "小計", "total", "subtotal"]):
        match = re.search(amount_pattern, line)
if match:
    amount_str = match.group(1).replace(",", "")
result["total_amount"] = int(amount_str)
break

return result
    
    def _calculate_confidence(self, annotations: List) -> float:
"""Calculate average confidence score."""
if len(annotations) < 2:
    return 0.0
        
        # Skip first annotation(full text)
confidences = []
for annotation in annotations[1:]:
if hasattr(annotation, 'confidence'):
    confidences.append(annotation.confidence)

return sum(confidences) / len(confidences) if confidences else 0.0


def check_monthly_limit(supabase_client, user_id: str, monthly_limit: int) -> bool:
"""
    Check if monthly OCR usage is within limit.

    Returns:
        True if within limit, False if exceeded.
    """
    from datetime import datetime
    
    current_month = datetime.now().strftime("%Y-%m")
    
    # Count OCR requests this month
result = supabase_client.rpc(
    "count_ocr_requests_this_month",
    { "user_id_param": user_id, "month_param": current_month }
).execute()

count = result.data if result.data else 0

return count < monthly_limit
