"""
Custom CrewAI Tools for Maritime Compliance
Tools for querying maritime regulations, port info, and documents
"""
import logging
import json
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

# Try to import CrewAI tools
try:
    from crewai.tools import BaseTool
    from pydantic import Field
    HAS_CREWAI = True
except ImportError:
    HAS_CREWAI = False
    logger.warning("crewai not found. Maritime tools will not be available.")

    # Mock BaseTool for when crewai is not installed
    class BaseTool:
        name: str = ""
        description: str = ""

        def _run(self, *args, **kwargs):
            raise NotImplementedError


if HAS_CREWAI:
    from services.maritime_knowledge_base import get_maritime_knowledge_base
    from services.compliance_service import ComplianceService

    class MaritimeRAGTool(BaseTool):
        """Tool for querying maritime regulations knowledge base"""

        name: str = "maritime_regulations_search"
        description: str = """
        Search the maritime regulations knowledge base for laws, conventions, and requirements.

        Use this tool to find:
        - IMO convention requirements (SOLAS, MARPOL, STCW, etc.)
        - Port State Control requirements
        - Port-specific regulations
        - Regional requirements (EU, US, etc.)
        - Required documents for vessels

        Input should be a search query describing what regulations you need.
        You can optionally filter by port_code, region, regulation_type, or vessel_type.

        Example queries:
        - "SOLAS fire safety requirements for container vessels"
        - "Port requirements for Rotterdam"
        - "MARPOL Annex VI emission requirements in ECA zones"
        """

        def _run(
            self,
            query: str,
            port_code: Optional[str] = None,
            region: Optional[str] = None,
            regulation_type: Optional[str] = None,
            vessel_type: Optional[str] = None,
            top_k: int = 5
        ) -> str:
            """Execute the search"""
            try:
                kb = get_maritime_knowledge_base()

                # Build filters
                filters = {}
                if port_code:
                    filters["port_code"] = port_code
                if region:
                    filters["region"] = region
                if regulation_type:
                    filters["regulation_type"] = regulation_type
                if vessel_type:
                    filters["vessel_type"] = vessel_type

                # Search
                results = kb.search_general(
                    query=query,
                    filters=filters if filters else None,
                    top_k=top_k
                )

                if not results:
                    return "No regulations found matching your query."

                # Format results
                output_lines = [f"Found {len(results)} relevant regulations:\n"]

                for i, result in enumerate(results, 1):
                    source = result.metadata.get("source_convention", result.source)
                    output_lines.append(f"[{i}] Source: {source}")
                    output_lines.append(f"    Content: {result.content[:300]}...")
                    if result.metadata:
                        meta_str = ", ".join(f"{k}={v}" for k, v in result.metadata.items()
                                             if k not in ["source_convention"])
                        if meta_str:
                            output_lines.append(f"    Metadata: {meta_str}")
                    output_lines.append("")

                return "\n".join(output_lines)

            except Exception as e:
                logger.error(f"MaritimeRAGTool error: {e}")
                return f"Error searching regulations: {str(e)}"


    class PortInfoTool(BaseTool):
        """Tool for getting port information and requirements"""

        name: str = "port_info"
        description: str = """
        Get detailed information about a specific port including:
        - Port State Control regime (Paris MOU, Tokyo MOU, etc.)
        - Required documents for port entry
        - ECA (Emission Control Area) status
        - Special requirements and regulations
        - Advance notification requirements

        Input: port_code (UN/LOCODE format, e.g., "NLRTM" for Rotterdam, "SGSIN" for Singapore)
        Optional: vessel_type to filter applicable requirements
        """

        def _run(
            self,
            port_code: str,
            vessel_type: Optional[str] = None
        ) -> str:
            """Get port information"""
            try:
                kb = get_maritime_knowledge_base()

                # Search for port-specific info
                port_results = kb.search_by_port(
                    port_code=port_code,
                    vessel_type=vessel_type,
                    top_k=10
                )

                # Get required documents
                required_docs = kb.search_required_documents(
                    port_code=port_code,
                    vessel_type=vessel_type or "container"
                )

                # Format output
                output_lines = [f"PORT INFORMATION: {port_code}\n"]
                output_lines.append("=" * 40)

                # Port regulations
                output_lines.append("\nAPPLICABLE REGULATIONS:")
                if port_results:
                    for result in port_results[:5]:
                        output_lines.append(f"- {result.content[:200]}...")
                        output_lines.append(f"  (Source: {result.metadata.get('source', result.source)})")
                else:
                    output_lines.append("- No specific regulations found in database")

                # Required documents
                output_lines.append("\nREQUIRED DOCUMENTS:")
                if required_docs:
                    for doc in required_docs[:10]:
                        output_lines.append(f"- {doc['document_type']}: {doc.get('description', '')[:100]}")
                        output_lines.append(f"  (Regulation: {doc.get('regulation_source', 'Unknown')})")
                else:
                    output_lines.append("- Standard SOLAS/MARPOL certificates required")

                return "\n".join(output_lines)

            except Exception as e:
                logger.error(f"PortInfoTool error: {e}")
                return f"Error getting port info: {str(e)}"


    class DocumentCheckTool(BaseTool):
        """Tool for checking document compliance"""

        name: str = "document_check"
        description: str = """
        Check what documents a vessel has and identify gaps.

        Input: vessel_documents_json - JSON string with vessel's documents
               required_documents_json - JSON array of required document types

        Returns comparison showing which documents are available, missing, or expired.
        """

        def _run(
            self,
            vessel_documents_json: str,
            required_documents_json: str
        ) -> str:
            """Check documents against requirements"""
            try:
                vessel_docs = json.loads(vessel_documents_json)
                required_docs = json.loads(required_documents_json)

                # Build document type set from vessel docs
                available_types = set()
                expired_types = set()

                for doc in vessel_docs:
                    doc_type = doc.get("document_type", "")
                    is_expired = doc.get("is_expired", False)

                    if is_expired:
                        expired_types.add(doc_type)
                    else:
                        available_types.add(doc_type)

                # Compare against requirements
                required_set = set(required_docs)
                missing = required_set - available_types - expired_types
                expired = required_set & expired_types
                compliant = required_set & available_types

                # Format output
                output_lines = ["DOCUMENT COMPLIANCE CHECK\n"]
                output_lines.append("=" * 40)

                output_lines.append(f"\nCOMPLIANT ({len(compliant)}):")
                for doc in sorted(compliant):
                    output_lines.append(f"  [OK] {doc}")

                if expired:
                    output_lines.append(f"\nEXPIRED ({len(expired)}):")
                    for doc in sorted(expired):
                        output_lines.append(f"  [EXPIRED] {doc}")

                if missing:
                    output_lines.append(f"\nMISSING ({len(missing)}):")
                    for doc in sorted(missing):
                        output_lines.append(f"  [MISSING] {doc}")

                # Summary
                total = len(required_set)
                score = (len(compliant) / total * 100) if total > 0 else 0
                output_lines.append(f"\nCompliance Score: {score:.1f}%")

                return "\n".join(output_lines)

            except json.JSONDecodeError as e:
                return f"Error parsing JSON input: {str(e)}"
            except Exception as e:
                logger.error(f"DocumentCheckTool error: {e}")
                return f"Error checking documents: {str(e)}"


    class RouteAnalysisTool(BaseTool):
        """Tool for analyzing route compliance"""

        name: str = "route_analysis"
        description: str = """
        Analyze a shipping route to identify all applicable regulations and requirements.

        Input:
        - route_ports_json: JSON array of port codes in route order (e.g., ["CNSHA", "SGSIN", "NLRTM"])
        - vessel_type: Type of vessel (container, tanker, bulk_carrier, etc.)

        Returns analysis of requirements for each port on the route.
        """

        def _run(
            self,
            route_ports_json: str,
            vessel_type: str = "container"
        ) -> str:
            """Analyze route compliance"""
            try:
                port_codes = json.loads(route_ports_json)

                if not port_codes:
                    return "No ports provided in route"

                kb = get_maritime_knowledge_base()

                # Analyze each port
                output_lines = [f"ROUTE ANALYSIS: {' -> '.join(port_codes)}\n"]
                output_lines.append(f"Vessel Type: {vessel_type}")
                output_lines.append("=" * 50)

                all_requirements = set()

                for port_code in port_codes:
                    output_lines.append(f"\n--- {port_code} ---")

                    # Get port requirements
                    port_results = kb.search_by_port(port_code, vessel_type, top_k=3)
                    required_docs = kb.search_required_documents(port_code, vessel_type)

                    if port_results:
                        output_lines.append("Regulations:")
                        for result in port_results[:2]:
                            output_lines.append(f"  - {result.content[:150]}...")

                    if required_docs:
                        output_lines.append("Required Documents:")
                        for doc in required_docs[:5]:
                            output_lines.append(f"  - {doc['document_type']}")
                            all_requirements.add(doc['document_type'])

                # Summary of all unique requirements
                output_lines.append("\n" + "=" * 50)
                output_lines.append("SUMMARY: All Required Documents for Route")
                output_lines.append("-" * 50)
                for req in sorted(all_requirements):
                    output_lines.append(f"  - {req}")

                return "\n".join(output_lines)

            except json.JSONDecodeError as e:
                return f"Error parsing route ports JSON: {str(e)}"
            except Exception as e:
                logger.error(f"RouteAnalysisTool error: {e}")
                return f"Error analyzing route: {str(e)}"


def get_maritime_tools() -> List[Any]:
    """Get list of all maritime tools for CrewAI"""
    if not HAS_CREWAI:
        logger.warning("CrewAI not available. Returning empty tools list.")
        return []

    return [
        MaritimeRAGTool(),
        PortInfoTool(),
        DocumentCheckTool(),
        RouteAnalysisTool(),
    ]
