"""
OCR Service - Document text extraction using LandingAI
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
    provider: str = "landing_ai"
    pages: int = 1
    extracted_fields: Dict[str, Any] = field(default_factory=dict)
    raw_response: Optional[Dict] = None
    error: Optional[str] = None

    @property
    def success(self) -> bool:
        return self.error is None and len(self.text) > 0


class OCRService:
    """
    OCR Service using LandingAI Document AI for text extraction

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
        self.api_key = settings.landing_ai_api_key
        self.base_url = settings.landing_ai_base_url
        self._client: Optional[httpx.AsyncClient] = None

        if not self.api_key:
            logger.warning("LandingAI API key not configured. OCR will run in MOCK mode.")

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client"""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=60.0,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                }
            )
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
        Extract text from a document using LandingAI

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

        # Check if in mock mode
        if not self.api_key:
            return self._mock_extract(file_path, mime_type)

        try:
            # Read and encode file
            with open(file_path, "rb") as f:
                file_content = f.read()

            file_base64 = base64.b64encode(file_content).decode("utf-8")

            # Call LandingAI API
            client = await self._get_client()

            # LandingAI Document AI endpoint
            response = await client.post(
                f"{self.base_url}/v1/document/extract",
                json={
                    "file": file_base64,
                    "file_type": self.SUPPORTED_MIME_TYPES[mime_type],
                    "extract_text": True,
                    "extract_tables": True,
                    "extract_key_value_pairs": True,
                }
            )

            if response.status_code != 200:
                logger.error(f"LandingAI API error: {response.status_code} - {response.text}")
                return OCRResult(
                    text="",
                    confidence=0.0,
                    error=f"API error: {response.status_code}",
                    raw_response={"status": response.status_code, "body": response.text}
                )

            result = response.json()

            # Extract text from response
            extracted_text = self._parse_landing_ai_response(result)

            # Extract structured fields using patterns
            extracted_fields = self._extract_structured_fields(extracted_text)

            # Calculate confidence (use API confidence if available)
            confidence = result.get("confidence", 0.85)

            return OCRResult(
                text=extracted_text,
                confidence=confidence,
                provider="landing_ai",
                pages=result.get("pages", 1),
                extracted_fields=extracted_fields,
                raw_response=result
            )

        except httpx.TimeoutException:
            return OCRResult(
                text="",
                confidence=0.0,
                error="Request timeout"
            )
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
        Extract text from file bytes directly

        Args:
            content: File content as bytes
            mime_type: MIME type of the file
            filename: Optional filename for logging

        Returns:
            OCRResult with extracted text and metadata
        """
        if mime_type not in self.SUPPORTED_MIME_TYPES:
            return OCRResult(
                text="",
                confidence=0.0,
                error=f"Unsupported file type: {mime_type}"
            )

        if not self.api_key:
            return self._mock_extract_from_bytes(content, mime_type, filename)

        try:
            file_base64 = base64.b64encode(content).decode("utf-8")

            client = await self._get_client()

            response = await client.post(
                f"{self.base_url}/v1/document/extract",
                json={
                    "file": file_base64,
                    "file_type": self.SUPPORTED_MIME_TYPES[mime_type],
                    "extract_text": True,
                    "extract_tables": True,
                    "extract_key_value_pairs": True,
                }
            )

            if response.status_code != 200:
                return OCRResult(
                    text="",
                    confidence=0.0,
                    error=f"API error: {response.status_code}"
                )

            result = response.json()
            extracted_text = self._parse_landing_ai_response(result)
            extracted_fields = self._extract_structured_fields(extracted_text)

            return OCRResult(
                text=extracted_text,
                confidence=result.get("confidence", 0.85),
                provider="landing_ai",
                pages=result.get("pages", 1),
                extracted_fields=extracted_fields,
                raw_response=result
            )

        except Exception as e:
            logger.error(f"OCR extraction error: {e}")
            return OCRResult(
                text="",
                confidence=0.0,
                error=str(e)
            )

    def _parse_landing_ai_response(self, response: Dict) -> str:
        """Parse LandingAI API response to extract text"""
        text_parts = []

        # Extract main text content
        if "text" in response:
            text_parts.append(response["text"])

        # Extract text from pages
        if "pages" in response and isinstance(response["pages"], list):
            for page in response["pages"]:
                if "text" in page:
                    text_parts.append(page["text"])

        # Extract key-value pairs
        if "key_value_pairs" in response:
            for kv in response.get("key_value_pairs", []):
                key = kv.get("key", "")
                value = kv.get("value", "")
                if key and value:
                    text_parts.append(f"{key}: {value}")

        # Extract table data
        if "tables" in response:
            for table in response.get("tables", []):
                if "cells" in table:
                    for cell in table["cells"]:
                        if cell.get("text"):
                            text_parts.append(cell["text"])

        return "\n".join(text_parts)

    def _extract_structured_fields(self, text: str) -> Dict[str, Any]:
        """Extract structured fields from text using regex patterns"""
        fields = {}

        for field_name, patterns in self.FIELD_PATTERNS.items():
            for pattern in patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    value = match.group(1).strip()
                    # Clean up the value
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

    def _mock_extract(self, file_path: str, mime_type: str) -> OCRResult:
        """Generate mock OCR result for testing"""
        filename = Path(file_path).name

        mock_text = f"""
INTERNATIONAL SHIP SAFETY CERTIFICATE
(SOLAS, 1974, as amended)

Certificate No: MOCK-2024-{hash(filename) % 10000:04d}

Vessel Name: M/V MOCK VESSEL
IMO Number: 9876543
Flag State: Panama
Port of Registry: Panama City
Gross Tonnage: 45,000

This is to certify that the above-named ship has been surveyed
in accordance with the requirements of the International Convention
for the Safety of Life at Sea, 1974, as amended.

Issued by: Mock Maritime Authority
Issue Date: 01/01/2024
Valid Until: 31/12/2025

[MOCK DATA - LandingAI API key not configured]
"""

        return OCRResult(
            text=mock_text.strip(),
            confidence=0.75,
            provider="mock",
            pages=1,
            extracted_fields={
                "document_number": f"MOCK-2024-{hash(filename) % 10000:04d}",
                "vessel_name": "MOCK VESSEL",
                "imo_number": "9876543",
                "flag_state": "Panama",
                "gross_tonnage": "45,000",
                "issue_date": "01/01/2024",
                "expiry_date": "31/12/2025",
                "issuing_authority": "Mock Maritime Authority",
            }
        )

    def _mock_extract_from_bytes(
        self,
        content: bytes,
        mime_type: str,
        filename: Optional[str]
    ) -> OCRResult:
        """Generate mock OCR result from bytes"""
        mock_text = f"""
INTERNATIONAL MARITIME CERTIFICATE

Certificate No: MOCK-{hash(content[:100]) % 10000:04d}

Vessel Name: M/V TEST VESSEL
IMO Number: 1234567

This document has been processed in MOCK mode.
LandingAI API key is not configured.

Issue Date: 15/06/2024
Expiry Date: 14/06/2025
"""

        return OCRResult(
            text=mock_text.strip(),
            confidence=0.70,
            provider="mock",
            pages=1,
            extracted_fields={
                "document_number": f"MOCK-{hash(content[:100]) % 10000:04d}",
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
