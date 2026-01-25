"""
Maritime Compliance API Routes
Endpoints for vessel management, document upload, and compliance checking
"""
import logging
import json
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models import (
    Vessel, UserDocument, Port, ComplianceCheck,
    VesselType, DocumentType, ComplianceStatus
)
from services.document_service import DocumentService
from services.compliance_service import ComplianceService, RouteComplianceResult
from services.maritime_knowledge_base import get_maritime_knowledge_base
from core.crew_maritime_compliance import get_compliance_orchestrator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/maritime", tags=["Maritime Compliance"])


# ========== Request/Response Models ==========

class VesselCreate(BaseModel):
    """Request model for creating a vessel"""
    name: str = Field(..., min_length=1, max_length=200)
    imo_number: str = Field(..., pattern=r"^\d{7}$", description="7-digit IMO number")
    vessel_type: VesselType
    flag_state: str = Field(..., min_length=2, max_length=100)
    gross_tonnage: float = Field(..., gt=0)
    mmsi: Optional[str] = None
    call_sign: Optional[str] = None
    dwt: Optional[float] = None
    year_built: Optional[int] = None
    classification_society: Optional[str] = None


class VesselResponse(BaseModel):
    """Response model for vessel"""
    id: int
    name: str
    imo_number: str
    vessel_type: str
    flag_state: str
    gross_tonnage: float
    mmsi: Optional[str]
    call_sign: Optional[str]
    dwt: Optional[float]
    year_built: Optional[int]
    classification_society: Optional[str]
    document_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentResponse(BaseModel):
    """Response model for document"""
    id: int
    title: str
    document_type: str
    file_name: Optional[str]
    file_size: Optional[int]
    ocr_confidence: Optional[float]
    issuing_authority: Optional[str]
    issue_date: Optional[datetime]
    expiry_date: Optional[datetime]
    document_number: Optional[str]
    is_validated: bool
    created_at: datetime

    class Config:
        from_attributes = True


class RouteComplianceRequest(BaseModel):
    """Request model for route compliance check"""
    vessel_id: int
    port_codes: List[str] = Field(..., min_length=1, description="List of UN/LOCODE port codes")
    route_name: Optional[str] = None
    use_crewai: bool = Field(default=False, description="Use CrewAI for comprehensive analysis")


class PortComplianceResponse(BaseModel):
    """Response model for port compliance"""
    port_code: str
    port_name: str
    status: str
    required_documents: List[dict]
    missing_documents: List[dict]
    expired_documents: List[dict]
    special_requirements: List[str]
    risk_factors: List[str]


class RouteComplianceResponse(BaseModel):
    """Response model for route compliance"""
    check_id: Optional[int] = None
    vessel_id: int
    route_name: str
    route_ports: List[str]
    overall_status: str
    compliance_score: float
    port_results: List[PortComplianceResponse]
    missing_documents: List[dict]
    recommendations: List[str]
    risk_level: str
    summary_report: str
    detailed_report: Optional[str] = None


class KBSearchRequest(BaseModel):
    """Request model for knowledge base search"""
    query: str = Field(..., min_length=3)
    filters: Optional[dict] = None
    top_k: int = Field(default=5, ge=1, le=20)
    collections: Optional[List[str]] = None


class KBSearchResponse(BaseModel):
    """Response model for knowledge base search"""
    results: List[dict]
    query: str
    total_found: int


# ========== Vessel Management Endpoints ==========

@router.post("/vessels", response_model=VesselResponse, status_code=201)
async def create_vessel(
    vessel: VesselCreate,
    customer_id: int = Query(..., description="Customer ID"),
    db: Session = Depends(get_db)
):
    """Register a new vessel"""
    # Check for duplicate IMO number
    existing = db.query(Vessel).filter(Vessel.imo_number == vessel.imo_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Vessel with this IMO number already exists")

    new_vessel = Vessel(
        customer_id=customer_id,
        name=vessel.name,
        imo_number=vessel.imo_number,
        vessel_type=vessel.vessel_type,
        flag_state=vessel.flag_state,
        gross_tonnage=vessel.gross_tonnage,
        mmsi=vessel.mmsi,
        call_sign=vessel.call_sign,
        dwt=vessel.dwt,
        year_built=vessel.year_built,
        classification_society=vessel.classification_society,
    )

    db.add(new_vessel)
    db.commit()
    db.refresh(new_vessel)

    return VesselResponse(
        id=new_vessel.id,
        name=new_vessel.name,
        imo_number=new_vessel.imo_number,
        vessel_type=new_vessel.vessel_type.value if new_vessel.vessel_type else None,
        flag_state=new_vessel.flag_state,
        gross_tonnage=new_vessel.gross_tonnage,
        mmsi=new_vessel.mmsi,
        call_sign=new_vessel.call_sign,
        dwt=new_vessel.dwt,
        year_built=new_vessel.year_built,
        classification_society=new_vessel.classification_society,
        document_count=0,
        created_at=new_vessel.created_at,
    )


@router.get("/vessels", response_model=List[VesselResponse])
async def list_vessels(
    customer_id: int = Query(..., description="Customer ID"),
    db: Session = Depends(get_db)
):
    """List all vessels for a customer"""
    vessels = db.query(Vessel).filter(Vessel.customer_id == customer_id).all()

    results = []
    for v in vessels:
        doc_count = db.query(UserDocument).filter(UserDocument.vessel_id == v.id).count()
        results.append(VesselResponse(
            id=v.id,
            name=v.name,
            imo_number=v.imo_number,
            vessel_type=v.vessel_type.value if v.vessel_type else None,
            flag_state=v.flag_state,
            gross_tonnage=v.gross_tonnage,
            mmsi=v.mmsi,
            call_sign=v.call_sign,
            dwt=v.dwt,
            year_built=v.year_built,
            classification_society=v.classification_society,
            document_count=doc_count,
            created_at=v.created_at,
        ))

    return results


@router.get("/vessels/{vessel_id}", response_model=VesselResponse)
async def get_vessel(vessel_id: int, db: Session = Depends(get_db)):
    """Get vessel details"""
    vessel = db.query(Vessel).filter(Vessel.id == vessel_id).first()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")

    doc_count = db.query(UserDocument).filter(UserDocument.vessel_id == vessel_id).count()

    return VesselResponse(
        id=vessel.id,
        name=vessel.name,
        imo_number=vessel.imo_number,
        vessel_type=vessel.vessel_type.value if vessel.vessel_type else None,
        flag_state=vessel.flag_state,
        gross_tonnage=vessel.gross_tonnage,
        mmsi=vessel.mmsi,
        call_sign=vessel.call_sign,
        dwt=vessel.dwt,
        year_built=vessel.year_built,
        classification_society=vessel.classification_society,
        document_count=doc_count,
        created_at=vessel.created_at,
    )


# ========== Document Upload Endpoints ==========

@router.post("/documents/upload", response_model=DocumentResponse)
async def upload_document(
    customer_id: int = Form(...),
    vessel_id: int = Form(...),
    document_type: DocumentType = Form(...),
    title: str = Form(...),
    issue_date: Optional[str] = Form(None),
    expiry_date: Optional[str] = Form(None),
    document_number: Optional[str] = Form(None),
    issuing_authority: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload a document (certificate, permit) with OCR processing.
    Supported formats: PDF, PNG, JPG
    """
    # Validate vessel exists
    vessel = db.query(Vessel).filter(Vessel.id == vessel_id).first()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")

    # Parse dates
    parsed_issue_date = None
    parsed_expiry_date = None

    if issue_date:
        try:
            parsed_issue_date = datetime.fromisoformat(issue_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid issue_date format. Use ISO format.")

    if expiry_date:
        try:
            parsed_expiry_date = datetime.fromisoformat(expiry_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid expiry_date format. Use ISO format.")

    # Upload document
    doc_service = DocumentService(db)

    try:
        document = await doc_service.upload_document(
            customer_id=customer_id,
            vessel_id=vessel_id,
            file=file,
            document_type=document_type,
            title=title,
            issue_date=parsed_issue_date,
            expiry_date=parsed_expiry_date,
            document_number=document_number,
            issuing_authority=issuing_authority,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return DocumentResponse(
        id=document.id,
        title=document.title,
        document_type=document.document_type.value,
        file_name=document.file_name,
        file_size=document.file_size,
        ocr_confidence=document.ocr_confidence,
        issuing_authority=document.issuing_authority,
        issue_date=document.issue_date,
        expiry_date=document.expiry_date,
        document_number=document.document_number,
        is_validated=document.is_validated,
        created_at=document.created_at,
    )


@router.get("/documents/vessel/{vessel_id}", response_model=List[DocumentResponse])
async def get_vessel_documents(
    vessel_id: int,
    document_type: Optional[DocumentType] = None,
    db: Session = Depends(get_db)
):
    """Get all documents for a vessel"""
    doc_service = DocumentService(db)
    documents = doc_service.get_vessel_documents(vessel_id, document_type)

    return [
        DocumentResponse(
            id=d.id,
            title=d.title,
            document_type=d.document_type.value,
            file_name=d.file_name,
            file_size=d.file_size,
            ocr_confidence=d.ocr_confidence,
            issuing_authority=d.issuing_authority,
            issue_date=d.issue_date,
            expiry_date=d.expiry_date,
            document_number=d.document_number,
            is_validated=d.is_validated,
            created_at=d.created_at,
        )
        for d in documents
    ]


@router.get("/documents/{document_id}")
async def get_document(document_id: int, db: Session = Depends(get_db)):
    """Get document details including extracted text"""
    doc_service = DocumentService(db)
    document = doc_service.get_document(document_id)

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "id": document.id,
        "title": document.title,
        "document_type": document.document_type.value,
        "file_name": document.file_name,
        "file_size": document.file_size,
        "mime_type": document.mime_type,
        "ocr_confidence": document.ocr_confidence,
        "extracted_text": document.extracted_text,
        "extracted_fields": json.loads(document.extracted_fields) if document.extracted_fields else {},
        "issuing_authority": document.issuing_authority,
        "issue_date": document.issue_date.isoformat() if document.issue_date else None,
        "expiry_date": document.expiry_date.isoformat() if document.expiry_date else None,
        "document_number": document.document_number,
        "is_validated": document.is_validated,
        "validation_notes": document.validation_notes,
        "created_at": document.created_at.isoformat(),
    }


@router.delete("/documents/{document_id}")
async def delete_document(document_id: int, db: Session = Depends(get_db)):
    """Delete a document"""
    doc_service = DocumentService(db)
    success = doc_service.delete_document(document_id)

    if not success:
        raise HTTPException(status_code=404, detail="Document not found")

    return {"status": "deleted", "document_id": document_id}


# ========== Compliance Checking Endpoints ==========

@router.post("/compliance/check-route", response_model=RouteComplianceResponse)
async def check_route_compliance(
    request: RouteComplianceRequest,
    customer_id: int = Query(..., description="Customer ID"),
    db: Session = Depends(get_db)
):
    """
    Check route compliance against maritime regulations.
    Returns both structured JSON and natural language report.
    Optionally uses CrewAI agents for comprehensive analysis.
    """
    # Validate vessel exists
    vessel = db.query(Vessel).filter(Vessel.id == request.vessel_id).first()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")

    compliance_service = ComplianceService(db)

    if request.use_crewai:
        # Use CrewAI for comprehensive analysis
        orchestrator = get_compliance_orchestrator()

        if not orchestrator.is_available:
            raise HTTPException(
                status_code=503,
                detail="CrewAI not available. Set use_crewai=false for basic compliance check."
            )

        # Prepare vessel info and documents
        vessel_info = {
            "name": vessel.name,
            "imo_number": vessel.imo_number,
            "vessel_type": vessel.vessel_type.value if vessel.vessel_type else "container",
            "flag_state": vessel.flag_state,
            "gross_tonnage": vessel.gross_tonnage,
        }

        doc_service = DocumentService(db)
        user_docs = doc_service.get_vessel_documents(request.vessel_id)
        user_docs_list = [
            {
                "document_type": d.document_type.value,
                "expiry_date": d.expiry_date.isoformat() if d.expiry_date else None,
                "is_expired": d.expiry_date < datetime.now() if d.expiry_date else False,
            }
            for d in user_docs
        ]

        # Run CrewAI compliance check
        crew_result = await orchestrator.check_compliance(
            vessel_info=vessel_info,
            route_ports=request.port_codes,
            user_documents=user_docs_list
        )

        if crew_result.get("error"):
            logger.error(f"CrewAI error: {crew_result['error']}")
            # Fall back to basic compliance check
            result = compliance_service.check_route_compliance(
                vessel_id=request.vessel_id,
                port_codes=request.port_codes,
                route_name=request.route_name
            )
        else:
            # Parse CrewAI result and combine with basic check
            result = compliance_service.check_route_compliance(
                vessel_id=request.vessel_id,
                port_codes=request.port_codes,
                route_name=request.route_name
            )
            # Append CrewAI insights to report
            if crew_result.get("crew_output"):
                result.detailed_report += f"\n\n=== CrewAI Analysis ===\n{crew_result['crew_output']}"

    else:
        # Basic compliance check
        result = compliance_service.check_route_compliance(
            vessel_id=request.vessel_id,
            port_codes=request.port_codes,
            route_name=request.route_name
        )

    # Save to database
    saved_check = compliance_service.save_compliance_check(
        customer_id=customer_id,
        result=result
    )

    return RouteComplianceResponse(
        check_id=saved_check.id,
        vessel_id=result.vessel_id,
        route_name=result.route_name,
        route_ports=result.route_ports,
        overall_status=result.overall_status.value,
        compliance_score=result.compliance_score,
        port_results=[
            PortComplianceResponse(
                port_code=p.port_code,
                port_name=p.port_name,
                status=p.status.value,
                required_documents=p.required_documents,
                missing_documents=p.missing_documents,
                expired_documents=p.expired_documents,
                special_requirements=p.special_requirements,
                risk_factors=p.risk_factors,
            )
            for p in result.port_results
        ],
        missing_documents=result.all_missing_documents,
        recommendations=result.recommendations,
        risk_level=result.risk_level,
        summary_report=result.summary_report,
        detailed_report=result.detailed_report,
    )


@router.post("/compliance/check-port")
async def check_port_compliance(
    vessel_id: int = Query(...),
    port_code: str = Query(..., min_length=2),
    db: Session = Depends(get_db)
):
    """Quick compliance check for a single port"""
    vessel = db.query(Vessel).filter(Vessel.id == vessel_id).first()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")

    compliance_service = ComplianceService(db)
    result = compliance_service.check_port_compliance(vessel_id, port_code)

    return result.to_dict()


@router.get("/compliance/history/{vessel_id}")
async def get_compliance_history(
    vessel_id: int,
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Get compliance check history for a vessel"""
    compliance_service = ComplianceService(db)
    checks = compliance_service.get_compliance_history(vessel_id, limit)

    return [
        {
            "id": c.id,
            "route_name": c.route_name,
            "route_ports": json.loads(c.route_ports) if c.route_ports else [],
            "overall_status": c.overall_status.value if c.overall_status else None,
            "compliance_score": c.compliance_score,
            "created_at": c.created_at.isoformat(),
        }
        for c in checks
    ]


# ========== Knowledge Base Endpoints ==========

@router.post("/kb/search", response_model=KBSearchResponse)
async def search_knowledge_base(request: KBSearchRequest):
    """
    Search maritime regulations knowledge base.

    Filters can include:
    - port: UN/LOCODE
    - region: Asia, Europe, Americas, etc.
    - regulation_type: imo_convention, port_state_control, etc.
    - vessel_type: container, tanker, etc.
    """
    kb = get_maritime_knowledge_base()

    results = kb.search_general(
        query=request.query,
        filters=request.filters,
        top_k=request.top_k,
        collections=request.collections
    )

    return KBSearchResponse(
        results=[
            {
                "content": r.content,
                "metadata": r.metadata,
                "score": r.score,
                "source": r.source,
            }
            for r in results
        ],
        query=request.query,
        total_found=len(results),
    )


@router.get("/kb/port/{port_code}/requirements")
async def get_port_requirements(
    port_code: str,
    vessel_type: Optional[str] = None
):
    """Get all requirements for a specific port"""
    kb = get_maritime_knowledge_base()

    required_docs = kb.search_required_documents(
        port_code=port_code,
        vessel_type=vessel_type or "container"
    )

    port_regulations = kb.search_by_port(
        port_code=port_code,
        vessel_type=vessel_type,
        top_k=10
    )

    return {
        "port_code": port_code,
        "required_documents": required_docs,
        "regulations": [
            {
                "content": r.content,
                "source": r.source,
                "metadata": r.metadata,
            }
            for r in port_regulations
        ],
    }


@router.get("/kb/document-types")
async def list_document_types():
    """List all document types with descriptions"""
    descriptions = {
        DocumentType.SAFETY_CERTIFICATE: "SOLAS Safety Certificates (Passenger/Cargo Ship Safety)",
        DocumentType.LOAD_LINE_CERTIFICATE: "International Load Line Certificate",
        DocumentType.MARPOL_CERTIFICATE: "MARPOL compliance certificates (IOPP, ISPP, etc.)",
        DocumentType.CREW_CERTIFICATE: "STCW certificates of competency for crew",
        DocumentType.ISM_CERTIFICATE: "ISM Code Safety Management Certificate (SMC)",
        DocumentType.ISPS_CERTIFICATE: "ISPS Code International Ship Security Certificate",
        DocumentType.CLASS_CERTIFICATE: "Classification society certificate",
        DocumentType.INSURANCE_CERTIFICATE: "P&I and Hull insurance certificates",
        DocumentType.CUSTOMS_DECLARATION: "Customs declaration documents",
        DocumentType.HEALTH_CERTIFICATE: "Maritime health certificate",
        DocumentType.TONNAGE_CERTIFICATE: "International Tonnage Certificate",
        DocumentType.REGISTRY_CERTIFICATE: "Certificate of Registry",
        DocumentType.CREW_LIST: "Crew list document",
        DocumentType.CARGO_MANIFEST: "Cargo manifest",
        DocumentType.BALLAST_WATER_CERTIFICATE: "BWM Convention certificate",
        DocumentType.OTHER: "Other document types",
    }

    return {
        "document_types": [
            {
                "code": dt.value,
                "name": dt.name.replace("_", " ").title(),
                "description": descriptions.get(dt, ""),
            }
            for dt in DocumentType
        ]
    }


@router.get("/kb/stats")
async def get_knowledge_base_stats():
    """Get knowledge base statistics"""
    kb = get_maritime_knowledge_base()
    stats = kb.get_collection_stats()

    return {
        "collections": stats,
        "total_documents": sum(stats.values()),
        "mock_mode": kb.mock_mode,
    }


# ========== Port Data Endpoints ==========

@router.get("/ports")
async def list_ports(
    region: Optional[str] = None,
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """List all ports with optional region filter"""
    query = db.query(Port)

    if region:
        query = query.filter(Port.region == region)

    ports = query.limit(limit).all()

    return [
        {
            "id": p.id,
            "name": p.name,
            "un_locode": p.un_locode,
            "country": p.country,
            "region": p.region,
            "latitude": p.latitude,
            "longitude": p.longitude,
            "psc_regime": p.psc_regime.value if p.psc_regime else None,
            "is_eca": p.is_eca,
        }
        for p in ports
    ]


@router.get("/ports/{port_code}")
async def get_port(port_code: str, db: Session = Depends(get_db)):
    """Get port details"""
    port = db.query(Port).filter(Port.un_locode == port_code).first()

    if not port:
        raise HTTPException(status_code=404, detail="Port not found")

    return {
        "id": port.id,
        "name": port.name,
        "un_locode": port.un_locode,
        "country": port.country,
        "country_code": port.country_code,
        "region": port.region,
        "latitude": port.latitude,
        "longitude": port.longitude,
        "psc_regime": port.psc_regime.value if port.psc_regime else None,
        "is_eca": port.is_eca,
        "has_shore_power": port.has_shore_power,
        "max_draft": port.max_draft,
    }


# ========== Health Check ==========

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    kb = get_maritime_knowledge_base()
    orchestrator = get_compliance_orchestrator()

    return {
        "status": "healthy",
        "knowledge_base": {
            "collections": list(kb.COLLECTIONS.keys()),
            "mock_mode": kb.mock_mode,
        },
        "crewai_available": orchestrator.is_available,
        "timestamp": datetime.now().isoformat(),
    }
