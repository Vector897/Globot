"""
Compliance Service - Route compliance checking
Integrates with CrewAI for comprehensive compliance analysis
"""
import logging
import json
from typing import List, Optional, Dict, Any
from datetime import datetime
from dataclasses import dataclass, field, asdict

from sqlalchemy.orm import Session

from models import (
    Vessel, UserDocument, Port, ComplianceCheck, ComplianceStatus,
    DocumentType, VesselType
)
from services.maritime_knowledge_base import get_maritime_knowledge_base, SearchResult
from services.document_service import DocumentService

logger = logging.getLogger(__name__)


@dataclass
class PortComplianceResult:
    """Compliance result for a single port"""
    port_code: str
    port_name: str
    status: ComplianceStatus
    required_documents: List[Dict[str, Any]] = field(default_factory=list)
    available_documents: List[Dict[str, Any]] = field(default_factory=list)
    missing_documents: List[Dict[str, Any]] = field(default_factory=list)
    expired_documents: List[Dict[str, Any]] = field(default_factory=list)
    special_requirements: List[str] = field(default_factory=list)
    risk_factors: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict:
        return {
            "port_code": self.port_code,
            "port_name": self.port_name,
            "status": self.status.value,
            "required_documents": self.required_documents,
            "available_documents": self.available_documents,
            "missing_documents": self.missing_documents,
            "expired_documents": self.expired_documents,
            "special_requirements": self.special_requirements,
            "risk_factors": self.risk_factors,
        }


@dataclass
class RouteComplianceResult:
    """Compliance result for entire route"""
    vessel_id: int
    route_name: str
    route_ports: List[str]
    overall_status: ComplianceStatus
    compliance_score: float
    port_results: List[PortComplianceResult] = field(default_factory=list)
    all_missing_documents: List[Dict[str, Any]] = field(default_factory=list)
    all_expired_documents: List[Dict[str, Any]] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    risk_level: str = "low"  # low, medium, high, critical
    summary_report: str = ""
    detailed_report: str = ""

    def to_dict(self) -> Dict:
        return {
            "vessel_id": self.vessel_id,
            "route_name": self.route_name,
            "route_ports": self.route_ports,
            "overall_status": self.overall_status.value,
            "compliance_score": self.compliance_score,
            "port_results": [p.to_dict() for p in self.port_results],
            "all_missing_documents": self.all_missing_documents,
            "all_expired_documents": self.all_expired_documents,
            "recommendations": self.recommendations,
            "risk_level": self.risk_level,
            "summary_report": self.summary_report,
            "detailed_report": self.detailed_report,
        }


class ComplianceService:
    """
    Route compliance checking service

    Integrates:
    - Maritime Knowledge Base for regulations
    - Document Service for user documents
    - CrewAI for comprehensive analysis (optional)
    """

    # Standard documents required for all international voyages
    UNIVERSAL_REQUIRED_DOCUMENTS = [
        DocumentType.SAFETY_CERTIFICATE,
        DocumentType.LOAD_LINE_CERTIFICATE,
        DocumentType.MARPOL_CERTIFICATE,
        DocumentType.ISM_CERTIFICATE,
        DocumentType.ISPS_CERTIFICATE,
        DocumentType.REGISTRY_CERTIFICATE,
        DocumentType.TONNAGE_CERTIFICATE,
        DocumentType.INSURANCE_CERTIFICATE,
        DocumentType.CREW_CERTIFICATE,
    ]

    def __init__(self, db: Session):
        self.db = db
        self.kb = get_maritime_knowledge_base()
        self.doc_service = DocumentService(db)

    def check_port_compliance(
        self,
        vessel_id: int,
        port_code: str,
        port_name: Optional[str] = None
    ) -> PortComplianceResult:
        """
        Check compliance for a single port

        Args:
            vessel_id: Vessel ID
            port_code: UN/LOCODE port code
            port_name: Optional port name

        Returns:
            PortComplianceResult with compliance details
        """
        # Get vessel info
        vessel = self.db.query(Vessel).filter(Vessel.id == vessel_id).first()
        if not vessel:
            return PortComplianceResult(
                port_code=port_code,
                port_name=port_name or port_code,
                status=ComplianceStatus.PENDING_REVIEW,
                risk_factors=["Vessel not found"]
            )

        vessel_type = vessel.vessel_type.value if vessel.vessel_type else "container"

        # Get port from database
        port = self.db.query(Port).filter(Port.un_locode == port_code).first()
        if port:
            port_name = port.name

        # Get required documents from knowledge base
        kb_required_docs = self.kb.search_required_documents(port_code, vessel_type)

        # Combine with universal requirements
        all_required_types = set(self.UNIVERSAL_REQUIRED_DOCUMENTS)
        for doc in kb_required_docs:
            try:
                doc_type = DocumentType(doc["document_type"])
                all_required_types.add(doc_type)
            except:
                pass

        # Check vessel documents against requirements
        doc_matches = self.doc_service.find_matching_documents(
            vessel_id=vessel_id,
            required_doc_types=list(all_required_types),
            check_expiry=True
        )

        # Build result
        required_documents = []
        available_documents = []
        missing_documents = []
        expired_documents = []

        for doc_type_str, match_info in doc_matches.items():
            req_doc = {
                "document_type": doc_type_str,
                "required": True,
            }
            required_documents.append(req_doc)

            if match_info["found"]:
                if match_info["is_expired"]:
                    expired_documents.append({
                        "document_type": doc_type_str,
                        "document": match_info["document"],
                    })
                else:
                    available_documents.append({
                        "document_type": doc_type_str,
                        "document": match_info["document"],
                        "days_until_expiry": match_info["days_until_expiry"],
                    })
            else:
                missing_documents.append({
                    "document_type": doc_type_str,
                    "description": f"Missing {doc_type_str.replace('_', ' ').title()}",
                })

        # Get special requirements from KB
        port_regulations = self.kb.search_by_port(port_code, vessel_type, top_k=5)
        special_requirements = [
            r.content[:200] for r in port_regulations[:3]
        ]

        # Calculate risk factors
        risk_factors = []
        if len(missing_documents) > 0:
            risk_factors.append(f"{len(missing_documents)} required documents missing")
        if len(expired_documents) > 0:
            risk_factors.append(f"{len(expired_documents)} documents expired")

        # Check for documents expiring within 30 days
        expiring_soon = [d for d in available_documents
                        if d.get("days_until_expiry") and d["days_until_expiry"] < 30]
        if expiring_soon:
            risk_factors.append(f"{len(expiring_soon)} documents expiring within 30 days")

        # Determine status
        if len(missing_documents) == 0 and len(expired_documents) == 0:
            status = ComplianceStatus.COMPLIANT
        elif len(missing_documents) > 3 or len(expired_documents) > 2:
            status = ComplianceStatus.NON_COMPLIANT
        else:
            status = ComplianceStatus.PARTIAL

        return PortComplianceResult(
            port_code=port_code,
            port_name=port_name or port_code,
            status=status,
            required_documents=required_documents,
            available_documents=available_documents,
            missing_documents=missing_documents,
            expired_documents=expired_documents,
            special_requirements=special_requirements,
            risk_factors=risk_factors,
        )

    def check_route_compliance(
        self,
        vessel_id: int,
        port_codes: List[str],
        route_name: Optional[str] = None
    ) -> RouteComplianceResult:
        """
        Check compliance for entire route

        Args:
            vessel_id: Vessel ID
            port_codes: List of UN/LOCODE port codes
            route_name: Optional route name

        Returns:
            RouteComplianceResult with full analysis
        """
        if not route_name:
            route_name = f"{port_codes[0]} to {port_codes[-1]}"

        # Check each port
        port_results = []
        all_missing = []
        all_expired = []

        for port_code in port_codes:
            port_result = self.check_port_compliance(vessel_id, port_code)
            port_results.append(port_result)

            # Aggregate missing/expired documents
            for doc in port_result.missing_documents:
                if doc not in all_missing:
                    doc["ports"] = [port_code]
                    all_missing.append(doc)
                else:
                    existing = next((d for d in all_missing if d["document_type"] == doc["document_type"]), None)
                    if existing:
                        existing.setdefault("ports", []).append(port_code)

            for doc in port_result.expired_documents:
                if doc not in all_expired:
                    doc["ports"] = [port_code]
                    all_expired.append(doc)

        # Calculate overall status and score
        compliant_count = sum(1 for p in port_results if p.status == ComplianceStatus.COMPLIANT)
        partial_count = sum(1 for p in port_results if p.status == ComplianceStatus.PARTIAL)
        non_compliant_count = sum(1 for p in port_results if p.status == ComplianceStatus.NON_COMPLIANT)

        total_ports = len(port_results)
        compliance_score = (compliant_count * 100 + partial_count * 50) / total_ports if total_ports > 0 else 0

        if non_compliant_count > 0:
            overall_status = ComplianceStatus.NON_COMPLIANT
        elif partial_count > 0:
            overall_status = ComplianceStatus.PARTIAL
        else:
            overall_status = ComplianceStatus.COMPLIANT

        # Determine risk level
        if compliance_score >= 90:
            risk_level = "low"
        elif compliance_score >= 70:
            risk_level = "medium"
        elif compliance_score >= 50:
            risk_level = "high"
        else:
            risk_level = "critical"

        # Generate recommendations
        recommendations = self._generate_recommendations(all_missing, all_expired, port_results)

        # Generate reports
        summary_report = self._generate_summary_report(
            route_name, port_results, overall_status, compliance_score, risk_level
        )
        detailed_report = self._generate_detailed_report(
            route_name, port_results, all_missing, all_expired, recommendations
        )

        return RouteComplianceResult(
            vessel_id=vessel_id,
            route_name=route_name,
            route_ports=port_codes,
            overall_status=overall_status,
            compliance_score=round(compliance_score, 1),
            port_results=port_results,
            all_missing_documents=all_missing,
            all_expired_documents=all_expired,
            recommendations=recommendations,
            risk_level=risk_level,
            summary_report=summary_report,
            detailed_report=detailed_report,
        )

    def save_compliance_check(
        self,
        customer_id: int,
        result: RouteComplianceResult,
        crew_run_id: Optional[str] = None,
        agent_outputs: Optional[Dict] = None
    ) -> ComplianceCheck:
        """Save compliance check result to database"""
        check = ComplianceCheck(
            customer_id=customer_id,
            vessel_id=result.vessel_id,
            route_name=result.route_name,
            route_ports=json.dumps(result.route_ports),
            overall_status=result.overall_status,
            compliance_score=result.compliance_score,
            port_results=json.dumps([p.to_dict() for p in result.port_results]),
            missing_documents=json.dumps(result.all_missing_documents),
            recommendations=json.dumps(result.recommendations),
            summary_report=result.summary_report,
            detailed_report=result.detailed_report,
            crew_run_id=crew_run_id,
            agent_outputs=json.dumps(agent_outputs) if agent_outputs else None,
        )

        self.db.add(check)
        self.db.commit()
        self.db.refresh(check)

        return check

    def get_compliance_history(
        self,
        vessel_id: int,
        limit: int = 10
    ) -> List[ComplianceCheck]:
        """Get compliance check history for a vessel"""
        return (
            self.db.query(ComplianceCheck)
            .filter(ComplianceCheck.vessel_id == vessel_id)
            .order_by(ComplianceCheck.created_at.desc())
            .limit(limit)
            .all()
        )

    def _generate_recommendations(
        self,
        missing_docs: List[Dict],
        expired_docs: List[Dict],
        port_results: List[PortComplianceResult]
    ) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []

        # Missing documents
        if missing_docs:
            doc_types = list(set(d["document_type"] for d in missing_docs))
            recommendations.append(
                f"URGENT: Obtain the following missing certificates: {', '.join(doc_types[:5])}"
            )

        # Expired documents
        if expired_docs:
            doc_types = list(set(d["document_type"] for d in expired_docs))
            recommendations.append(
                f"URGENT: Renew expired certificates: {', '.join(doc_types)}"
            )

        # Port-specific recommendations
        non_compliant_ports = [p for p in port_results if p.status == ComplianceStatus.NON_COMPLIANT]
        if non_compliant_ports:
            port_names = [p.port_name for p in non_compliant_ports[:3]]
            recommendations.append(
                f"Address compliance issues before calling at: {', '.join(port_names)}"
            )

        # PSC risk warning
        high_risk_ports = [p for p in port_results if len(p.risk_factors) > 2]
        if high_risk_ports:
            recommendations.append(
                "High PSC inspection risk at multiple ports. Ensure all documents are readily available."
            )

        if not recommendations:
            recommendations.append("Vessel appears to be fully compliant for this route. Maintain current documentation.")

        return recommendations

    def _generate_summary_report(
        self,
        route_name: str,
        port_results: List[PortComplianceResult],
        overall_status: ComplianceStatus,
        compliance_score: float,
        risk_level: str
    ) -> str:
        """Generate executive summary report"""
        compliant_count = sum(1 for p in port_results if p.status == ComplianceStatus.COMPLIANT)
        total_ports = len(port_results)

        status_text = {
            ComplianceStatus.COMPLIANT: "COMPLIANT",
            ComplianceStatus.PARTIAL: "PARTIALLY COMPLIANT",
            ComplianceStatus.NON_COMPLIANT: "NON-COMPLIANT",
        }.get(overall_status, "PENDING REVIEW")

        return f"""
ROUTE COMPLIANCE SUMMARY
========================
Route: {route_name}
Overall Status: {status_text}
Compliance Score: {compliance_score}%
Risk Level: {risk_level.upper()}

Port Compliance: {compliant_count}/{total_ports} ports fully compliant

This assessment evaluates vessel documentation against international maritime regulations
including SOLAS, MARPOL, ISM Code, ISPS Code, and port-specific requirements.
""".strip()

    def _generate_detailed_report(
        self,
        route_name: str,
        port_results: List[PortComplianceResult],
        missing_docs: List[Dict],
        expired_docs: List[Dict],
        recommendations: List[str]
    ) -> str:
        """Generate detailed compliance report"""
        lines = [
            "DETAILED COMPLIANCE REPORT",
            "=" * 50,
            f"\nRoute: {route_name}",
            f"Report Generated: {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}",
            "\n" + "=" * 50,
            "\nPORT-BY-PORT ANALYSIS",
            "-" * 30,
        ]

        for port in port_results:
            status_emoji = {
                ComplianceStatus.COMPLIANT: "[OK]",
                ComplianceStatus.PARTIAL: "[WARN]",
                ComplianceStatus.NON_COMPLIANT: "[FAIL]",
            }.get(port.status, "[?]")

            lines.append(f"\n{status_emoji} {port.port_name} ({port.port_code})")
            lines.append(f"   Status: {port.status.value}")

            if port.missing_documents:
                lines.append(f"   Missing: {len(port.missing_documents)} documents")
            if port.expired_documents:
                lines.append(f"   Expired: {len(port.expired_documents)} documents")
            if port.risk_factors:
                for risk in port.risk_factors:
                    lines.append(f"   ! {risk}")

        if missing_docs:
            lines.append("\n" + "=" * 50)
            lines.append("\nMISSING DOCUMENTS")
            lines.append("-" * 30)
            for doc in missing_docs:
                ports_str = ", ".join(doc.get("ports", []))
                lines.append(f"- {doc['document_type']}: Required at {ports_str}")

        if expired_docs:
            lines.append("\n" + "=" * 50)
            lines.append("\nEXPIRED DOCUMENTS")
            lines.append("-" * 30)
            for doc in expired_docs:
                lines.append(f"- {doc['document_type']}")

        lines.append("\n" + "=" * 50)
        lines.append("\nRECOMMENDATIONS")
        lines.append("-" * 30)
        for i, rec in enumerate(recommendations, 1):
            lines.append(f"{i}. {rec}")

        return "\n".join(lines)
