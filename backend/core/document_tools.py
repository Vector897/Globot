"""
CrewAI Tools for Document Processing
Tools for classifying documents, extracting metadata, and checking requirements
"""
import logging
import json
import re
from datetime import datetime, date
from typing import Optional, List, Dict, Any, ClassVar

logger = logging.getLogger(__name__)

# Try to import CrewAI tools
try:
    from crewai.tools import BaseTool
    from pydantic import Field
    HAS_CREWAI = True
except ImportError:
    HAS_CREWAI = False
    logger.warning("crewai not found. Document tools will not be available.")

    # Mock BaseTool for when crewai is not installed
    class BaseTool:
        name: str = ""
        description: str = ""

        def _run(self, *args, **kwargs):
            raise NotImplementedError


# Maritime document type constants
DOCUMENT_TYPES = {
    "safety_management_certificate": ["ISM", "SMC", "Safety Management Certificate"],
    "safety_construction_certificate": ["SOLAS", "Safety Construction", "Cargo Ship Safety Construction"],
    "safety_equipment_certificate": ["Safety Equipment", "Cargo Ship Safety Equipment"],
    "safety_radio_certificate": ["Safety Radio", "Cargo Ship Safety Radio"],
    "load_line_certificate": ["Load Line", "International Load Line", "ILL"],
    "tonnage_certificate": ["Tonnage", "International Tonnage", "ITC"],
    "iopp_certificate": ["IOPP", "Oil Pollution Prevention", "MARPOL Annex I"],
    "ispp_certificate": ["ISPP", "Sewage Pollution Prevention", "MARPOL Annex IV"],
    "iapp_certificate": ["IAPP", "Air Pollution Prevention", "MARPOL Annex VI"],
    "civil_liability_certificate": ["CLC", "Civil Liability", "Bunker Convention"],
    "isps_certificate": ["ISPS", "Security", "International Ship Security"],
    "mlc_certificate": ["MLC", "Maritime Labour Convention", "DMLC"],
    "continuous_synopsis_record": ["CSR", "Continuous Synopsis Record"],
    "registry_certificate": ["Registry", "Certificate of Registry", "Flag State"],
    "minimum_safe_manning": ["Safe Manning", "Minimum Safe Manning", "MSM"],
    "stcw_certificate": ["STCW", "Seafarer", "Competency Certificate"],
}


def classify_document_from_text(text: str) -> str:
    """
    Classify a maritime document type from text using keyword matching.

    Args:
        text: Text to analyze (OCR text, title, filename, etc.)

    Returns:
        The best-matching document type key from DOCUMENT_TYPES,
        or "unknown" if no match is found.
    """
    if not text:
        return "unknown"
    text_upper = text.upper()
    best_type = "unknown"
    best_score = 0
    for doc_type, keywords in DOCUMENT_TYPES.items():
        score = sum(1 for kw in keywords if kw.upper() in text_upper)
        if score > best_score:
            best_score = score
            best_type = doc_type
    return best_type


if HAS_CREWAI:
    from services.maritime_knowledge_base import get_maritime_knowledge_base

    class DocumentClassifierTool(BaseTool):
        """Tool for classifying document types from extracted text"""

        name: str = "document_classifier"
        description: str = """
        Classify a maritime document based on its OCR-extracted text content.

        Input: document_text - The OCR-extracted text from the document

        Returns the document type classification with confidence score.
        Supported types include:
        - Safety certificates (SMC, Construction, Equipment, Radio)
        - Load Line Certificate
        - MARPOL certificates (IOPP, ISPP, IAPP)
        - ISPS Certificate
        - MLC Certificate
        - Registry Certificate
        - And more maritime certificates
        """

        def _run(self, document_text: str) -> str:
            """Classify the document based on text content"""
            try:
                text_upper = document_text.upper()

                matches = []
                for doc_type, keywords in DOCUMENT_TYPES.items():
                    score = 0
                    matched_keywords = []
                    for keyword in keywords:
                        if keyword.upper() in text_upper:
                            score += 1
                            matched_keywords.append(keyword)

                    if score > 0:
                        matches.append({
                            "document_type": doc_type,
                            "score": score,
                            "matched_keywords": matched_keywords
                        })

                # Sort by score descending
                matches.sort(key=lambda x: x["score"], reverse=True)

                if matches:
                    best_match = matches[0]
                    confidence = min(best_match["score"] / len(DOCUMENT_TYPES[best_match["document_type"]]), 1.0)

                    result = {
                        "classification": best_match["document_type"],
                        "confidence": round(confidence, 2),
                        "matched_keywords": best_match["matched_keywords"],
                        "alternative_matches": [
                            {"type": m["document_type"], "score": m["score"]}
                            for m in matches[1:3]  # Top 2 alternatives
                        ]
                    }
                    return json.dumps(result, indent=2)
                else:
                    return json.dumps({
                        "classification": "unknown",
                        "confidence": 0.0,
                        "message": "Could not classify document. No matching keywords found."
                    })

            except Exception as e:
                logger.error(f"DocumentClassifierTool error: {e}")
                return json.dumps({"error": str(e)})


    class MetadataExtractorTool(BaseTool):
        """Tool for extracting structured metadata from document text"""

        name: str = "metadata_extractor"
        description: str = """
        Extract structured metadata fields from document OCR text.

        Input: document_text - The OCR-extracted text from the document

        Extracts:
        - Document number
        - Issue date
        - Expiry date
        - Vessel name
        - IMO number
        - Flag state
        - Issuing authority
        - Gross tonnage
        """

        # Regex patterns for field extraction
        PATTERNS: ClassVar[Dict[str, List[str]]] = {
            "document_number": [
                r"(?:Certificate|Doc(?:ument)?)\s*(?:No\.?|Number|#)\s*[:.]?\s*([A-Z0-9\-/]+)",
                r"(?:No\.?|Number)\s*[:.]?\s*([A-Z0-9\-/]{5,})",
            ],
            "imo_number": [
                r"IMO\s*(?:No\.?|Number)?\s*[:.]?\s*(\d{7})",
                r"IMO\s*(\d{7})",
            ],
            "vessel_name": [
                r"(?:Vessel|Ship)\s*(?:Name)?\s*[:.]?\s*[\"']?([A-Z][A-Z\s\-\.]+)[\"']?",
                r"M/?V\s+([A-Z][A-Z\s\-\.]+)",
            ],
            "issue_date": [
                r"(?:Issue|Issued)\s*(?:Date)?\s*[:.]?\s*(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})",
                r"(?:Date\s+(?:of\s+)?Issue)\s*[:.]?\s*(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})",
            ],
            "expiry_date": [
                r"(?:Expir(?:y|es)|Valid\s+(?:Until|To))\s*(?:Date)?\s*[:.]?\s*(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})",
                r"(?:Valid\s+Until|Expires)\s*[:.]?\s*(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})",
            ],
            "flag_state": [
                r"(?:Flag|Flag\s+State|Registry)\s*[:.]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
                r"(?:Registered\s+(?:at|in))\s*[:.]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
            ],
            "issuing_authority": [
                r"(?:Issued\s+by|Issuing\s+Authority|Authority)\s*[:.]?\s*(.+?)(?:\n|$)",
            ],
            "gross_tonnage": [
                r"(?:Gross\s+Tonnage|GT)\s*[:.]?\s*([\d,]+(?:\.\d+)?)",
            ],
        }

        def _run(self, document_text: str) -> str:
            """Extract metadata from document text"""
            try:
                extracted = {}

                for field, patterns in self.PATTERNS.items():
                    for pattern in patterns:
                        match = re.search(pattern, document_text, re.IGNORECASE | re.MULTILINE)
                        if match:
                            value = match.group(1).strip()
                            extracted[field] = value
                            break

                # Parse and validate dates
                for date_field in ["issue_date", "expiry_date"]:
                    if date_field in extracted:
                        try:
                            date_str = extracted[date_field]
                            # Try common date formats
                            for fmt in ["%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y",
                                       "%m/%d/%Y", "%Y-%m-%d", "%d/%m/%y"]:
                                try:
                                    parsed = datetime.strptime(date_str, fmt)
                                    extracted[date_field] = parsed.strftime("%Y-%m-%d")
                                    break
                                except ValueError:
                                    continue
                        except Exception:
                            pass  # Keep original string if parsing fails

                # Calculate days until expiry if we have expiry date
                if "expiry_date" in extracted:
                    try:
                        expiry = datetime.strptime(extracted["expiry_date"], "%Y-%m-%d").date()
                        today = date.today()
                        days_until_expiry = (expiry - today).days
                        extracted["days_until_expiry"] = days_until_expiry
                        extracted["is_expired"] = days_until_expiry < 0
                        extracted["expiring_soon"] = 0 <= days_until_expiry <= 30
                    except Exception:
                        pass

                # Clean up vessel name
                if "vessel_name" in extracted:
                    extracted["vessel_name"] = extracted["vessel_name"].strip().title()

                # Validate IMO number (should be 7 digits)
                if "imo_number" in extracted:
                    imo = extracted["imo_number"]
                    if not (imo.isdigit() and len(imo) == 7):
                        del extracted["imo_number"]  # Invalid, remove it

                result = {
                    "extracted_fields": extracted,
                    "fields_found": len(extracted),
                    "confidence": "high" if len(extracted) >= 4 else "medium" if len(extracted) >= 2 else "low"
                }

                return json.dumps(result, indent=2)

            except Exception as e:
                logger.error(f"MetadataExtractorTool error: {e}")
                return json.dumps({"error": str(e)})


    class RequirementsLookupTool(BaseTool):
        """Tool for looking up document requirements based on context"""

        name: str = "requirements_lookup"
        description: str = """
        Look up required documents for a vessel based on vessel type, flag state, and destination ports.

        Input:
        - vessel_type: Type of vessel (e.g., "container", "tanker", "bulk_carrier")
        - flag_state: Vessel's flag state (e.g., "Panama", "Liberia", "Singapore")
        - port_codes_json: JSON array of destination port codes (e.g., '["SGSIN", "NLRTM"]')

        Returns a comprehensive list of required documents for the voyage.
        """

        def _run(
            self,
            vessel_type: str,
            flag_state: str,
            port_codes_json: str
        ) -> str:
            """Look up document requirements"""
            try:
                port_codes = json.loads(port_codes_json)
                kb = get_maritime_knowledge_base()

                # Collect all requirements
                all_requirements = {}

                # Get requirements for each port
                for port_code in port_codes:
                    required_docs = kb.search_required_documents(port_code, vessel_type)

                    for doc in required_docs:
                        doc_type = doc["document_type"]
                        if doc_type not in all_requirements:
                            all_requirements[doc_type] = {
                                "document_type": doc_type,
                                "required_by_ports": [],
                                "regulation_sources": set(),
                                "description": doc.get("description", "")
                            }
                        all_requirements[doc_type]["required_by_ports"].append(port_code)
                        all_requirements[doc_type]["regulation_sources"].add(
                            doc.get("regulation_source", "Unknown")
                        )

                # Add mandatory IMO certificates
                mandatory_certs = [
                    "safety_management_certificate",
                    "safety_construction_certificate",
                    "safety_equipment_certificate",
                    "safety_radio_certificate",
                    "load_line_certificate",
                    "tonnage_certificate",
                    "iopp_certificate",
                    "civil_liability_certificate",
                    "isps_certificate",
                    "registry_certificate",
                    "minimum_safe_manning",
                ]

                for cert in mandatory_certs:
                    if cert not in all_requirements:
                        all_requirements[cert] = {
                            "document_type": cert,
                            "required_by_ports": ["ALL"],
                            "regulation_sources": {"IMO Conventions"},
                            "description": "Mandatory for international voyages"
                        }

                # Format output
                result = {
                    "vessel_context": {
                        "vessel_type": vessel_type,
                        "flag_state": flag_state,
                        "ports": port_codes
                    },
                    "total_required_documents": len(all_requirements),
                    "requirements": [
                        {
                            "document_type": req["document_type"],
                            "required_by_ports": req["required_by_ports"],
                            "regulation_sources": list(req["regulation_sources"]),
                            "description": req["description"][:200] if req["description"] else ""
                        }
                        for req in all_requirements.values()
                    ]
                }

                return json.dumps(result, indent=2)

            except json.JSONDecodeError as e:
                return json.dumps({"error": f"Invalid JSON for port_codes: {str(e)}"})
            except Exception as e:
                logger.error(f"RequirementsLookupTool error: {e}")
                return json.dumps({"error": str(e)})


    class SemanticDocumentMatchTool(BaseTool):
        """Batch semantic search: check all missing documents in one call"""

        name: str = "semantic_document_search"
        description: str = """
        Search the vessel's stored documents using semantic (embedding) similarity
        to check whether each missing document actually exists on file.

        THIS IS A BATCH TOOL — pass ALL missing documents at once.

        Input:
        - missing_documents_json: A JSON array of document type strings to check,
            e.g. '["Safety Management Certificate", "Load Line Certificate"]'
        - vessel_id: The vessel ID to scope the search (integer).
            Use 0 if no vessel_id is available.
        - customer_id: The customer ID to scope the search (integer).
            Use 0 if no customer_id is available.
            At least one of vessel_id or customer_id must be non-zero.

        Returns a JSON object with results for each document:
        {
          "results": [
            {
              "document_type": "Safety Management Certificate",
              "matched": true,
              "matched_title": "ISM_SMC_Certificate.pdf",
              "expiry_date": "2026-05-15"
            },
            ...
          ],
          "matched_count": 3,
          "still_missing_count": 5
        }
        """

        def _run(
            self,
            missing_documents_json: str,
            vessel_id: int = 0,
            customer_id: int = 0,
        ) -> str:
            """Batch check missing documents by semantic similarity"""
            try:
                missing_types = json.loads(missing_documents_json)
                if isinstance(missing_types, dict):
                    missing_types = missing_types.get("missing_documents", [])
                if isinstance(missing_types, list) and missing_types and isinstance(missing_types[0], dict):
                    missing_types = [d.get("document_type", "") for d in missing_types]
                missing_types = [t for t in missing_types if t]

                if not missing_types:
                    return json.dumps({"results": [], "matched_count": 0, "still_missing_count": 0})

                kb = get_maritime_knowledge_base()

                # Build the ChromaDB where filter
                where_filter = None
                vid = int(vessel_id)
                cid = int(customer_id)
                if vid and vid > 0:
                    where_filter = {"vessel_id": vid}
                elif cid and cid > 0:
                    where_filter = {"customer_id": cid}

                results_out = []
                matched_count = 0

                for doc_type_name in missing_types:
                    # Resolve canonical key for the required type
                    required_key = doc_type_name
                    if required_key not in DOCUMENT_TYPES:
                        c = classify_document_from_text(required_key)
                        if c != "unknown":
                            required_key = c
                        else:
                            required_key = required_key.lower().replace(" ", "_").replace("'", "")

                    search_results = kb.search_user_documents(
                        query_text=doc_type_name,
                        where_filter=where_filter,
                        n_results=1,
                    )

                    if not search_results:
                        results_out.append({
                            "document_type": doc_type_name,
                            "matched": False,
                            "reason": "no_stored_documents",
                        })
                        continue

                    best = search_results[0]
                    score = best.get("score", float("inf"))

                    # Resolve canonical key for the stored document
                    stored_type = best.get("document_type", "")
                    stored_title = best.get("title", "")
                    if stored_type not in ("other", "unknown", ""):
                        stored_key = stored_type
                        if stored_key not in DOCUMENT_TYPES:
                            c = classify_document_from_text(stored_key)
                            stored_key = c if c != "unknown" else stored_key.lower().replace(" ", "_").replace("'", "")
                    else:
                        c = classify_document_from_text(stored_title)
                        stored_key = c if c != "unknown" else "other"

                    is_match = (stored_key == required_key) and score <= 0.6

                    entry = {
                        "document_type": doc_type_name,
                        "matched": is_match,
                        "matched_title": stored_title if is_match else None,
                        "expiry_date": best.get("expiry_date") if is_match else None,
                        "score": round(score, 4),
                        "stored_key": stored_key,
                        "required_key": required_key,
                    }
                    if not is_match:
                        entry["reason"] = "type_mismatch" if score <= 0.6 else "low_similarity"
                    results_out.append(entry)
                    if is_match:
                        matched_count += 1

                return json.dumps({
                    "results": results_out,
                    "matched_count": matched_count,
                    "still_missing_count": len(missing_types) - matched_count,
                }, indent=2)

            except Exception as e:
                logger.error(f"SemanticDocumentMatchTool error: {e}")
                return json.dumps({"error": str(e), "results": [], "matched_count": 0})


    class DocumentComparisonTool(BaseTool):
        """Tool for comparing user documents against requirements"""

        name: str = "document_comparison"
        description: str = """
        Compare a vessel's documents against a list of requirements to identify gaps.

        Input:
        - user_documents_json: JSON array of user's documents with fields:
            [{"document_type": "...", "expiry_date": "YYYY-MM-DD", ...}, ...]
        - required_documents_json: JSON array of required document types:
            ["safety_management_certificate", "load_line_certificate", ...]

        Returns a gap analysis showing:
        - Valid documents (present and not expired)
        - Expired documents
        - Expiring soon (within 30 days)
        - Missing documents
        - Compliance score
        """

        def _run(
            self,
            user_documents_json: str,
            required_documents_json: str
        ) -> str:
            """Compare documents against requirements"""
            try:
                user_docs = json.loads(user_documents_json)
                required_types = json.loads(required_documents_json)

                # Normalize required_types: the LLM may pass a dict wrapper or list of dicts
                if isinstance(required_types, dict):
                    required_types = required_types.get("required_documents", required_types.get("requirements", []))
                if isinstance(required_types, list) and required_types and isinstance(required_types[0], dict):
                    required_types = [item.get("document_type", "") for item in required_types if isinstance(item, dict)]
                required_types = [t for t in required_types if t]

                # Normalize required type names to canonical snake_case keys.
                # The knowledge base returns human-readable names like
                # "Ship's Registry Certificate" while user docs are classified
                # to keys like "registry_certificate". Map both sides to the
                # same namespace so comparisons work.
                normalized_required = []
                original_names = {}  # canonical_key -> original display name
                for rt in required_types:
                    # If already a canonical key, keep it
                    if rt in DOCUMENT_TYPES:
                        normalized_required.append(rt)
                        original_names.setdefault(rt, rt)
                    else:
                        canonical = classify_document_from_text(rt)
                        if canonical != "unknown":
                            normalized_required.append(canonical)
                            original_names.setdefault(canonical, rt)
                        else:
                            # Keep original string as-is for unrecognized types
                            normalized_required.append(rt)
                            original_names.setdefault(rt, rt)
                # Deduplicate while preserving order
                seen = set()
                deduped = []
                for rt in normalized_required:
                    if rt not in seen:
                        seen.add(rt)
                        deduped.append(rt)
                required_types = deduped

                today = date.today()

                # Categorize user documents
                valid_docs = []
                expired_docs = []
                expiring_soon_docs = []

                user_doc_types = set()

                for doc in user_docs:
                    raw_type = doc.get("document_type", "")
                    title = doc.get("title", "")

                    # Resolve actual type: normalize to canonical key
                    if raw_type and raw_type in DOCUMENT_TYPES:
                        # Already a canonical key
                        doc_type = raw_type
                    elif raw_type and raw_type not in ("other", "unknown", ""):
                        # Human-readable name — try to map to canonical key
                        canonical = classify_document_from_text(raw_type)
                        doc_type = canonical if canonical != "unknown" else raw_type
                    else:
                        # "other"/"unknown"/empty — infer from title
                        inferred = classify_document_from_text(title)
                        doc_type = inferred if inferred != "unknown" else (raw_type or "other")

                    user_doc_types.add(doc_type)

                    expiry_str = doc.get("expiry_date")
                    if expiry_str:
                        try:
                            expiry = datetime.strptime(expiry_str, "%Y-%m-%d").date()
                            days_until = (expiry - today).days

                            doc_info = {
                                "document_type": doc_type,
                                "title": title,
                                "expiry_date": expiry_str,
                                "days_until_expiry": days_until
                            }

                            if days_until < 0:
                                doc_info["status"] = "expired"
                                expired_docs.append(doc_info)
                            elif days_until <= 30:
                                doc_info["status"] = "expiring_soon"
                                expiring_soon_docs.append(doc_info)
                            else:
                                doc_info["status"] = "valid"
                                valid_docs.append(doc_info)
                        except ValueError:
                            # Date parsing failed, assume valid
                            valid_docs.append({
                                "document_type": doc_type,
                                "title": title,
                                "status": "valid",
                                "note": "Could not parse expiry date"
                            })
                    else:
                        # No expiry date, assume valid
                        valid_docs.append({
                            "document_type": doc_type,
                            "title": title,
                            "status": "valid",
                            "note": "No expiry date"
                        })

                # Find missing documents
                required_set = set(required_types)
                valid_types = set(d["document_type"] for d in valid_docs)
                expiring_types = set(d["document_type"] for d in expiring_soon_docs)
                expired_types = set(d["document_type"] for d in expired_docs)

                missing_types = required_set - user_doc_types
                missing_docs = [{"document_type": t, "status": "missing"} for t in missing_types]

                # Calculate compliance score
                # Valid = 100%, Expiring = 80%, Expired = 0%, Missing = 0%
                total_required = len(required_set)
                if total_required > 0:
                    valid_count = len(required_set & valid_types)
                    expiring_count = len(required_set & expiring_types)

                    score = ((valid_count * 100) + (expiring_count * 80)) / total_required
                else:
                    score = 100

                result = {
                    "gap_analysis": {
                        "valid_documents": valid_docs,
                        "expiring_soon_documents": expiring_soon_docs,
                        "expired_documents": expired_docs,
                        "missing_documents": missing_docs
                    },
                    "summary": {
                        "total_required": total_required,
                        "valid_count": len(valid_docs),
                        "expiring_soon_count": len(expiring_soon_docs),
                        "expired_count": len(expired_docs),
                        "missing_count": len(missing_docs),
                        "compliance_score": round(score, 1)
                    },
                    "recommendations": []
                }

                # Generate recommendations
                if expired_docs:
                    result["recommendations"].append({
                        "priority": "critical",
                        "action": f"Renew {len(expired_docs)} expired document(s) immediately",
                        "documents": [d["document_type"] for d in expired_docs]
                    })

                if expiring_soon_docs:
                    result["recommendations"].append({
                        "priority": "high",
                        "action": f"Schedule renewal for {len(expiring_soon_docs)} document(s) expiring within 30 days",
                        "documents": [d["document_type"] for d in expiring_soon_docs]
                    })

                if missing_docs:
                    result["recommendations"].append({
                        "priority": "critical",
                        "action": f"Obtain {len(missing_docs)} missing document(s)",
                        "documents": [d["document_type"] for d in missing_docs]
                    })

                return json.dumps(result, indent=2)

            except json.JSONDecodeError as e:
                return json.dumps({"error": f"Invalid JSON input: {str(e)}"})
            except Exception as e:
                logger.error(f"DocumentComparisonTool error: {e}")
                return json.dumps({"error": str(e)})


def get_document_tools() -> List[Any]:
    """Get list of all document processing tools for CrewAI"""
    if not HAS_CREWAI:
        logger.warning("CrewAI not available. Returning empty tools list.")
        return []

    return [
        DocumentClassifierTool(),
        MetadataExtractorTool(),
        RequirementsLookupTool(),
        DocumentComparisonTool(),
        SemanticDocumentMatchTool(),
    ]
