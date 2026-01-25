"""
Document Service - User document upload and management
Handles certificate/permit uploads with OCR processing
"""
import logging
import os
import uuid
import json
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pathlib import Path

from sqlalchemy.orm import Session
from fastapi import UploadFile

from config import get_settings
from models import UserDocument, DocumentType, Vessel
from services.ocr_service import get_ocr_service, OCRResult

logger = logging.getLogger(__name__)
settings = get_settings()


class DocumentService:
    """
    User document upload and management service

    Handles:
    - File upload and storage
    - OCR text extraction
    - Document validation
    - Expiry tracking
    - Document-requirement matching
    """

    ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
    ALLOWED_MIME_TYPES = {
        "application/pdf",
        "image/png",
        "image/jpeg",
    }

    def __init__(self, db: Session):
        self.db = db
        self.ocr_service = get_ocr_service()
        self.upload_dir = settings.documents_upload_dir
        os.makedirs(self.upload_dir, exist_ok=True)

    async def upload_document(
        self,
        customer_id: int,
        vessel_id: Optional[int],
        file: UploadFile,
        document_type: DocumentType,
        title: str,
        issue_date: Optional[datetime] = None,
        expiry_date: Optional[datetime] = None,
        document_number: Optional[str] = None,
        issuing_authority: Optional[str] = None,
    ) -> UserDocument:
        """
        Upload and process a document

        Args:
            customer_id: Customer ID
            vessel_id: Optional vessel ID
            file: Uploaded file
            document_type: Type of document
            title: Document title
            issue_date: Optional issue date
            expiry_date: Optional expiry date
            document_number: Optional document number
            issuing_authority: Optional issuing authority

        Returns:
            Created UserDocument record
        """
        # Validate file
        self._validate_file(file)

        # Generate unique filename
        file_ext = Path(file.filename).suffix.lower()
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(self.upload_dir, unique_filename)

        # Save file
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        # Run OCR
        ocr_result = await self.ocr_service.extract_text_from_bytes(
            content=content,
            mime_type=file.content_type,
            filename=file.filename
        )

        # Extract fields from OCR if not provided
        extracted_fields = ocr_result.extracted_fields

        if not document_number and "document_number" in extracted_fields:
            document_number = extracted_fields["document_number"]

        if not issue_date and "issue_date_parsed" in extracted_fields:
            try:
                issue_date = datetime.fromisoformat(extracted_fields["issue_date_parsed"])
            except:
                pass

        if not expiry_date and "expiry_date_parsed" in extracted_fields:
            try:
                expiry_date = datetime.fromisoformat(extracted_fields["expiry_date_parsed"])
            except:
                pass

        if not issuing_authority and "issuing_authority" in extracted_fields:
            issuing_authority = extracted_fields["issuing_authority"]

        # Create database record
        document = UserDocument(
            customer_id=customer_id,
            vessel_id=vessel_id,
            title=title,
            document_type=document_type,
            file_path=file_path,
            file_name=file.filename,
            file_size=len(content),
            mime_type=file.content_type,
            extracted_text=ocr_result.text,
            ocr_provider=ocr_result.provider,
            ocr_confidence=ocr_result.confidence,
            extracted_fields=json.dumps(extracted_fields),
            issuing_authority=issuing_authority,
            issue_date=issue_date,
            expiry_date=expiry_date,
            document_number=document_number,
            is_validated=False,
        )

        self.db.add(document)
        self.db.commit()
        self.db.refresh(document)

        logger.info(f"Document uploaded: {document.id} - {title}")

        return document

    def get_document(self, document_id: int) -> Optional[UserDocument]:
        """Get a document by ID"""
        return self.db.query(UserDocument).filter(UserDocument.id == document_id).first()

    def get_vessel_documents(
        self,
        vessel_id: int,
        document_type: Optional[DocumentType] = None
    ) -> List[UserDocument]:
        """Get all documents for a vessel"""
        query = self.db.query(UserDocument).filter(UserDocument.vessel_id == vessel_id)

        if document_type:
            query = query.filter(UserDocument.document_type == document_type)

        return query.order_by(UserDocument.created_at.desc()).all()

    def get_customer_documents(
        self,
        customer_id: int,
        document_type: Optional[DocumentType] = None
    ) -> List[UserDocument]:
        """Get all documents for a customer"""
        query = self.db.query(UserDocument).filter(UserDocument.customer_id == customer_id)

        if document_type:
            query = query.filter(UserDocument.document_type == document_type)

        return query.order_by(UserDocument.created_at.desc()).all()

    def check_document_expiry(
        self,
        vessel_id: int,
        warning_days: int = 30
    ) -> Dict[str, List[UserDocument]]:
        """
        Check for expired or expiring documents

        Args:
            vessel_id: Vessel ID
            warning_days: Days before expiry to warn

        Returns:
            Dict with 'expired', 'expiring_soon', and 'valid' lists
        """
        documents = self.get_vessel_documents(vessel_id)
        now = datetime.now()
        warning_threshold = now + timedelta(days=warning_days)

        result = {
            "expired": [],
            "expiring_soon": [],
            "valid": [],
            "no_expiry": [],
        }

        for doc in documents:
            if not doc.expiry_date:
                result["no_expiry"].append(doc)
            elif doc.expiry_date < now:
                result["expired"].append(doc)
            elif doc.expiry_date < warning_threshold:
                result["expiring_soon"].append(doc)
            else:
                result["valid"].append(doc)

        return result

    def delete_document(self, document_id: int) -> bool:
        """Delete a document"""
        document = self.get_document(document_id)
        if not document:
            return False

        # Delete file
        if os.path.exists(document.file_path):
            try:
                os.remove(document.file_path)
            except Exception as e:
                logger.error(f"Failed to delete file {document.file_path}: {e}")

        # Delete database record
        self.db.delete(document)
        self.db.commit()

        logger.info(f"Document deleted: {document_id}")
        return True

    def validate_document(
        self,
        document_id: int,
        is_valid: bool,
        notes: Optional[str] = None
    ) -> Optional[UserDocument]:
        """Validate or invalidate a document"""
        document = self.get_document(document_id)
        if not document:
            return None

        document.is_validated = is_valid
        document.validation_notes = notes
        document.updated_at = datetime.now()

        self.db.commit()
        self.db.refresh(document)

        return document

    def match_document_to_requirement(
        self,
        document: UserDocument,
        required_doc_type: DocumentType,
        check_expiry: bool = True
    ) -> Dict[str, Any]:
        """
        Check if a document satisfies a requirement

        Returns:
            Dict with 'matches', 'reason', 'is_expired', 'days_until_expiry'
        """
        result = {
            "matches": False,
            "reason": "",
            "is_expired": False,
            "days_until_expiry": None,
        }

        # Check document type match
        if document.document_type != required_doc_type:
            result["reason"] = f"Document type mismatch: {document.document_type.value} != {required_doc_type.value}"
            return result

        # Check expiry if required
        if check_expiry and document.expiry_date:
            now = datetime.now()
            if document.expiry_date < now:
                result["is_expired"] = True
                result["reason"] = f"Document expired on {document.expiry_date.strftime('%Y-%m-%d')}"
                return result

            result["days_until_expiry"] = (document.expiry_date - now).days

        result["matches"] = True
        result["reason"] = "Document matches requirement"

        return result

    def find_matching_documents(
        self,
        vessel_id: int,
        required_doc_types: List[DocumentType],
        check_expiry: bool = True
    ) -> Dict[str, Dict[str, Any]]:
        """
        Find documents matching a list of requirements

        Args:
            vessel_id: Vessel ID
            required_doc_types: List of required document types
            check_expiry: Whether to check document expiry

        Returns:
            Dict mapping document_type to match result
        """
        documents = self.get_vessel_documents(vessel_id)

        results = {}
        for req_type in required_doc_types:
            results[req_type.value] = {
                "required": True,
                "found": False,
                "document": None,
                "is_expired": False,
                "days_until_expiry": None,
            }

            # Find best matching document
            for doc in documents:
                match = self.match_document_to_requirement(doc, req_type, check_expiry)
                if match["matches"]:
                    results[req_type.value].update({
                        "found": True,
                        "document": {
                            "id": doc.id,
                            "title": doc.title,
                            "document_number": doc.document_number,
                            "expiry_date": doc.expiry_date.isoformat() if doc.expiry_date else None,
                        },
                        "is_expired": match["is_expired"],
                        "days_until_expiry": match["days_until_expiry"],
                    })
                    break
                elif match["is_expired"] and not results[req_type.value]["found"]:
                    # Track expired document as potential match
                    results[req_type.value].update({
                        "found": True,
                        "document": {
                            "id": doc.id,
                            "title": doc.title,
                            "document_number": doc.document_number,
                            "expiry_date": doc.expiry_date.isoformat() if doc.expiry_date else None,
                        },
                        "is_expired": True,
                        "days_until_expiry": None,
                    })

        return results

    def _validate_file(self, file: UploadFile) -> None:
        """Validate uploaded file"""
        # Check filename
        if not file.filename:
            raise ValueError("Filename is required")

        # Check extension
        ext = Path(file.filename).suffix.lower()
        if ext not in self.ALLOWED_EXTENSIONS:
            raise ValueError(f"File extension {ext} not allowed. Allowed: {self.ALLOWED_EXTENSIONS}")

        # Check MIME type
        if file.content_type not in self.ALLOWED_MIME_TYPES:
            raise ValueError(f"MIME type {file.content_type} not allowed. Allowed: {self.ALLOWED_MIME_TYPES}")

    def get_document_summary(self, vessel_id: int) -> Dict[str, Any]:
        """Get summary of documents for a vessel"""
        documents = self.get_vessel_documents(vessel_id)
        expiry_check = self.check_document_expiry(vessel_id)

        # Count by type
        type_counts = {}
        for doc in documents:
            doc_type = doc.document_type.value
            type_counts[doc_type] = type_counts.get(doc_type, 0) + 1

        return {
            "total_documents": len(documents),
            "by_type": type_counts,
            "expired_count": len(expiry_check["expired"]),
            "expiring_soon_count": len(expiry_check["expiring_soon"]),
            "valid_count": len(expiry_check["valid"]),
            "no_expiry_count": len(expiry_check["no_expiry"]),
        }
