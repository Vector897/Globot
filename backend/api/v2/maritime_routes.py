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
    Vessel, Port, VesselType, DocumentType, VesselRoute, Customer
)
from services.document_service import DocumentService
from services.compliance_service import ComplianceService
from services.maritime_knowledge_base import get_maritime_knowledge_base
from services.compliance_report_generator import get_compliance_report_generator
from core.crew_maritime_compliance import get_compliance_orchestrator
from core.crew_document_agents import get_document_analysis_orchestrator
from core.crew_missing_docs_workflow import get_missing_docs_orchestrator
from models.compliance_report import (
    ComplianceReport,
    ComplianceStatus,
    Priority,
    RiskLevel,
    QuickComplianceCheck,
    RegulationQueryResponse,
    PortQueryResponse,
    ActionItem,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v2/maritime", tags=["Maritime Compliance"])


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
    id: str
    title: str
    document_type: str
    file_name: Optional[str]
    file_size: Optional[int]
    ocr_confidence: Optional[float]
    issuing_authority: Optional[str]
    issue_date: Optional[str]
    expiry_date: Optional[str]
    document_number: Optional[str]
    is_validated: bool
    created_at: str


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


class DocumentAnalysisRequest(BaseModel):
    """Request model for document analysis with CrewAI agents"""
    vessel_id: int
    port_codes: List[str] = Field(..., min_length=1, description="List of UN/LOCODE port codes")
    document_ids: Optional[List[str]] = Field(None, description="Specific document IDs to analyze (default: all vessel docs)")


class DocumentSummary(BaseModel):
    """Summary of a document"""
    document_type: str
    title: Optional[str] = None
    expiry_date: Optional[str] = None
    status: str  # valid, expired, expiring_soon
    days_until_expiry: Optional[int] = None
    category: str = "vessel"  # vessel or cargo


class MissingDocument(BaseModel):
    """Missing document info"""
    document_type: str
    required_by: List[str]  # Regulations or ports requiring it
    priority: str  # CRITICAL, HIGH, MEDIUM
    category: str = "vessel"  # vessel or cargo


# Document categorization - vessel (ship owner/operator) vs cargo documents
VESSEL_DOCUMENTS = {
    "safety_management_certificate", "smc", "ism", "ism_code",
    "safety_construction_certificate", "solas",
    "safety_equipment_certificate",
    "safety_radio_certificate",
    "load_line_certificate", "international_load_line",
    "tonnage_certificate", "international_tonnage", "itc",
    "iopp_certificate", "oil_pollution_prevention", "marpol_annex_i",
    "ispp_certificate", "sewage_pollution_prevention", "marpol_annex_iv",
    "iapp_certificate", "air_pollution_prevention", "marpol_annex_vi",
    "civil_liability_certificate", "clc", "bunker_convention",
    "isps_certificate", "international_ship_security",
    "mlc_certificate", "maritime_labour_convention", "dmlc",
    "continuous_synopsis_record", "csr",
    "registry_certificate", "certificate_of_registry",
    "minimum_safe_manning", "safe_manning", "msm",
    "stcw_certificate", "seafarer_certificate",
    "class_certificate", "classification_certificate",
    "insurance_certificate", "p_and_i", "hull_insurance",
}

CARGO_DOCUMENTS = {
    "bill_of_lading", "bol", "b_l",
    "cargo_manifest", "manifest",
    "dangerous_goods_declaration", "dg_declaration", "imdg",
    "commercial_invoice", "invoice",
    "packing_list",
    "certificate_of_origin", "coo",
    "customs_declaration", "customs_entry",
    "isf", "importer_security_filing",
    "cbp", "us_customs",
    "ata_carnet", "carnet",
    "phytosanitary_certificate",
    "fumigation_certificate",
    "health_certificate",
    "weight_certificate",
    "inspection_certificate",
}


def categorize_document(doc_type: str) -> str:
    """Categorize a document as 'vessel' or 'cargo' based on its type."""
    doc_type_lower = doc_type.lower().replace(" ", "_").replace("-", "_")
    
    # Check against cargo documents first (smaller set)
    for cargo_doc in CARGO_DOCUMENTS:
        if cargo_doc in doc_type_lower or doc_type_lower in cargo_doc:
            return "cargo"
    
    # Check against vessel documents
    for vessel_doc in VESSEL_DOCUMENTS:
        if vessel_doc in doc_type_lower or doc_type_lower in vessel_doc:
            return "vessel"
    
    # Default to vessel for unknown document types (most maritime docs are vessel-related)
    return "vessel"


class Recommendation(BaseModel):
    """Recommendation from analysis"""
    priority: str  # CRITICAL, HIGH, MEDIUM
    action: str
    documents: List[str]
    deadline: Optional[str] = None


class DocumentAnalysisResponse(BaseModel):
    """Response model for document analysis"""
    success: bool
    overall_status: str  # COMPLIANT, PARTIAL, NON_COMPLIANT, ERROR
    compliance_score: int = Field(ge=0, le=100)
    documents_analyzed: int
    valid_documents: List[DocumentSummary]
    expiring_soon_documents: List[DocumentSummary]
    expired_documents: List[DocumentSummary]
    missing_documents: List[MissingDocument]
    recommendations: List[Recommendation]
    agent_reasoning: Optional[str] = None
    vessel_info: dict
    route_ports: List[str]


# ========== Route Management Models ==========

class VesselRouteCreate(BaseModel):
    """Request model for creating a vessel route"""
    route_name: str = Field(..., min_length=1, max_length=300)
    port_codes: List[str] = Field(..., min_length=1, description="List of UN/LOCODE port codes in route order")
    departure_date: Optional[str] = Field(None, description="ISO date format")
    set_active: bool = Field(default=True, description="Set as the active route for this vessel")


class VesselRouteResponse(BaseModel):
    """Response model for vessel route"""
    id: int
    vessel_id: int
    route_name: str
    port_codes: List[str]
    origin_port: Optional[str]
    destination_port: Optional[str]
    departure_date: Optional[datetime]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class MissingDocsRequest(BaseModel):
    """Request model for missing documents detection"""
    vessel_id: Optional[int] = Field(None, description="Vessel ID. Optional if port_codes and customer_id are provided.")
    route_id: Optional[int] = Field(None, description="Specific route ID. If omitted, uses active route.")
    port_codes: Optional[List[str]] = Field(None, description="Port codes for the route. Use instead of route_id for vesselless analysis.")
    customer_id: Optional[int] = Field(None, description="Customer ID to fetch documents. Required if vessel_id not provided.")


class MissingDocsResponse(BaseModel):
    """Response model for missing documents detection"""
    success: bool
    overall_status: str  # COMPLIANT, PARTIAL, NON_COMPLIANT, ERROR
    compliance_score: int = Field(ge=0, le=100)
    vessel_info: dict
    route_ports: List[str]
    route_name: str
    # All documents (for backwards compatibility)
    missing_documents: List[MissingDocument]
    expired_documents: List[DocumentSummary]
    expiring_soon_documents: List[DocumentSummary]
    valid_documents: List[DocumentSummary]
    # Categorized documents (vessel = ship owner/operator, cargo = cargo-related)
    vessel_missing_documents: List[MissingDocument] = []
    cargo_missing_documents: List[MissingDocument] = []
    vessel_valid_documents: List[DocumentSummary] = []
    cargo_valid_documents: List[DocumentSummary] = []
    recommendations: List[Recommendation]
    agent_reasoning: Optional[str] = None
    total_documents_on_file: int


# ========== User Provisioning ==========

class ProvisionRequest(BaseModel):
    """Request model for auto-provisioning a user"""
    clerk_id: str = Field(..., min_length=1)
    email: str = Field(..., min_length=3)
    name: Optional[str] = None


class ProvisionResponse(BaseModel):
    """Response model for provisioning result"""
    customer_id: int
    vessel_id: Optional[int] = None
    vessel_name: Optional[str] = None
    is_new: bool  # Whether a new customer was created


@router.post("/me/provision")
async def provision_user(
    req: ProvisionRequest,
    db: Session = Depends(get_db)
):
    """
    Auto-provision a Customer (and optionally a default Vessel) for the
    currently authenticated Clerk user.  If the customer already exists
    (by clerk_id or email), return the existing record.
    """
    # 1. Try to find by clerk_id first
    customer = db.query(Customer).filter(Customer.clerk_id == req.clerk_id).first()
    is_new = False

    if not customer:
        # 2. Try to find by email (may exist from before clerk_id was added)
        customer = db.query(Customer).filter(Customer.email == req.email).first()
        if customer:
            # Backfill clerk_id
            customer.clerk_id = req.clerk_id
            db.commit()
        else:
            # 3. Create new customer
            customer = Customer(
                clerk_id=req.clerk_id,
                name=req.name or req.email.split("@")[0],
                email=req.email,
            )
            db.add(customer)
            db.commit()
            db.refresh(customer)
            is_new = True

    # Check if customer has at least one vessel
    vessel = db.query(Vessel).filter(Vessel.customer_id == customer.id).first()
    
    # If no vessel exists, create a default one
    if not vessel:
        import random
        default_imo = f"{9000000 + random.randint(0, 999999):07d}"
        vessel = Vessel(
            customer_id=customer.id,
            name=f"{customer.name}'s Vessel",
            imo_number=default_imo,
            vessel_type=VesselType.CONTAINER,
            flag_state="LIBERIA",
            gross_tonnage=50000.0,
            mmsi=None,
            call_sign=None,
            dwt=None,
            year_built=2020,
            classification_society="Lloyd's Register",
        )
        db.add(vessel)
        db.commit()
        db.refresh(vessel)

    return ProvisionResponse(
        customer_id=customer.id,
        vessel_id=vessel.id if vessel else None,
        vessel_name=vessel.name if vessel else None,
        is_new=is_new,
    )


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
    doc_service = DocumentService()

    results = []
    for v in vessels:
        doc_count = len(doc_service.get_vessel_documents(v.id))
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

    doc_service = DocumentService()
    doc_count = len(doc_service.get_vessel_documents(vessel_id))

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


# ========== Vessel Route Management Endpoints ==========

@router.post("/vessels/{vessel_id}/routes", response_model=VesselRouteResponse, status_code=201)
async def create_vessel_route(
    vessel_id: int,
    route: VesselRouteCreate,
    db: Session = Depends(get_db)
):
    """Create a new route for a vessel"""
    vessel = db.query(Vessel).filter(Vessel.id == vessel_id).first()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")

    # Parse departure date
    parsed_departure = None
    if route.departure_date:
        try:
            parsed_departure = datetime.fromisoformat(route.departure_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid departure_date format. Use ISO format.")

    port_codes = [p.strip().upper() for p in route.port_codes if p.strip()]

    # If set_active, deactivate existing active routes for this vessel
    if route.set_active:
        db.query(VesselRoute).filter(
            VesselRoute.vessel_id == vessel_id,
            VesselRoute.is_active == True
        ).update({"is_active": False})

    new_route = VesselRoute(
        vessel_id=vessel_id,
        route_name=route.route_name,
        port_codes=json.dumps(port_codes),
        origin_port=port_codes[0] if port_codes else None,
        destination_port=port_codes[-1] if port_codes else None,
        departure_date=parsed_departure,
        is_active=route.set_active,
    )

    db.add(new_route)
    db.commit()
    db.refresh(new_route)

    return VesselRouteResponse(
        id=new_route.id,
        vessel_id=new_route.vessel_id,
        route_name=new_route.route_name,
        port_codes=port_codes,
        origin_port=new_route.origin_port,
        destination_port=new_route.destination_port,
        departure_date=new_route.departure_date,
        is_active=new_route.is_active,
        created_at=new_route.created_at,
    )


@router.get("/vessels/{vessel_id}/routes", response_model=List[VesselRouteResponse])
async def list_vessel_routes(
    vessel_id: int,
    db: Session = Depends(get_db)
):
    """List all routes for a vessel"""
    vessel = db.query(Vessel).filter(Vessel.id == vessel_id).first()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")

    routes = db.query(VesselRoute).filter(VesselRoute.vessel_id == vessel_id).order_by(VesselRoute.created_at.desc()).all()

    return [
        VesselRouteResponse(
            id=r.id,
            vessel_id=r.vessel_id,
            route_name=r.route_name,
            port_codes=json.loads(r.port_codes) if r.port_codes else [],
            origin_port=r.origin_port,
            destination_port=r.destination_port,
            departure_date=r.departure_date,
            is_active=r.is_active,
            created_at=r.created_at,
        )
        for r in routes
    ]


@router.get("/vessels/{vessel_id}/routes/active", response_model=VesselRouteResponse)
async def get_active_route(
    vessel_id: int,
    db: Session = Depends(get_db)
):
    """Get the active route for a vessel"""
    route = db.query(VesselRoute).filter(
        VesselRoute.vessel_id == vessel_id,
        VesselRoute.is_active == True
    ).first()

    if not route:
        raise HTTPException(status_code=404, detail="No active route found for this vessel")

    return VesselRouteResponse(
        id=route.id,
        vessel_id=route.vessel_id,
        route_name=route.route_name,
        port_codes=json.loads(route.port_codes) if route.port_codes else [],
        origin_port=route.origin_port,
        destination_port=route.destination_port,
        departure_date=route.departure_date,
        is_active=route.is_active,
        created_at=route.created_at,
    )


@router.put("/vessels/{vessel_id}/routes/{route_id}/activate", response_model=VesselRouteResponse)
async def activate_vessel_route(
    vessel_id: int,
    route_id: int,
    db: Session = Depends(get_db)
):
    """Set a route as the active route for a vessel"""
    route = db.query(VesselRoute).filter(
        VesselRoute.id == route_id,
        VesselRoute.vessel_id == vessel_id
    ).first()

    if not route:
        raise HTTPException(status_code=404, detail="Route not found")

    # Deactivate all other routes for this vessel
    db.query(VesselRoute).filter(
        VesselRoute.vessel_id == vessel_id,
        VesselRoute.is_active == True
    ).update({"is_active": False})

    # Activate the selected route
    route.is_active = True
    db.commit()
    db.refresh(route)

    return VesselRouteResponse(
        id=route.id,
        vessel_id=route.vessel_id,
        route_name=route.route_name,
        port_codes=json.loads(route.port_codes) if route.port_codes else [],
        origin_port=route.origin_port,
        destination_port=route.destination_port,
        departure_date=route.departure_date,
        is_active=route.is_active,
        created_at=route.created_at,
    )


@router.delete("/vessels/{vessel_id}/routes/{route_id}")
async def delete_vessel_route(
    vessel_id: int,
    route_id: int,
    db: Session = Depends(get_db)
):
    """Delete a vessel route"""
    route = db.query(VesselRoute).filter(
        VesselRoute.id == route_id,
        VesselRoute.vessel_id == vessel_id
    ).first()

    if not route:
        raise HTTPException(status_code=404, detail="Route not found")

    db.delete(route)
    db.commit()

    return {"status": "deleted", "route_id": route_id}


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
        vessel = 1
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
    doc_service = DocumentService()

    try:
        document = await doc_service.upload_document(
            customer_id=customer_id,
            vessel_id=vessel_id,
            file=file,
            document_type=document_type.value,
            title=title,
            issue_date=parsed_issue_date,
            expiry_date=parsed_expiry_date,
            document_number=document_number,
            issuing_authority=issuing_authority,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return DocumentResponse(
        id=document["id"],
        title=document["title"],
        document_type=document["document_type"],
        file_name=document.get("file_name"),
        file_size=document.get("file_size"),
        ocr_confidence=document.get("ocr_confidence"),
        issuing_authority=document.get("issuing_authority"),
        issue_date=document.get("issue_date"),
        expiry_date=document.get("expiry_date"),
        document_number=document.get("document_number"),
        is_validated=document.get("is_validated", False),
        created_at=document.get("created_at", ""),
    )


@router.get("/documents/vessel/{vessel_id}", response_model=List[DocumentResponse])
async def get_vessel_documents(
    vessel_id: int,
    document_type: Optional[str] = None,
):
    """Get all documents for a vessel"""
    doc_service = DocumentService()
    documents = doc_service.get_vessel_documents(vessel_id, document_type)

    return [
        DocumentResponse(
            id=d["id"],
            title=d["title"],
            document_type=d["document_type"],
            file_name=d.get("file_name"),
            file_size=d.get("file_size"),
            ocr_confidence=d.get("ocr_confidence"),
            issuing_authority=d.get("issuing_authority"),
            issue_date=d.get("issue_date"),
            expiry_date=d.get("expiry_date"),
            document_number=d.get("document_number"),
            is_validated=d.get("is_validated", False),
            created_at=d.get("created_at", ""),
        )
        for d in documents
    ]


@router.get("/documents/customer/{customer_id}", response_model=List[DocumentResponse])
async def get_customer_documents(
    customer_id: int,
    document_type: Optional[str] = None,
):
    """Get all documents for a customer (user)"""
    doc_service = DocumentService()
    documents = doc_service.get_customer_documents(customer_id, document_type)

    return [
        DocumentResponse(
            id=d["id"],
            title=d["title"],
            document_type=d["document_type"],
            file_name=d.get("file_name"),
            file_size=d.get("file_size"),
            ocr_confidence=d.get("ocr_confidence"),
            issuing_authority=d.get("issuing_authority"),
            issue_date=d.get("issue_date"),
            expiry_date=d.get("expiry_date"),
            document_number=d.get("document_number"),
            is_validated=d.get("is_validated", False),
            created_at=d.get("created_at", ""),
        )
        for d in documents
    ]


@router.get("/documents/{document_id}")
async def get_document(document_id: str):
    """Get document details including extracted text"""
    doc_service = DocumentService()
    document = doc_service.get_document(document_id)

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Parse extracted_fields from JSON string
    extracted_fields = document.get("extracted_fields", "{}")
    if isinstance(extracted_fields, str):
        try:
            extracted_fields = json.loads(extracted_fields)
        except (json.JSONDecodeError, TypeError):
            extracted_fields = {}

    return {
        "id": document["id"],
        "title": document["title"],
        "document_type": document["document_type"],
        "file_name": document.get("file_name"),
        "file_size": document.get("file_size"),
        "mime_type": document.get("mime_type"),
        "ocr_confidence": document.get("ocr_confidence"),
        "extracted_text": document.get("extracted_text", ""),
        "extracted_fields": extracted_fields,
        "issuing_authority": document.get("issuing_authority"),
        "issue_date": document.get("issue_date") or None,
        "expiry_date": document.get("expiry_date") or None,
        "document_number": document.get("document_number"),
        "is_validated": document.get("is_validated", False),
        "validation_notes": document.get("validation_notes"),
        "created_at": document.get("created_at", ""),
    }


@router.delete("/documents/{document_id}")
async def delete_document(document_id: str):
    """Delete a document"""
    doc_service = DocumentService()
    success = doc_service.delete_document(document_id)

    if not success:
        raise HTTPException(status_code=404, detail="Document not found")

    return {"status": "deleted", "document_id": document_id}


@router.post("/documents/analyze", response_model=DocumentAnalysisResponse)
async def analyze_documents_with_agents(
    request: DocumentAnalysisRequest,
    db: Session = Depends(get_db)
):
    """
    Analyze vessel documents using CrewAI agents.

    This endpoint runs a 3-agent crew:
    1. Document Analyzer - Classifies documents and extracts metadata
    2. Requirements Researcher - Determines required documents based on vessel/route
    3. Gap Analyst - Compares documents against requirements and provides recommendations

    Users upload documents first, then call this endpoint to get AI-driven analysis
    of what documents are present, missing, or expired.
    """
    # Validate vessel exists
    vessel = db.query(Vessel).filter(Vessel.id == request.vessel_id).first()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")

    # Get orchestrator
    orchestrator = get_document_analysis_orchestrator()

    if not orchestrator.is_available:
        raise HTTPException(
            status_code=503,
            detail="Document analysis service not available. Check CrewAI configuration."
        )

    # Prepare vessel info
    vessel_info = {
        "name": vessel.name,
        "imo_number": vessel.imo_number,
        "vessel_type": vessel.vessel_type.value if vessel.vessel_type else "container",
        "flag_state": vessel.flag_state,
        "gross_tonnage": vessel.gross_tonnage,
    }

    # Get documents
    doc_service = DocumentService()

    if request.document_ids:
        # Get specific documents
        documents = []
        for doc_id in request.document_ids:
            doc = doc_service.get_document(doc_id)
            if doc and doc.get("vessel_id") == request.vessel_id:
                documents.append(doc)
    else:
        # Get all vessel documents
        documents = doc_service.get_vessel_documents(request.vessel_id)

    if not documents:
        raise HTTPException(
            status_code=400,
            detail="No documents found for this vessel. Please upload documents first."
        )

    # Prepare document texts for analysis
    document_texts = [
        {
            "id": str(d["id"]),
            "filename": d.get("file_name") or f"document_{d['id']}",
            "file_type": d.get("mime_type") or "application/pdf",
            "ocr_text": d.get("extracted_text") or "",
            "document_type": d.get("document_type", "unknown"),
            "expiry_date": d.get("expiry_date") or None,
        }
        for d in documents
    ]

    # Run CrewAI analysis
    result = await orchestrator.analyze_documents(
        document_texts=document_texts,
        vessel_info=vessel_info,
        route_ports=request.port_codes
    )

    if not result.get("success"):
        return DocumentAnalysisResponse(
            success=False,
            overall_status="ERROR",
            compliance_score=0,
            documents_analyzed=len(documents),
            valid_documents=[],
            expiring_soon_documents=[],
            expired_documents=[],
            missing_documents=[],
            recommendations=[],
            agent_reasoning=result.get("error", "Unknown error"),
            vessel_info=vessel_info,
            route_ports=request.port_codes
        )

    # Parse the result
    parsed = result.get("parsed_result") or {}

    # Extract data from parsed result or provide defaults
    valid_docs = []
    expiring_docs = []
    expired_docs = []
    missing_docs = []
    recommendations = []
    compliance_score = parsed.get("compliance_score", 0)
    overall_status = parsed.get("overall_status", "PENDING_REVIEW")

    # Process valid documents
    for doc in parsed.get("valid_documents", []):
        valid_docs.append(DocumentSummary(
            document_type=doc.get("document_type", "unknown"),
            expiry_date=doc.get("expiry_date"),
            status="valid",
            days_until_expiry=doc.get("days_until_expiry")
        ))

    # Process expiring soon documents
    for doc in parsed.get("expiring_soon", parsed.get("expiring_soon_documents", [])):
        expiring_docs.append(DocumentSummary(
            document_type=doc.get("document_type", "unknown"),
            expiry_date=doc.get("expiry_date"),
            status="expiring_soon",
            days_until_expiry=doc.get("days_until_expiry")
        ))

    # Process expired documents
    for doc in parsed.get("expired_documents", []):
        expired_docs.append(DocumentSummary(
            document_type=doc.get("document_type", "unknown"),
            expiry_date=doc.get("expiry_date"),
            status="expired",
            days_until_expiry=doc.get("days_until_expiry")
        ))

    # Process missing documents
    for doc in parsed.get("missing_documents", []):
        missing_docs.append(MissingDocument(
            document_type=doc.get("document_type", "unknown"),
            required_by=doc.get("required_by", doc.get("ports_affected", ["Unknown"])),
            priority=doc.get("priority", "HIGH")
        ))

    # Process recommendations
    for rec in parsed.get("recommendations", []):
        recommendations.append(Recommendation(
            priority=rec.get("priority", "MEDIUM"),
            action=rec.get("action", ""),
            documents=rec.get("documents", []),
            deadline=rec.get("deadline")
        ))

    return DocumentAnalysisResponse(
        success=True,
        overall_status=overall_status,
        compliance_score=int(compliance_score),
        documents_analyzed=len(documents),
        valid_documents=valid_docs,
        expiring_soon_documents=expiring_docs,
        expired_documents=expired_docs,
        missing_documents=missing_docs,
        recommendations=recommendations,
        agent_reasoning=result.get("crew_output"),
        vessel_info=vessel_info,
        route_ports=request.port_codes
    )


# ========== Missing Documents Detection Endpoint ==========

@router.post("/documents/detect-missing", response_model=MissingDocsResponse)
async def detect_missing_documents(
    request: MissingDocsRequest,
    db: Session = Depends(get_db)
):
    """
    Detect missing documents for a route using a dedicated agentic workflow.

    This is SEPARATE from /documents/analyze:
    - /documents/analyze: Analyzes raw uploaded document content (OCR text) with 3-agent crew
    - /documents/detect-missing: Checks ALL existing DB records against route requirements with 2-agent crew

    Supports two modes:
    1. Vessel-based: Provide vessel_id (and optionally route_id) to use vessel routes and documents
    2. Vesselless: Provide port_codes and customer_id to analyze customer documents against a custom route

    Steps:
    1. Load vessel info (or use defaults for vesselless mode)
    2. Load route ports (from route_id, active route, or port_codes)
    3. Load documents (from vessel or customer)
    4. Run the missing docs agentic workflow
    5. Return structured gap analysis
    """
    doc_service = DocumentService()
    port_codes = []
    route_name = "Custom Route"
    vessel_info = {}
    documents = []

    # Mode 1: Vesselless analysis with port_codes and customer_id
    if request.port_codes and request.customer_id:
        port_codes = [p.strip().upper() for p in request.port_codes if p.strip()]
        route_name = f"Route: {' → '.join(port_codes[:3])}{'...' if len(port_codes) > 3 else ''}"
        
        # Use default vessel info for vesselless analysis
        vessel_info = {
            "vessel_id": 0,
            "customer_id": request.customer_id,
            "name": "User Vessel",
            "imo_number": "N/A",
            "vessel_type": "container",
            "flag_state": "Unknown",
            "gross_tonnage": 0,
        }
        
        # Get customer documents
        documents = doc_service.get_customer_documents(request.customer_id)
    
    # Mode 2: Vessel-based analysis
    elif request.vessel_id:
        # Validate vessel exists
        vessel = db.query(Vessel).filter(Vessel.id == request.vessel_id).first()
        if not vessel:
            raise HTTPException(status_code=404, detail="Vessel not found")

        # Get route
        if request.route_id:
            route = db.query(VesselRoute).filter(
                VesselRoute.id == request.route_id,
                VesselRoute.vessel_id == request.vessel_id
            ).first()
        else:
            route = db.query(VesselRoute).filter(
                VesselRoute.vessel_id == request.vessel_id,
                VesselRoute.is_active == True
            ).first()

        if not route:
            raise HTTPException(
                status_code=404,
                detail="No active route found for this vessel. Please create a route first."
            )

        port_codes = json.loads(route.port_codes) if route.port_codes else []
        route_name = route.route_name or "Unnamed Route"

        # Prepare vessel info
        vessel_info = {
            "vessel_id": vessel.id,
            "name": vessel.name,
            "imo_number": vessel.imo_number,
            "vessel_type": vessel.vessel_type.value if vessel.vessel_type else "container",
            "flag_state": vessel.flag_state,
            "gross_tonnage": vessel.gross_tonnage,
        }

        # Get ALL vessel documents (structured data, NOT raw OCR text)
        documents = doc_service.get_vessel_documents(request.vessel_id)
    
    else:
        raise HTTPException(
            status_code=400,
            detail="Either vessel_id or (port_codes + customer_id) must be provided."
        )

    if not port_codes:
        raise HTTPException(
            status_code=400,
            detail="No port codes provided. Please specify a route or provide port_codes."
        )

    existing_docs = []
    for d in documents:
        expiry_str = d.get("expiry_date") or ""
        is_expired = False
        if expiry_str:
            try:
                is_expired = datetime.fromisoformat(expiry_str) < datetime.now()
            except (ValueError, TypeError):
                pass
        existing_docs.append({
            "document_type": d.get("document_type", "other"),
            "expiry_date": expiry_str or None,
            "is_expired": is_expired,
            "is_validated": d.get("is_validated", False),
            "document_number": d.get("document_number"),
            "issuing_authority": d.get("issuing_authority"),
            "title": d.get("title", ""),
        })

    # Get orchestrator
    orchestrator = get_missing_docs_orchestrator()

    if not orchestrator.is_available:
        raise HTTPException(
            status_code=503,
            detail="Missing documents detection service not available. Check CrewAI configuration."
        )

    # Run the agentic workflow
    result = await orchestrator.detect_missing_documents(
        vessel_info=vessel_info,
        route_ports=port_codes,
        existing_documents=existing_docs
    )

    if not result.get("success"):
        return MissingDocsResponse(
            success=False,
            overall_status="ERROR",
            compliance_score=0,
            vessel_info=vessel_info,
            route_ports=port_codes,
            route_name=route_name,
            missing_documents=[],
            expired_documents=[],
            expiring_soon_documents=[],
            valid_documents=[],
            recommendations=[],
            agent_reasoning=result.get("error", "Unknown error"),
            total_documents_on_file=len(documents),
        )

    # Parse the result
    parsed = result.get("parsed_result") or {}

    # Extract data from parsed result
    valid_docs = []
    expiring_docs = []
    expired_docs = []
    missing_docs = []
    recommendations = []
    compliance_score = parsed.get("compliance_score", 0)
    overall_status = parsed.get("overall_status", "PENDING_REVIEW")

    for doc in parsed.get("valid_documents", []):
        valid_docs.append(DocumentSummary(
            document_type=doc.get("document_type", "unknown"),
            title=doc.get("title"),
            expiry_date=doc.get("expiry_date"),
            status="valid",
            days_until_expiry=doc.get("days_until_expiry"),
            category=categorize_document(doc.get("document_type", "unknown"))
        ))

    for doc in parsed.get("expiring_soon", parsed.get("expiring_soon_documents", [])):
        expiring_docs.append(DocumentSummary(
            document_type=doc.get("document_type", "unknown"),
            title=doc.get("title"),
            expiry_date=doc.get("expiry_date"),
            status="expiring_soon",
            days_until_expiry=doc.get("days_until_expiry"),
            category=categorize_document(doc.get("document_type", "unknown"))
        ))

    for doc in parsed.get("expired_documents", []):
        expired_docs.append(DocumentSummary(
            document_type=doc.get("document_type", "unknown"),
            title=doc.get("title"),
            expiry_date=doc.get("expiry_date"),
            status="expired",
            days_until_expiry=doc.get("days_until_expiry"),
            category=categorize_document(doc.get("document_type", "unknown"))
        ))

    # NOTE: Semantic re-validation is now handled by the 3rd CrewAI agent
    # (Semantic Document Verifier) inside the crew workflow. The agent uses
    # the semantic_document_search tool to verify each "missing" document
    # against stored documents before producing the final output.

    # Filter out region-specific documents that don't apply to the route
    US_SPECIFIC_DOCS = {
        "cbp", "isf", "carb", "uscg", "us_cbp", "us_customs", "importer_security_filing",
        "california_air_resources", "us_coast_guard", "c-tpat", "ace_manifest"
    }
    EU_SPECIFIC_DOCS = {"eu_mrv", "mrv", "eu_ets"}
    
    # Check if route includes US or EU ports
    us_port_prefixes = ("US",)
    eu_port_prefixes = ("NL", "DE", "BE", "FR", "ES", "IT", "PT", "GR", "PL", "SE", "DK", "FI", "IE", "AT", "EE", "LV", "LT", "MT", "CY", "SI", "HR", "BG", "RO", "SK", "CZ", "HU", "LU")
    
    has_us_ports = any(p.upper().startswith(us_port_prefixes) for p in port_codes)
    has_eu_ports = any(p.upper().startswith(eu_port_prefixes) for p in port_codes)

    for doc in parsed.get("missing_documents", []):
        doc_type = doc.get("document_type", "unknown").lower().replace(" ", "_").replace("-", "_")
        
        # Skip US-specific docs if no US ports in route
        if not has_us_ports and any(us_doc in doc_type for us_doc in US_SPECIFIC_DOCS):
            logger.debug(f"Filtering out US-specific doc {doc_type} - no US ports in route")
            continue
        
        # Skip EU-specific docs if no EU ports in route
        if not has_eu_ports and any(eu_doc in doc_type for eu_doc in EU_SPECIFIC_DOCS):
            logger.debug(f"Filtering out EU-specific doc {doc_type} - no EU ports in route")
            continue
        
        doc_category = categorize_document(doc.get("document_type", "unknown"))
        missing_docs.append(MissingDocument(
            document_type=doc.get("document_type", "unknown"),
            required_by=doc.get("required_by", doc.get("ports_affected", ["Unknown"])),
            priority=doc.get("priority", "HIGH"),
            category=doc_category
        ))

    for rec in parsed.get("recommendations", []):
        recommendations.append(Recommendation(
            priority=rec.get("priority", "MEDIUM"),
            action=rec.get("action", ""),
            documents=rec.get("documents", []),
            deadline=rec.get("deadline")
        ))

    # Recalculate compliance score after region filtering
    total_docs = len(valid_docs) + len(expiring_docs) + len(expired_docs) + len(missing_docs)
    if total_docs > 0:
        compliance_score = int(
            ((len(valid_docs) * 100) + (len(expiring_docs) * 80))
            / total_docs
        )
    if missing_docs or expired_docs:
        overall_status = "NON_COMPLIANT" if len(missing_docs) > 5 else "PARTIAL"
    elif expiring_docs:
        overall_status = "PARTIAL"
    elif valid_docs:
        overall_status = "COMPLIANT"

    # Categorize all documents into vessel (ship owner/operator) vs cargo
    vessel_missing = [d for d in missing_docs if d.category == "vessel"]
    cargo_missing = [d for d in missing_docs if d.category == "cargo"]
    vessel_valid = [d for d in valid_docs if d.category == "vessel"]
    cargo_valid = [d for d in valid_docs if d.category == "cargo"]

    return MissingDocsResponse(
        success=True,
        overall_status=overall_status,
        compliance_score=int(compliance_score),
        vessel_info=vessel_info,
        route_ports=port_codes,
        route_name=route_name,
        missing_documents=missing_docs,
        expired_documents=expired_docs,
        expiring_soon_documents=expiring_docs,
        valid_documents=valid_docs,
        vessel_missing_documents=vessel_missing,
        cargo_missing_documents=cargo_missing,
        vessel_valid_documents=vessel_valid,
        cargo_valid_documents=cargo_valid,
        recommendations=recommendations,
        agent_reasoning=result.get("crew_output"),
        total_documents_on_file=len(documents),
    )


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

        doc_service = DocumentService()
        user_docs = doc_service.get_vessel_documents(request.vessel_id)
        user_docs_list = []
        for d in user_docs:
            expiry_str = d.get("expiry_date") or ""
            is_expired = False
            if expiry_str:
                try:
                    is_expired = datetime.fromisoformat(expiry_str) < datetime.now()
                except (ValueError, TypeError):
                    pass
            user_docs_list.append({
                "document_type": d.get("document_type", "other"),
                "expiry_date": expiry_str or None,
                "is_expired": is_expired,
            })

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
        "embeddings_configured": kb.embeddings is not None,
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


# ========== Structured Business Reports Endpoints ==========

class BusinessQueryRequest(BaseModel):
    """Request model for business-friendly knowledge base queries"""
    query: str = Field(..., min_length=3, description="Natural language query")
    vessel_type: Optional[str] = Field(None, description="Vessel type for context")
    port_codes: Optional[List[str]] = Field(None, description="Relevant port codes")
    top_k: int = Field(default=10, ge=1, le=20)


class StructuredReportRequest(BaseModel):
    """Request model for full structured compliance report"""
    vessel_id: int
    port_codes: List[str] = Field(..., min_length=1)
    voyage_start_date: Optional[str] = Field(None, description="ISO date format: YYYY-MM-DD")
    include_documents: bool = Field(default=True, description="Include user document analysis")


@router.post("/reports/query", summary="Query regulations with business-friendly response")
async def query_regulations_for_business(request: BusinessQueryRequest):
    """
    Query maritime regulations and get a structured, business-friendly response.
    
    Returns:
    - Relevant regulations categorized by priority
    - Required documents identified
    - Prioritized action items
    - Risk factors
    - Source references
    
    This endpoint is designed for business users who need actionable compliance information.
    """
    kb = get_maritime_knowledge_base()
    
    result = kb.query_for_business(
        query=request.query,
        vessel_type=request.vessel_type,
        port_codes=request.port_codes,
        top_k=request.top_k
    )
    
    return result


@router.get("/reports/port/{port_code}", summary="Get structured port requirements")
async def get_structured_port_report(
    port_code: str,
    vessel_type: str = Query(default="cargo_ship", description="Vessel type")
):
    """
    Get comprehensive, structured port requirements for business users.
    
    Returns requirements organized by category:
    - Pre-arrival requirements
    - Documentation requirements
    - Environmental requirements
    - Safety requirements
    - Customs requirements
    
    Also includes a compliance checklist with phased actions.
    """
    kb = get_maritime_knowledge_base()
    
    result = kb.get_structured_port_requirements(
        port_code=port_code,
        vessel_type=vessel_type
    )
    
    return result


@router.post("/reports/route-summary", summary="Get structured route compliance summary")
async def get_route_compliance_summary(
    port_codes: List[str] = Query(..., description="Port codes in route order"),
    vessel_type: str = Query(default="cargo_ship"),
    gross_tonnage: Optional[float] = Query(None),
    flag_state: Optional[str] = Query(None)
):
    """
    Generate a business-friendly compliance summary for an entire route.
    
    Returns:
    - Executive summary with key metrics
    - Port-by-port requirement summaries
    - Common documents needed across all ports
    - Prioritized action items
    - Risk assessment
    - Recommendations
    
    Ideal for voyage planning and compliance review meetings.
    """
    kb = get_maritime_knowledge_base()
    
    vessel_info = {
        "vessel_type": vessel_type,
        "gross_tonnage": gross_tonnage,
        "flag_state": flag_state,
    }
    
    result = kb.get_compliance_summary_for_route(
        port_codes=port_codes,
        vessel_info=vessel_info
    )
    
    return result


@router.post("/reports/compliance-report", response_model=ComplianceReport, summary="Generate full compliance report")
async def generate_full_compliance_report(
    request: StructuredReportRequest,
    db: Session = Depends(get_db)
):
    """
    Generate a comprehensive structured compliance report for a vessel and route.
    
    This is the most complete report format, including:
    - Executive summary with compliance score and risk level
    - Document gap analysis (if documents are uploaded)
    - Port-by-port requirements
    - IMO convention requirements
    - Regional requirements (EU MRV, ECA, etc.)
    - Risk assessments with probability and impact
    - Prioritized action items with deadlines
    - Compliance timeline
    
    The report follows the ComplianceReport model structure, making it
    suitable for programmatic processing or display in business dashboards.
    """
    # Validate vessel exists
    vessel = db.query(Vessel).filter(Vessel.id == request.vessel_id).first()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")
    
    # Parse voyage start date
    voyage_start = None
    if request.voyage_start_date:
        try:
            from datetime import date
            voyage_start = date.fromisoformat(request.voyage_start_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Prepare vessel info
    vessel_info = {
        "vessel_name": vessel.name,
        "imo_number": vessel.imo_number,
        "vessel_type": vessel.vessel_type.value if vessel.vessel_type else "cargo_ship",
        "flag_state": vessel.flag_state,
        "gross_tonnage": vessel.gross_tonnage,
        "year_built": vessel.year_built,
        "classification_society": vessel.classification_society,
    }
    
    # Get user documents if requested
    user_documents = []
    if request.include_documents:
        doc_service = DocumentService()
        docs = doc_service.get_vessel_documents(request.vessel_id)
        for d in docs:
            expiry_str = d.get("expiry_date") or ""
            expiry_date_obj = None
            if expiry_str:
                try:
                    expiry_date_obj = datetime.fromisoformat(expiry_str).date()
                except (ValueError, TypeError):
                    pass
            user_documents.append({
                "document_type": d.get("document_type", "other"),
                "expiry_date": expiry_date_obj,
            })
    
    # Generate the report
    report_generator = get_compliance_report_generator()
    
    report = report_generator.generate_compliance_report(
        vessel_info=vessel_info,
        route_ports=request.port_codes,
        user_documents=user_documents,
        voyage_start_date=voyage_start
    )
    
    return report


@router.get("/reports/quick-check", response_model=QuickComplianceCheck, summary="Quick compliance check for a query")
async def quick_compliance_check(
    query: str = Query(..., min_length=3, description="Compliance question"),
    vessel_type: Optional[str] = Query(None),
    port_code: Optional[str] = Query(None)
):
    """
    Perform a quick compliance check based on a natural language query.
    
    Examples:
    - "What certificates do I need for a container ship going to Rotterdam?"
    - "Do I need a scrubber for Baltic Sea ECA?"
    - "What are the pre-arrival requirements for Singapore?"
    
    Returns a quick assessment with:
    - Status (COMPLIANT, PARTIAL, NON_COMPLIANT, PENDING_REVIEW)
    - Key findings
    - Required documents
    - Action items
    - Risk level
    """
    kb = get_maritime_knowledge_base()
    
    # Search knowledge base
    business_result = kb.query_for_business(
        query=query,
        vessel_type=vessel_type,
        port_codes=[port_code] if port_code else None,
        top_k=5
    )
    
    # Analyze results to determine compliance status
    findings = []
    required_docs = business_result.get("documents_needed", [])
    action_items = []
    
    # Extract findings from regulations
    for reg in business_result.get("regulations", []):
        findings.append(f"{reg['regulation']}: {reg['title']}")
    
    # Convert action items to proper format
    for action in business_result.get("action_items", []):
        action_items.append(ActionItem(
            action_id=f"QC-{len(action_items)+1:03d}",
            priority=Priority(action.get("priority", "MEDIUM")),
            category=action.get("category", "General"),
            action=action.get("action", ""),
            reason=action.get("reason", ""),
            regulation_reference="See sources",
        ))
    
    # Determine overall status and risk level
    risk_factors = business_result.get("risk_factors", [])
    
    if risk_factors:
        status = ComplianceStatus.PENDING_REVIEW
        risk_level = RiskLevel.HIGH
    elif required_docs:
        status = ComplianceStatus.PARTIAL
        risk_level = RiskLevel.MEDIUM
    else:
        status = ComplianceStatus.PENDING_REVIEW
        risk_level = RiskLevel.LOW
    
    # Calculate confidence based on results
    total_results = business_result.get("metadata", {}).get("total_results", 0)
    confidence = min(0.9, total_results * 0.1) if total_results > 0 else 0.3
    
    return QuickComplianceCheck(
        query=query,
        status=status,
        findings=findings[:5],
        required_documents=required_docs[:10],
        action_items=action_items,
        risk_level=risk_level,
        confidence=confidence,
        sources=business_result.get("sources", [])
    )


# ========== Health Check ==========

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    kb = get_maritime_knowledge_base()
    compliance_orchestrator = get_compliance_orchestrator()
    document_orchestrator = get_document_analysis_orchestrator()
    missing_docs_orchestrator = get_missing_docs_orchestrator()

    return {
        "status": "healthy",
        "knowledge_base": {
            "collections": list(kb.COLLECTIONS.keys()),
            "embeddings_configured": kb.embeddings is not None,
        },
        "crewai_compliance_available": compliance_orchestrator.is_available,
        "crewai_document_analysis_available": document_orchestrator.is_available,
        "crewai_missing_docs_available": missing_docs_orchestrator.is_available,
        "timestamp": datetime.now().isoformat(),
    }
