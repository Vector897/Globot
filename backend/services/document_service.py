"""
Document Service - User document upload and management
Stores document metadata + OCR text in ChromaDB Cloud (user_documents collection).
Physical files are saved to disk.
"""
import logging
import os
import uuid
import json
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import UploadFile

from config import get_settings
from services.ocr_service import get_ocr_service, OCRResult
from services.maritime_knowledge_base import get_maritime_knowledge_base
from core.document_tools import classify_document_from_text

logger = logging.getLogger(__name__)
settings = get_settings()


class DocumentService:
    """
    User document upload and management service backed by ChromaDB.

    Handles:
    - File upload and storage (disk)
    - OCR text extraction (LandingAI)
    - Metadata + text stored in ChromaDB user_documents collection
    - Expiry tracking
    - Document-requirement matching
    """

    ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
    ALLOWED_MIME_TYPES = {
        "application/pdf",
        "image/png",
        "image/jpeg",
    }

    def __init__(self):
        self.kb = get_maritime_knowledge_base()
        self.ocr_service = get_ocr_service()
        self.upload_dir = settings.documents_upload_dir
        os.makedirs(self.upload_dir, exist_ok=True)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _safe_meta(value: Any, default: Any = "") -> Any:
        """Ensure a value is ChromaDB-safe (no None, no nested objects)."""
        if value is None:
            return default
        return value

    def _build_metadata(
        self,
        *,
        customer_id: int,
        vessel_id: Optional[int],
        title: str,
        document_type: str,
        file_path: str,
        file_name: Optional[str],
        file_size: int,
        mime_type: Optional[str],
        ocr_result: OCRResult,
        issuing_authority: Optional[str],
        issue_date: Optional[datetime],
        expiry_date: Optional[datetime],
        document_number: Optional[str],
        extracted_fields_json: str,
    ) -> Dict[str, Any]:
        """Build a flat, ChromaDB-safe metadata dict."""
        return {
            "customer_id": customer_id,
            "vessel_id": self._safe_meta(vessel_id, 0),
            "title": title,
            "document_type": document_type,
            "file_path": file_path,
            "file_name": self._safe_meta(file_name),
            "file_size": file_size,
            "mime_type": self._safe_meta(mime_type),
            "ocr_provider": self._safe_meta(ocr_result.provider),
            "ocr_confidence": self._safe_meta(ocr_result.confidence, 0.0),
            "issuing_authority": self._safe_meta(issuing_authority),
            "issue_date": issue_date.isoformat() if issue_date else "",
            "expiry_date": expiry_date.isoformat() if expiry_date else "",
            "document_number": self._safe_meta(document_number),
            "is_validated": False,
            "validation_notes": "",
            "extracted_fields_json": extracted_fields_json,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }

    @staticmethod
    def _to_doc_dict(raw: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert a ChromaDB result dict into the shape expected by API
        endpoints (mirrors the old UserDocument ORM columns).
        """
        return {
            "id": raw.get("id", ""),
            "customer_id": raw.get("customer_id"),
            "vessel_id": raw.get("vessel_id"),
            "title": raw.get("title", ""),
            "document_type": raw.get("document_type", "other"),
            "file_path": raw.get("file_path", ""),
            "file_name": raw.get("file_name"),
            "file_size": raw.get("file_size"),
            "mime_type": raw.get("mime_type"),
            "extracted_text": raw.get("text", ""),
            "ocr_provider": raw.get("ocr_provider"),
            "ocr_confidence": raw.get("ocr_confidence"),
            "extracted_fields": raw.get("extracted_fields_json", "{}"),
            "issuing_authority": raw.get("issuing_authority") or None,
            "issue_date": raw.get("issue_date") or None,
            "expiry_date": raw.get("expiry_date") or None,
            "document_number": raw.get("document_number") or None,
            "is_validated": raw.get("is_validated", False),
            "validation_notes": raw.get("validation_notes") or None,
            "created_at": raw.get("created_at", ""),
            "updated_at": raw.get("updated_at", ""),
        }

    # ------------------------------------------------------------------
    # Core CRUD
    # ------------------------------------------------------------------

    async def upload_document(
        self,
        customer_id: int,
        vessel_id: Optional[int],
        file: UploadFile,
        document_type: str,
        title: str,
        issue_date: Optional[datetime] = None,
        expiry_date: Optional[datetime] = None,
        document_number: Optional[str] = None,
        issuing_authority: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Upload and process a document.

        Returns:
            Dict with document fields (mirrors old UserDocument columns).
        """
        # Validate file
        self._validate_file(file)

        # Generate unique filename
        file_ext = Path(file.filename).suffix.lower()
        doc_id = str(uuid.uuid4())
        unique_filename = f"{doc_id}{file_ext}"
        file_path = os.path.join(self.upload_dir, unique_filename)

        # Save file to disk
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        # Run OCR
        ocr_result = await self.ocr_service.extract_text_from_bytes(
            content=content,
            mime_type=file.content_type,
            filename=file.filename,
        )

        # Extract fields from OCR if not provided
        extracted_fields = ocr_result.extracted_fields

        if not document_number and "document_number" in extracted_fields:
            document_number = extracted_fields["document_number"]

        if not issue_date and "issue_date_parsed" in extracted_fields:
            try:
                issue_date = datetime.fromisoformat(extracted_fields["issue_date_parsed"])
            except Exception:
                pass

        if not expiry_date and "expiry_date_parsed" in extracted_fields:
            try:
                expiry_date = datetime.fromisoformat(extracted_fields["expiry_date_parsed"])
            except Exception:
                pass

        if not issuing_authority and "issuing_authority" in extracted_fields:
            issuing_authority = extracted_fields["issuing_authority"]

        # Auto-classify document type if user provided "other" or empty.
        # Strategy: keyword matching first, then semantic (RAG) fallback.
        if document_type in ("other", "unknown", ""):
            # 1. Keyword matching on OCR text
            if ocr_result.text:
                inferred = classify_document_from_text(ocr_result.text)
                if inferred != "unknown":
                    document_type = inferred
                    logger.info(f"Auto-classified document as '{document_type}' from OCR text (keyword)")
            # 2. Keyword matching on title
            if document_type in ("other", "unknown", ""):
                inferred = classify_document_from_text(title)
                if inferred != "unknown":
                    document_type = inferred
                    logger.info(f"Auto-classified document as '{document_type}' from title (keyword)")
            # 3. Semantic search: find similar already-classified documents
            if document_type in ("other", "unknown", "") and ocr_result.text:
                try:
                    similar = self.kb.search_user_documents(
                        query_text=ocr_result.text[:500],
                        n_results=3,
                    )
                    for s in similar:
                        s_type = s.get("document_type", "other")
                        if s_type not in ("other", "unknown", ""):
                            document_type = s_type
                            logger.info(
                                f"Auto-classified document as '{document_type}' "
                                f"via semantic match (score={s.get('score', '?')})"
                            )
                            break
                except Exception as e:
                    logger.warning(f"Semantic auto-classify failed: {e}")

        # Build metadata
        metadata = self._build_metadata(
            customer_id=customer_id,
            vessel_id=vessel_id,
            title=title,
            document_type=document_type,
            file_path=file_path,
            file_name=file.filename,
            file_size=len(content),
            mime_type=file.content_type,
            ocr_result=ocr_result,
            issuing_authority=issuing_authority,
            issue_date=issue_date,
            expiry_date=expiry_date,
            document_number=document_number,
            extracted_fields_json=json.dumps(extracted_fields),
        )

        # Store in ChromaDB
        self.kb.add_user_document(
            doc_id=doc_id,
            text=ocr_result.text,
            metadata=metadata,
        )

        logger.info(f"Document uploaded: {doc_id} - {title}")

        # Return dict matching API expectations
        return self._to_doc_dict({"id": doc_id, "text": ocr_result.text, **metadata})

    def get_document(self, document_id: str) -> Optional[Dict[str, Any]]:
        """Get a document by ID."""
        raw = self.kb.get_user_document_by_id(document_id)
        if not raw:
            return None
        return self._to_doc_dict(raw)

    def get_vessel_documents(
        self,
        vessel_id: int,
        document_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Get all documents for a vessel, optionally filtered by type."""
        where: Dict[str, Any] = {"vessel_id": vessel_id}
        if document_type:
            where["document_type"] = document_type
        raw_docs = self.kb.get_user_documents(where, limit=200)
        docs = [self._to_doc_dict(d) for d in raw_docs]
        # Sort by created_at descending (ChromaDB has no ORDER BY)
        docs.sort(key=lambda d: d.get("created_at", ""), reverse=True)
        return docs

    def get_customer_documents(
        self,
        customer_id: int,
        document_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Get all documents for a customer."""
        where: Dict[str, Any] = {"customer_id": customer_id}
        if document_type:
            where["document_type"] = document_type
        raw_docs = self.kb.get_user_documents(where, limit=200)
        docs = [self._to_doc_dict(d) for d in raw_docs]
        docs.sort(key=lambda d: d.get("created_at", ""), reverse=True)
        return docs

    def check_document_expiry(
        self,
        vessel_id: int,
        warning_days: int = 30,
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Check for expired or expiring documents.

        Returns:
            Dict with 'expired', 'expiring_soon', 'valid', 'no_expiry' lists.
        """
        documents = self.get_vessel_documents(vessel_id)
        now = datetime.now()
        warning_threshold = now + timedelta(days=warning_days)

        result: Dict[str, List[Dict[str, Any]]] = {
            "expired": [],
            "expiring_soon": [],
            "valid": [],
            "no_expiry": [],
        }

        for doc in documents:
            expiry_str = doc.get("expiry_date")
            if not expiry_str:
                result["no_expiry"].append(doc)
                continue
            try:
                expiry = datetime.fromisoformat(expiry_str)
            except (ValueError, TypeError):
                result["no_expiry"].append(doc)
                continue

            if expiry < now:
                result["expired"].append(doc)
            elif expiry < warning_threshold:
                result["expiring_soon"].append(doc)
            else:
                result["valid"].append(doc)

        return result

    def delete_document(self, document_id: str) -> bool:
        """Delete a document (ChromaDB record + file on disk)."""
        raw = self.kb.get_user_document_by_id(document_id)
        if not raw:
            return False

        # Delete file from disk
        file_path = raw.get("file_path", "")
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                logger.error(f"Failed to delete file {file_path}: {e}")

        # Delete from ChromaDB
        self.kb.delete_user_document(document_id)
        logger.info(f"Document deleted: {document_id}")
        return True

    def validate_document(
        self,
        document_id: str,
        is_valid: bool,
        notes: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Validate or invalidate a document."""
        raw = self.kb.get_user_document_by_id(document_id)
        if not raw:
            return None

        updates = {
            "is_validated": is_valid,
            "validation_notes": notes or "",
            "updated_at": datetime.now().isoformat(),
        }
        self.kb.update_user_document_metadata(document_id, updates)

        # Re-fetch to return updated doc
        raw = self.kb.get_user_document_by_id(document_id)
        return self._to_doc_dict(raw) if raw else None

    def match_document_to_requirement(
        self,
        document: Dict[str, Any],
        required_doc_type: str,
        check_expiry: bool = True,
    ) -> Dict[str, Any]:
        """
        Check if a document satisfies a requirement.

        Returns:
            Dict with 'matches', 'reason', 'is_expired', 'days_until_expiry'.
        """
        result: Dict[str, Any] = {
            "matches": False,
            "reason": "",
            "is_expired": False,
            "days_until_expiry": None,
        }

        doc_type = document.get("document_type", "")
        if doc_type != required_doc_type:
            result["reason"] = f"Document type mismatch: {doc_type} != {required_doc_type}"
            return result

        if check_expiry:
            expiry_str = document.get("expiry_date")
            if expiry_str:
                try:
                    expiry = datetime.fromisoformat(expiry_str)
                    now = datetime.now()
                    if expiry < now:
                        result["is_expired"] = True
                        result["reason"] = f"Document expired on {expiry.strftime('%Y-%m-%d')}"
                        return result
                    result["days_until_expiry"] = (expiry - now).days
                except (ValueError, TypeError):
                    pass

        result["matches"] = True
        result["reason"] = "Document matches requirement"
        return result

    def find_matching_documents(
        self,
        vessel_id: int,
        required_doc_types: List[str],
        check_expiry: bool = True,
    ) -> Dict[str, Dict[str, Any]]:
        """
        Find documents matching a list of requirements.

        Args:
            vessel_id: Vessel ID
            required_doc_types: List of required document type strings
            check_expiry: Whether to check document expiry

        Returns:
            Dict mapping document_type to match result.
        """
        documents = self.get_vessel_documents(vessel_id)

        results: Dict[str, Dict[str, Any]] = {}
        for req_type in required_doc_types:
            results[req_type] = {
                "required": True,
                "found": False,
                "document": None,
                "is_expired": False,
                "days_until_expiry": None,
            }

            for doc in documents:
                match = self.match_document_to_requirement(doc, req_type, check_expiry)
                if match["matches"]:
                    results[req_type].update({
                        "found": True,
                        "document": {
                            "id": doc["id"],
                            "title": doc["title"],
                            "document_number": doc.get("document_number"),
                            "expiry_date": doc.get("expiry_date") or None,
                        },
                        "is_expired": match["is_expired"],
                        "days_until_expiry": match["days_until_expiry"],
                    })
                    break
                elif match["is_expired"] and not results[req_type]["found"]:
                    results[req_type].update({
                        "found": True,
                        "document": {
                            "id": doc["id"],
                            "title": doc["title"],
                            "document_number": doc.get("document_number"),
                            "expiry_date": doc.get("expiry_date") or None,
                        },
                        "is_expired": True,
                        "days_until_expiry": None,
                    })

        return results

    def get_document_summary(self, vessel_id: int) -> Dict[str, Any]:
        """Get summary of documents for a vessel."""
        documents = self.get_vessel_documents(vessel_id)
        expiry_check = self.check_document_expiry(vessel_id)

        type_counts: Dict[str, int] = {}
        for doc in documents:
            doc_type = doc.get("document_type", "other")
            type_counts[doc_type] = type_counts.get(doc_type, 0) + 1

        return {
            "total_documents": len(documents),
            "by_type": type_counts,
            "expired_count": len(expiry_check["expired"]),
            "expiring_soon_count": len(expiry_check["expiring_soon"]),
            "valid_count": len(expiry_check["valid"]),
            "no_expiry_count": len(expiry_check["no_expiry"]),
        }

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def _validate_file(self, file: UploadFile) -> None:
        """Validate uploaded file."""
        if not file.filename:
            raise ValueError("Filename is required")

        ext = Path(file.filename).suffix.lower()
        if ext not in self.ALLOWED_EXTENSIONS:
            raise ValueError(f"File extension {ext} not allowed. Allowed: {self.ALLOWED_EXTENSIONS}")

        if file.content_type not in self.ALLOWED_MIME_TYPES:
            raise ValueError(f"MIME type {file.content_type} not allowed. Allowed: {self.ALLOWED_MIME_TYPES}")
