"""
OCR Service - Document text extraction using Gemini Vision
Handles PDF, PNG, JPG for maritime certificates and permits
"""
import logging
import os
import base64
import httpx
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from pathlib import Path
from datetime import datetime
import json
import re

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class OCRResult:
    """Result of OCR text extraction"""
    text: str
    confidence: float
    provider: str = "gemini"
    pages: int = 1
    extracted_fields: Dict[str, Any] = field(default_factory=dict)
    raw_response: Optional[Dict] = None
    error: Optional[str] = None

    @property
    def success(self) -> bool:
        return self.error is None and len(self.text) > 0


class OCRService:
    """
    OCR Service using Gemini Vision for text extraction

    Supports:
    - PDF documents
    - PNG images
    - JPG/JPEG images

    Extracts:
    - Full text content
    - Structured fields (dates, document numbers, authorities)
    """

    SUPPORTED_MIME_TYPES = {
        "application/pdf": "pdf",
        "image/png": "png",
        "image/jpeg": "jpeg",
        "image/jpg": "jpeg",
    }

    # Patterns for extracting structured fields from maritime documents
    FIELD_PATTERNS = {
        "document_number": [
            r"(?:Certificate|Document)\s*(?:No|Number|#)[:\s]*([A-Z0-9\-/]+)",
            r"(?:No|Number)[:\s]*([A-Z0-9\-/]{5,})",
        ],
        "issue_date": [
            r"(?:Issue|Issued|Date of Issue)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
            r"(?:Issue|Issued)[:\s]*(\d{1,2}\s+\w+\s+\d{4})",
        ],
        "expiry_date": [
            r"(?:Expir|Valid Until|Valid To|Validity)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
            r"(?:Expir|Valid Until)[:\s]*(\d{1,2}\s+\w+\s+\d{4})",
        ],
        "vessel_name": [
            r"(?:Vessel|Ship)\s*(?:Name)?[:\s]*([A-Z][A-Z\s\-\.]+)",
            r"M/V\s+([A-Z][A-Z\s\-\.]+)",
        ],
        "imo_number": [
            r"IMO\s*(?:No|Number|#)?[:\s]*(\d{7})",
        ],
        "flag_state": [
            r"(?:Flag|Registry|Port of Registry)[:\s]*([A-Z][a-zA-Z\s]+)",
        ],
        "issuing_authority": [
            r"(?:Issued by|Authority|Administration)[:\s]*([A-Z][a-zA-Z\s\-\.]+(?:Authority|Administration|Society|Bureau)?)",
        ],
        "gross_tonnage": [
            r"(?:Gross\s*Tonnage|GT)[:\s]*([\d,\.]+)",
        ],
    }

    def __init__(self):
        self.api_key = settings.google_api_key
        self._client: Optional[httpx.AsyncClient] = None

        if not self.api_key:
            logger.warning("Google API key not configured. OCR will run in MOCK mode.")

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client"""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=60.0)
        return self._client

    async def close(self):
        """Close HTTP client"""
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def extract_text(
        self,
        file_path: str,
        mime_type: Optional[str] = None
    ) -> OCRResult:
        """
        Extract text from a document using Gemini Vision

        Args:
            file_path: Path to the file
            mime_type: MIME type of the file (auto-detected if not provided)

        Returns:
            OCRResult with extracted text and metadata
        """
        # Validate file exists
        if not os.path.exists(file_path):
            return OCRResult(
                text="",
                confidence=0.0,
                error=f"File not found: {file_path}"
            )

        # Auto-detect mime type if not provided
        if not mime_type:
            mime_type = self._detect_mime_type(file_path)

        # Validate mime type
        if mime_type not in self.SUPPORTED_MIME_TYPES:
            return OCRResult(
                text="",
                confidence=0.0,
                error=f"Unsupported file type: {mime_type}"
            )

        # Read file content
        try:
            with open(file_path, "rb") as f:
                file_content = f.read()
            return await self.extract_text_from_bytes(file_content, mime_type, Path(file_path).name)
        except Exception as e:
            logger.error(f"OCR extraction error: {e}")
            return OCRResult(
                text="",
                confidence=0.0,
                error=str(e)
            )

    async def extract_text_from_bytes(
        self,
        content: bytes,
        mime_type: str,
        filename: Optional[str] = None
    ) -> OCRResult:
        """
        Extract text from file bytes directly.
        Uses Gemini Vision as primary OCR engine.
        """
        # 1. Try JSON Parsing first (for structured data files)
        try:
            text_content = content.decode("utf-8")
            data = json.loads(text_content)
            
            # Check for known structure (ship_intelligence_profile)
            if isinstance(data, dict) and "ship_intelligence_profile" in data:
                profile = data["ship_intelligence_profile"]
                vessel_particulars = profile.get("vessel_particulars", {})
                
                logger.info(f"JSON Parser: Successfully extracted data from {filename}")
                
                return OCRResult(
                    text=json.dumps(data, indent=2),
                    confidence=1.0,
                    provider="json_parser",
                    extracted_fields={
                        "vessel_name": vessel_particulars.get("vessel_name"),
                        "imo_number": vessel_particulars.get("imo_number"),
                        "call_sign": vessel_particulars.get("call_sign"),
                        "flag_state": vessel_particulars.get("flag"),
                        "vessel_type": vessel_particulars.get("vessel_type"),
                        "gross_tonnage": "N/A",
                        "issue_date": datetime.now().strftime("%Y-%m-%d"),
                    }
                )
        except (json.JSONDecodeError, UnicodeDecodeError):
            pass  # Not a JSON file, or binary content
            
        if mime_type not in self.SUPPORTED_MIME_TYPES:
             return OCRResult(
                text="",
                confidence=0.0,
                error=f"Unsupported file type: {mime_type}"
            )

        # 2. Use Gemini Vision OCR
        if self.api_key and "DEMO_KEY" not in self.api_key:
            try:
                logger.info(f"Using Gemini Vision OCR for {filename}...")
                
                prompt = """
                Extract the following fields from this maritime document into JSON format:
                - vessel_name
                - imo_number
                - call_sign
                - flag_state
                - vessel_type
                - gross_tonnage
                - issue_date (YYYY-MM-DD or whatever is present)
                - expiry_date (YYYY-MM-DD or whatever is present)
                - issuing_authority
                - document_number

                Return ONLY raw JSON. No markdown formatting (no ```json blocks).
                """
                
                b64_content = base64.b64encode(content).decode('utf-8')
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={self.api_key}"
                
                payload = {
                    "contents": [{
                        "parts": [
                            {"text": prompt},
                            {
                                "inline_data": {
                                    "mime_type": mime_type,
                                    "data": b64_content
                                }
                            }
                        ]
                    }]
                }
                
                async with httpx.AsyncClient() as client:
                    resp = await client.post(url, json=payload, timeout=60.0)
                    
                if resp.status_code == 200:
                    result = resp.json()
                    candidates = result.get("candidates", [])
                    if candidates:
                        raw_text = candidates[0]["content"]["parts"][0]["text"]
                        raw_text = raw_text.replace("```json", "").replace("```", "").strip()
                        
                        try:
                            extracted_data = json.loads(raw_text)
                            logger.info(f"Gemini Vision OCR Success for {filename}")
                            
                            return OCRResult(
                                text=json.dumps(extracted_data, indent=2),
                                confidence=0.95,
                                provider="gemini",
                                pages=1,
                                extracted_fields=extracted_data
                            )
                        except json.JSONDecodeError as je:
                            logger.warning(f"Gemini returned invalid JSON: {je}. Raw: {raw_text[:100]}...")
                    else:
                         logger.warning("Gemini response contained no candidates.")
                else:
                    logger.error(f"Gemini API returned status {resp.status_code}: {resp.text}")

            except Exception as e:
                logger.error(f"Gemini Vision OCR Failed: {e}")

        # 3. Static Mock (Fallback when Gemini is not available)
        logger.warning("Using Static Mock Data (Gemini not configured or failed)")
        return self._mock_extract_from_bytes(content, mime_type, filename)

    def _extract_structured_fields(self, text: str) -> Dict[str, Any]:
        """Extract structured fields from text using regex patterns"""
        fields = {}

        for field_name, patterns in self.FIELD_PATTERNS.items():
            for pattern in patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    value = match.group(1).strip()
                    value = re.sub(r'\s+', ' ', value)
                    fields[field_name] = value
                    break

        # Parse dates to standard format
        for date_field in ["issue_date", "expiry_date"]:
            if date_field in fields:
                parsed_date = self._parse_date(fields[date_field])
                if parsed_date:
                    fields[f"{date_field}_parsed"] = parsed_date.isoformat()

        return fields

    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """Parse date string to datetime"""
        date_formats = [
            "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y",
            "%m/%d/%Y", "%m-%d-%Y",
            "%d %B %Y", "%d %b %Y",
            "%Y-%m-%d",
        ]

        for fmt in date_formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue

        return None

    def _detect_mime_type(self, file_path: str) -> str:
        """Detect MIME type from file extension"""
        ext = Path(file_path).suffix.lower()
        mime_map = {
            ".pdf": "application/pdf",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
        }
        return mime_map.get(ext, "application/octet-stream")

    def _mock_extract_from_bytes(
        self,
        content: bytes,
        mime_type: str,
        filename: Optional[str]
    ) -> OCRResult:
        """Generate static mock OCR result"""
        doc_no = hash(content[:100]) % 10000
        mock_text = f"""
INTERNATIONAL MARITIME CERTIFICATE

Certificate No: MOCK-{doc_no:04d}

Vessel Name: M/V TEST VESSEL
IMO Number: 1234567

This document has been processed in MOCK mode.
Google API key is not configured.

Issue Date: 15/06/2024
Expiry Date: 14/06/2025
"""

        return OCRResult(
            text=mock_text.strip(),
            confidence=0.70,
            provider="mock",
            pages=1,
            extracted_fields={
                "document_number": f"MOCK-{doc_no:04d}",
                "vessel_name": "TEST VESSEL",
                "imo_number": "1234567",
                "issue_date": "15/06/2024",
                "expiry_date": "14/06/2025",
            }
        )


# Singleton instance
_ocr_service: Optional[OCRService] = None


def get_ocr_service() -> OCRService:
    """Get OCRService singleton instance"""
    global _ocr_service
    if _ocr_service is None:
        _ocr_service = OCRService()
    return _ocr_service
