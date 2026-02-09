"""
Maritime Knowledge Base Service - RAG for maritime regulations
Uses ChromaDB for vector storage with Gemini embeddings
"""
import logging
import json
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from config import get_settings
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document
from sentence_transformers import CrossEncoder

logger = logging.getLogger(__name__)
settings = get_settings()
DEBUG_LOG_PATH = "/Users/timothylin/Globot/.cursor/debug.log"


def _debug_log(run_id: str, hypothesis_id: str, location: str, message: str, data: Dict[str, Any]) -> None:
    try:
        payload = {
            "runId": run_id,
            "hypothesisId": hypothesis_id,
            "location": location,
            "message": message,
            "data": data,
            "timestamp": __import__("time").time_ns() // 1_000_000,
        }
        with open(DEBUG_LOG_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(payload, ensure_ascii=True) + "\n")
    except Exception:
        pass


@dataclass
class SearchResult:
    """Search result with metadata"""
    content: str
    metadata: Dict[str, Any]
    score: float = 0.0
    source: str = ""


class MaritimeKnowledgeBase:
    """
    Maritime Law/Regulation RAG Knowledge Base

    Collections:
    - imo_conventions: SOLAS, MARPOL, STCW, etc.
    - psc_requirements: Port State Control requirements
    - port_regulations: Port-specific rules
    - regional_requirements: EU MRV, US CFR, etc.
    - customs_documentation: Customs requirements
    """

    COLLECTIONS = {
        "imo_conventions": "IMO conventions (SOLAS, MARPOL, STCW, etc.)",
        "psc_requirements": "Port State Control requirements",
        "port_regulations": "Port-specific regulations",
        "regional_requirements": "Regional requirements (EU MRV, US CFR, etc.)",
        "customs_documentation": "Customs and documentation requirements",
        "user_documents": "User-uploaded certificates and permits",
    }

    def __init__(self):
        """Initialize the Maritime Knowledge Base with Gemini embeddings."""
        self.collections: Dict[str, Chroma] = {}
        self.reranker = None
        self.bm25_indices: Dict[str, Any] = {}
        self.doc_maps: Dict[str, Dict[str, Document]] = {}
        
        # Initialize Gemini embeddings
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-001",
            google_api_key=settings.google_api_key
        )
        # region agent log
        _debug_log(
            "pre-fix",
            "H2",
            "maritime_knowledge_base.py:__init__",
            "Embeddings object created",
            {
                "embeddings_class": type(self.embeddings).__name__,
                "embeddings_model_attr": str(getattr(self.embeddings, "model", None)),
                "has_client_attr": hasattr(self.embeddings, "client"),
            },
        )
        # endregion

        # Create a Chroma collection for each defined collection
        for collection_name in self.COLLECTIONS.keys():
            self.collections[collection_name] = Chroma(
                collection_name=collection_name,
                embedding_function=self.embeddings,
                chroma_cloud_api_key=settings.chroma_api_key,
                tenant=settings.chroma_tenant,
                database=settings.chroma_database,
            )
            logger.info(f"Initialized collection: {collection_name}")

        # Initialize cross-encoder reranker
        self.reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')


    def search_by_port(
        self,
        port_code: str,
        vessel_type: Optional[str] = None,
        top_k: int = 10
    ) -> List[SearchResult]:
        """
        Search regulations applicable to a specific port

        Args:
            port_code: UN/LOCODE of the port
            vessel_type: Optional vessel type filter
            top_k: Number of results to return
        """
        # Build query and filters
        query = f"Port requirements regulations for port {port_code}"
        filters = {"port_code": port_code}
        if vessel_type:
            filters["vessel_type"] = vessel_type

        # Search across relevant collections
        results = []
        for collection_name in ["port_regulations", "psc_requirements", "customs_documentation"]:
            collection = self.collections.get(collection_name)
            if collection:
                try:
                    docs = collection.similarity_search_with_score(
                        query,
                        k=top_k,
                        filter=filters if self._collection_supports_filter(collection) else None
                    )
                    for doc, score in docs:
                        results.append(SearchResult(
                            content=doc.page_content,
                            metadata=doc.metadata,
                            score=score,
                            source=collection_name
                        ))
                except Exception as e:
                    logger.error(f"Error searching {collection_name}: {e}")

        # Sort by score and return top_k
        results.sort(key=lambda x: x.score, reverse=True)
        return results[:top_k]

    def search_by_route(
        self,
        port_codes: List[str],
        vessel_info: Dict[str, Any],
        top_k_per_port: int = 5
    ) -> Dict[str, List[SearchResult]]:
        """
        Search regulations for an entire route

        Args:
            port_codes: List of UN/LOCODE port codes in route order
            vessel_info: Dict with vessel_type, gross_tonnage, flag_state
            top_k_per_port: Number of results per port

        Returns:
            Dict mapping port_code to list of applicable regulations
        """
        route_results = {}
        vessel_type = vessel_info.get("vessel_type")

        for port_code in port_codes:
            port_results = self.search_by_port(port_code, vessel_type, top_k_per_port)

            # Also search for regional requirements based on port's region
            regional_results = self.search_regional_requirements(
                port_code, vessel_info, top_k=3
            )

            route_results[port_code] = port_results + regional_results

        return route_results

    def search_required_documents(
        self,
        port_code: str,
        vessel_type: str
    ) -> List[Dict[str, Any]]:
        """
        Get list of required documents for a port call

        Returns list of dicts with document_type, regulation_source, description
        """
        query = f"Required documents certificates for {vessel_type} vessel at port {port_code}"

        results = []
        for collection_name in self.COLLECTIONS.keys():
            collection = self.collections.get(collection_name)
            if collection:
                try:
                    docs = collection.similarity_search(query, k=5)
                    for doc in docs:
                        if "required_documents" in doc.metadata:
                            req_docs = doc.metadata.get("required_documents", [])
                            if isinstance(req_docs, str):
                                req_docs = json.loads(req_docs)
                            for req_doc in req_docs:
                                results.append({
                                    "document_type": req_doc,
                                    "regulation_source": doc.metadata.get("source_convention", collection_name),
                                    "description": doc.page_content[:200],
                                    "port_code": port_code
                                })
                except Exception as e:
                    logger.error(f"Error getting required documents from {collection_name}: {e}")

        # Deduplicate by document_type
        seen = set()
        unique_results = []
        for r in results:
            if r["document_type"] not in seen:
                seen.add(r["document_type"])
                unique_results.append(r)

        return unique_results

    def search_regional_requirements(
        self,
        port_code: str,
        vessel_info: Dict[str, Any],
        top_k: int = 5
    ) -> List[SearchResult]:
        """Search for regional requirements (ECA, emissions, etc.)"""
        query = f"Regional requirements for port {port_code} {vessel_info.get('vessel_type', '')} vessel"

        collection = self.collections.get("regional_requirements")
        if not collection:
            return []

        results = []
        try:
            docs = collection.similarity_search_with_score(query, k=top_k)
            for doc, score in docs:
                results.append(SearchResult(
                    content=doc.page_content,
                    metadata=doc.metadata,
                    score=score,
                    source="regional_requirements"
                ))
        except Exception as e:
            logger.error(f"Error searching regional requirements: {e}")

        return results

    def search_general(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        top_k: int = 5,
        collections: Optional[List[str]] = None
    ) -> List[SearchResult]:
        """
        General semantic search across all collections

        Args:
            query: Search query
            filters: Optional filters (port, region, regulation_type, vessel_type)
            top_k: Number of results
            collections: Optional list of collection names to search (default: all)
        """
        search_collections = collections or list(self.COLLECTIONS.keys())

        all_results = []
        for collection_name in search_collections:
            collection = self.collections.get(collection_name)
            if not collection:
                continue

            try:
                docs = collection.similarity_search_with_score(query, k=top_k)
                for doc, score in docs:
                    # Apply filters if provided
                    if filters and not self._matches_filters(doc.metadata, filters):
                        continue

                    all_results.append(SearchResult(
                        content=doc.page_content,
                        metadata=doc.metadata,
                        score=score,
                        source=collection_name
                    ))
            except Exception as e:
                logger.error(f"Error searching {collection_name}: {e}")

        # Rerank results if reranker is available
        if self.reranker and len(all_results) > 0:
            all_results = self._rerank(query, all_results, top_k)
        else:
            all_results.sort(key=lambda x: x.score, reverse=True)
            all_results = all_results[:top_k]

        return all_results

    def add_documents(
        self,
        collection_name: str,
        documents: List[Document]
    ) -> int:
        """
        Add documents to a collection

        Args:
            collection_name: Name of the collection
            documents: List of Document objects

        Returns:
            Number of documents added
        """
        # Check if collection_name exists in the dictionary
        if collection_name not in self.collections:
            logger.error(f"Collection {collection_name} not found. Available: {list(self.collections.keys())}")
            return 0

        collection = self.collections[collection_name]

        try:
            collection.add_documents(documents)
            logger.info(f"Added {len(documents)} documents to {collection_name}")
            return len(documents)
        except Exception as e:
            logger.error(f"Error adding documents to {collection_name}: {e}")
            return 0

    def get_collection_stats(self) -> Dict[str, int]:
        """Get document counts for all collections"""
        stats = {}
        for name, collection in self.collections.items():
            try:
                if hasattr(collection, '_collection'):
                    stats[name] = collection._collection.count()
                else:
                    stats[name] = 0
            except:
                stats[name] = 0
        return stats

    def _rerank(
        self,
        query: str,
        results: List[SearchResult],
        top_k: int
    ) -> List[SearchResult]:
        """Rerank results using cross-encoder"""
        if len(results) == 0:
            return results[:top_k]

        pairs = [[query, r.content] for r in results]
        scores = self.reranker.predict(pairs)

        for i, score in enumerate(scores):
            results[i].score = float(score)

        results.sort(key=lambda x: x.score, reverse=True)
        return results[:top_k]

    def _matches_filters(self, metadata: Dict, filters: Dict) -> bool:
        """Check if document metadata matches filters"""
        for key, value in filters.items():
            if key in metadata:
                meta_value = metadata[key]
                if isinstance(meta_value, str) and isinstance(value, str):
                    if value.lower() not in meta_value.lower():
                        return False
                elif meta_value != value:
                    return False
        return True

    def _collection_supports_filter(self, collection) -> bool:
        """Check if collection supports metadata filtering"""
        return True  # ChromaDB supports filtering


# =============================================================================
# Business-Friendly Query Methods
# =============================================================================

    def query_for_business(
        self,
        query: str,
        vessel_type: Optional[str] = None,
        port_codes: Optional[List[str]] = None,
        top_k: int = 10
    ) -> Dict[str, Any]:
        """
        Process a natural language query and return a business-friendly structured response.
        
        This method transforms raw search results into actionable business intelligence
        with clear categorization, priorities, and next steps.
        
        Args:
            query: Natural language query from the user
            vessel_type: Optional vessel type for filtering
            port_codes: Optional list of relevant port codes
            top_k: Number of results to consider
            
        Returns:
            Structured dict with:
            - query_summary: Brief interpretation of what was asked
            - regulations: Relevant regulations found
            - requirements: Specific requirements with applicability
            - documents_needed: List of documents required
            - action_items: Prioritized actions to take
            - risk_factors: Potential risks identified
            - sources: Source references for traceability
        """
        # Perform semantic search across all relevant collections
        results = self.search_general(
            query=query,
            top_k=top_k
        )
        
        # Parse and categorize results
        regulations = []
        documents_needed = set()
        action_items = []
        risk_factors = []
        sources = set()
        
        for result in results:
            # Extract regulation info
            reg_info = {
                "regulation": result.metadata.get("convention", result.metadata.get("source", result.source)),
                "title": result.metadata.get("chapter_title", result.metadata.get("title", "Maritime Regulation")),
                "content": result.content[:500],
                "applicability": result.metadata.get("applicability", "All vessels"),
                "requirement_type": result.metadata.get("requirement_type", "MANDATORY"),
                "relevance_score": round(result.score, 2),
            }
            regulations.append(reg_info)
            
            # Extract document requirements
            if "required_documents" in result.metadata:
                docs = result.metadata["required_documents"]
                if isinstance(docs, str):
                    try:
                        docs = json.loads(docs)
                    except:
                        docs = [docs]
                for doc in docs:
                    documents_needed.add(doc)
            
            # Extract certificate mentions from content
            cert_keywords = ["Certificate", "Document", "Record Book", "Plan", "Manual"]
            for keyword in cert_keywords:
                if keyword.lower() in result.content.lower():
                    # Try to extract the full certificate name
                    content_lower = result.content.lower()
                    idx = content_lower.find(keyword.lower())
                    if idx > 0:
                        # Look for certificate name before the keyword
                        start = max(0, idx - 50)
                        snippet = result.content[start:idx + len(keyword)]
                        # Simple extraction - look for capitalized words before keyword
                        pass
            
            # Add sources
            source = result.metadata.get("source_document", result.metadata.get("convention", result.source))
            sources.add(source)
            
            # Identify risks based on content
            risk_keywords = ["detention", "penalty", "fine", "deficiency", "violation", "non-compliance"]
            for keyword in risk_keywords:
                if keyword in result.content.lower():
                    risk_factors.append({
                        "risk": f"Potential {keyword} risk identified",
                        "context": result.content[:200],
                        "source": source,
                    })
                    break
        
        # Generate action items based on findings
        if documents_needed:
            action_items.append({
                "priority": "HIGH",
                "category": "Documentation",
                "action": f"Ensure the following documents are current and available: {', '.join(list(documents_needed)[:5])}",
                "reason": "Required by identified regulations",
            })
        
        if risk_factors:
            action_items.append({
                "priority": "CRITICAL",
                "category": "Compliance",
                "action": "Review identified risk areas and ensure full compliance",
                "reason": f"{len(risk_factors)} potential risk factor(s) identified",
            })
        
        # Build response
        return {
            "query_summary": f"Found {len(results)} relevant regulations for: {query}",
            "regulations": regulations[:5],  # Top 5 most relevant
            "requirements": [
                {
                    "requirement": reg["title"],
                    "regulation": reg["regulation"],
                    "applicability": reg["applicability"],
                    "type": reg["requirement_type"],
                }
                for reg in regulations[:5]
            ],
            "documents_needed": list(documents_needed)[:10],
            "action_items": action_items,
            "risk_factors": risk_factors[:3],
            "sources": list(sources),
            "metadata": {
                "total_results": len(results),
                "query": query,
                "vessel_type": vessel_type,
                "ports": port_codes,
            }
        }

    def get_structured_port_requirements(
        self,
        port_code: str,
        vessel_type: str = "cargo_ship"
    ) -> Dict[str, Any]:
        """
        Get structured, business-friendly port requirements.
        
        Returns comprehensive port requirements organized by category
        with clear compliance steps.
        """
        # Search for port-specific requirements
        port_results = self.search_by_port(port_code, vessel_type, top_k=10)
        required_docs = self.search_required_documents(port_code, vessel_type)
        regional_results = self.search_regional_requirements(
            port_code, {"vessel_type": vessel_type}, top_k=5
        )
        
        # Categorize requirements
        pre_arrival = []
        documentation = []
        environmental = []
        safety = []
        customs = []
        
        for result in port_results:
            content_lower = result.content.lower()
            
            req_info = {
                "requirement": result.metadata.get("requirement_name", "Port Requirement"),
                "description": result.content[:300],
                "source": result.metadata.get("source", result.source),
                "mandatory": result.metadata.get("requirement_type", "MANDATORY") == "MANDATORY",
            }
            
            # Categorize based on content
            if any(kw in content_lower for kw in ["pre-arrival", "notice", "notification", "48 hours", "24 hours", "96 hours"]):
                pre_arrival.append(req_info)
            elif any(kw in content_lower for kw in ["emission", "eca", "sulphur", "scrubber", "ballast"]):
                environmental.append(req_info)
            elif any(kw in content_lower for kw in ["safety", "solas", "fire", "life-saving"]):
                safety.append(req_info)
            elif any(kw in content_lower for kw in ["customs", "declaration", "manifest", "cargo"]):
                customs.append(req_info)
            else:
                documentation.append(req_info)
        
        # Build action checklist
        checklist = []
        checklist.append({
            "phase": "Before Voyage",
            "actions": [
                "Verify all certificates are valid and will not expire during voyage",
                "Confirm vessel meets port-specific requirements",
                "Prepare all required documentation",
            ]
        })
        
        if pre_arrival:
            checklist.append({
                "phase": "Pre-Arrival",
                "actions": [req["requirement"] for req in pre_arrival]
            })
        
        checklist.append({
            "phase": "On Arrival",
            "actions": [
                "Have all documents ready for PSC inspection",
                "Ensure environmental compliance (fuel, emissions)",
                "Complete customs declarations",
            ]
        })
        
        return {
            "port_code": port_code,
            "port_name": self._get_port_name_from_code(port_code),
            "vessel_type": vessel_type,
            "summary": f"Found {len(port_results)} requirements for {port_code}",
            
            "requirements_by_category": {
                "pre_arrival": pre_arrival,
                "documentation": documentation,
                "environmental": environmental,
                "safety": safety,
                "customs": customs,
            },
            
            "required_documents": required_docs,
            
            "regional_requirements": [
                {
                    "requirement": r.metadata.get("requirement_name", "Regional Requirement"),
                    "description": r.content[:200],
                    "source": r.metadata.get("convention", r.source),
                }
                for r in regional_results
            ],
            
            "compliance_checklist": checklist,
            
            "total_requirements": len(port_results),
        }

    def get_compliance_summary_for_route(
        self,
        port_codes: List[str],
        vessel_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate a business-friendly compliance summary for an entire route.
        
        Returns a structured report with:
        - Route overview
        - Port-by-port requirements
        - Common requirements across all ports
        - Prioritized action items
        - Risk assessment
        """
        vessel_type = vessel_info.get("vessel_type", "cargo_ship")
        
        # Get requirements for each port
        route_requirements = self.search_by_route(port_codes, vessel_info, top_k_per_port=5)
        
        # Analyze route
        port_summaries = {}
        all_documents = set()
        all_risks = []
        
        for port_code, results in route_requirements.items():
            port_docs = []
            port_risks = []
            
            for result in results:
                # Collect documents
                if "required_documents" in result.metadata:
                    docs = result.metadata["required_documents"]
                    if isinstance(docs, str):
                        try:
                            docs = json.loads(docs)
                        except:
                            docs = [docs]
                    for doc in docs:
                        all_documents.add(doc)
                        port_docs.append(doc)
                
                # Check for risk indicators
                if any(kw in result.content.lower() for kw in ["detention", "deficiency", "fine", "penalty"]):
                    port_risks.append({
                        "port": port_code,
                        "risk": result.content[:150],
                        "source": result.source,
                    })
                    all_risks.append(port_risks[-1])
            
            port_summaries[port_code] = {
                "port_name": self._get_port_name_from_code(port_code),
                "requirements_count": len(results),
                "documents_needed": list(set(port_docs)),
                "risk_level": "HIGH" if port_risks else "MEDIUM" if len(results) > 5 else "LOW",
            }
        
        # Generate prioritized actions
        actions = []
        
        if all_documents:
            actions.append({
                "priority": "HIGH",
                "action": f"Ensure these documents are valid: {', '.join(list(all_documents)[:5])}{'...' if len(all_documents) > 5 else ''}",
                "applies_to": "All ports",
            })
        
        # Check for ECA ports
        eca_ports = [p for p in port_codes if self._is_eca_port(p)]
        if eca_ports:
            actions.append({
                "priority": "CRITICAL",
                "action": f"Verify ECA compliance for ports: {', '.join(eca_ports)}",
                "applies_to": eca_ports,
                "details": "Ensure fuel sulphur content ≤0.10% or operational scrubber",
            })
        
        # Check for EU ports
        eu_ports = [p for p in port_codes if self._is_eu_port(p)]
        if eu_ports:
            actions.append({
                "priority": "HIGH",
                "action": f"Verify EU MRV/ETS compliance for ports: {', '.join(eu_ports)}",
                "applies_to": eu_ports,
                "details": "Ensure EU MRV monitoring plan and ETS allowances are in order",
            })
        
        return {
            "route": port_codes,
            "vessel_type": vessel_type,
            "total_ports": len(port_codes),
            
            "executive_summary": {
                "total_requirements_found": sum(len(r) for r in route_requirements.values()),
                "documents_needed": len(all_documents),
                "risks_identified": len(all_risks),
                "eca_ports": len(eca_ports),
                "eu_ports": len(eu_ports),
            },
            
            "port_summaries": port_summaries,
            
            "common_documents": list(all_documents)[:15],
            
            "prioritized_actions": sorted(actions, key=lambda x: {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}.get(x["priority"], 4)),
            
            "risk_factors": all_risks[:5],
            
            "recommendations": [
                "Review all certificates at least 30 days before voyage",
                "Verify fuel compliance for ECA zones" if eca_ports else None,
                "Ensure EU MRV monitoring plan is updated" if eu_ports else None,
                "Prepare pre-arrival notifications according to each port's requirements",
            ],
        }

    def _get_port_name_from_code(self, port_code: str) -> str:
        """Get port name from code"""
        port_names = {
            "SGSIN": "Port of Singapore",
            "NLRTM": "Port of Rotterdam",
            "DEHAM": "Port of Hamburg",
            "CNSHA": "Port of Shanghai",
            "HKHKG": "Port of Hong Kong",
            "USNYC": "Port of New York",
            "USLAX": "Port of Los Angeles",
            "BEANR": "Port of Antwerp",
            "GBFXT": "Port of Felixstowe",
            "FIHEL": "Port of Helsinki",
            "SEGOT": "Port of Gothenburg",
        }
        return port_names.get(port_code, f"Port {port_code}")

    def _is_eca_port(self, port_code: str) -> bool:
        """Check if port is in an Emission Control Area"""
        eca_ports = {
            # Baltic Sea ECA
            "FIHEL", "SEGOT", "DKCPH", "PLGDN", "EETAL", "RULED",
            # North Sea ECA
            "NLRTM", "DEHAM", "BEANR", "GBFXT", "GBSOU",
            # North American ECA
            "USLAX", "USNYC", "USHOU", "CAHAL", "CAVAN",
        }
        return port_code in eca_ports

    def _is_eu_port(self, port_code: str) -> bool:
        """Check if port is subject to EU regulations"""
        eu_country_codes = {"NL", "DE", "BE", "FR", "ES", "IT", "PT", "GR", "PL", "SE", "FI", "DK", "IE", "EE", "LV", "LT", "HR", "SI", "CY", "MT", "RO", "BG"}
        return port_code[:2] in eu_country_codes

    # =========================================================================
    # User Document CRUD (ChromaDB-backed)
    # =========================================================================

    def _user_docs_collection(self):
        """Get the user_documents Chroma collection"""
        return self.collections["user_documents"]

    def add_user_document(self, doc_id: str, text: str, metadata: Dict[str, Any]) -> str:
        """
        Add a user-uploaded document to ChromaDB.

        Args:
            doc_id: UUID string identifier
            text: OCR-extracted text (used as the document content for embeddings)
            metadata: Flat dict of metadata fields. No None values or nested objects.

        Returns:
            The doc_id that was stored
        """
        collection = self._user_docs_collection()
        try:
            # Handle empty text - use placeholder to avoid embedding API errors
            content = text.strip() if text else ""
            if not content:
                content = f"[Document: {metadata.get('title', 'Untitled')}] No text content extracted."
                logger.warning(f"Document {doc_id} has no text content, using placeholder")
                # region agent log
                _debug_log(
                    "pre-fix",
                    "H4",
                    "maritime_knowledge_base.py:add_user_document",
                    "Using placeholder content branch",
                    {
                        "doc_id": doc_id,
                        "title_present": bool(metadata.get("title")),
                    },
                )
                # endregion
            
            doc = Document(page_content=content, metadata=metadata)
            # region agent log
            _debug_log(
                "pre-fix",
                "H1",
                "maritime_knowledge_base.py:add_user_document",
                "Before add_documents",
                {
                    "doc_id": doc_id,
                    "content_len": len(content),
                    "content_is_placeholder": content.startswith("[Document:"),
                    "embedding_model_attr": str(getattr(self.embeddings, "model", None)),
                    "collection_name": "user_documents",
                },
            )
            # endregion
            collection.add_documents([doc], ids=[doc_id])
            # region agent log
            _debug_log(
                "pre-fix",
                "H5",
                "maritime_knowledge_base.py:add_user_document",
                "add_documents succeeded",
                {
                    "doc_id": doc_id,
                    "metadata_key_count": len(metadata.keys()),
                },
            )
            # endregion
            logger.info(f"Added user document {doc_id} to ChromaDB")
            return doc_id
        except Exception as e:
            # region agent log
            _debug_log(
                "pre-fix",
                "H3",
                "maritime_knowledge_base.py:add_user_document",
                "add_documents failed",
                {
                    "doc_id": doc_id,
                    "exception_type": type(e).__name__,
                    "exception_message": str(e),
                    "embedding_model_attr": str(getattr(self.embeddings, "model", None)),
                },
            )
            # endregion
            logger.error(f"Error adding user document {doc_id}: {e}")
            raise

    def get_user_document_by_id(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a single user document by its ID.

        Returns:
            Dict with 'id', 'text', and all metadata fields, or None if not found.
        """
        collection = self._user_docs_collection()
        try:
            result = collection._collection.get(ids=[doc_id], include=["documents", "metadatas"])
            if not result["ids"]:
                return None
            return {
                "id": result["ids"][0],
                "text": result["documents"][0] if result["documents"] else "",
                **(result["metadatas"][0] if result["metadatas"] else {}),
            }
        except Exception as e:
            logger.error(f"Error fetching user document {doc_id}: {e}")
            return None

    def get_user_documents(
        self,
        where_filter: Dict[str, Any],
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        Get user documents matching a filter.

        Args:
            where_filter: ChromaDB where clause, e.g. {"vessel_id": 5}
            limit: Max results

        Returns:
            List of dicts, each with 'id', 'text', and metadata fields.
        """
        collection = self._user_docs_collection()
        try:
            result = collection._collection.get(
                where=where_filter,
                limit=limit,
                include=["documents", "metadatas"],
            )
            docs = []
            for i, doc_id in enumerate(result["ids"]):
                docs.append({
                    "id": doc_id,
                    "text": result["documents"][i] if result["documents"] else "",
                    **(result["metadatas"][i] if result["metadatas"] else {}),
                })
            return docs
        except Exception as e:
            logger.error(f"Error fetching user documents with filter {where_filter}: {e}")
            return []

    def delete_user_document(self, doc_id: str) -> bool:
        """Delete a user document by ID. Returns True on success."""
        collection = self._user_docs_collection()
        try:
            collection._collection.delete(ids=[doc_id])
            logger.info(f"Deleted user document {doc_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting user document {doc_id}: {e}")
            return False

    def update_user_document_metadata(
        self, doc_id: str, metadata_updates: Dict[str, Any]
    ) -> bool:
        """
        Update metadata fields on an existing user document.

        Args:
            doc_id: Document ID
            metadata_updates: Dict of fields to update (merged with existing)

        Returns:
            True on success
        """
        collection = self._user_docs_collection()
        try:
            collection._collection.update(ids=[doc_id], metadatas=[metadata_updates])
            logger.info(f"Updated metadata for user document {doc_id}")
            return True
        except Exception as e:
            logger.error(f"Error updating user document {doc_id}: {e}")
            return False

    def count_user_documents(self, where_filter: Optional[Dict[str, Any]] = None) -> int:
        """Count user documents matching an optional filter."""
        collection = self._user_docs_collection()
        try:
            if where_filter:
                result = collection._collection.get(where=where_filter, include=[])
                return len(result["ids"])
            else:
                return collection._collection.count()
        except Exception as e:
            logger.error(f"Error counting user documents: {e}")
            return 0

    def search_user_documents(
        self,
        query_text: str,
        where_filter: Optional[Dict[str, Any]] = None,
        n_results: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Semantic search over user documents (OCR text).

        Args:
            query_text: Search query
            where_filter: Optional ChromaDB where clause
            n_results: Number of results

        Returns:
            List of dicts with 'id', 'text', metadata, and 'score'.
        """
        collection = self._user_docs_collection()
        try:
            kwargs: Dict[str, Any] = {"k": n_results}
            if where_filter:
                kwargs["filter"] = where_filter
            results = collection.similarity_search_with_score(query_text, **kwargs)
            docs = []
            for doc, score in results:
                doc_dict = {
                    "text": doc.page_content,
                    "score": score,
                    **doc.metadata,
                }
                docs.append(doc_dict)
            return docs
        except Exception as e:
            logger.error(f"Error searching user documents: {e}")
            return []

    def match_required_document(
        self,
        required_doc_type: str,
        where_filter: Optional[Dict[str, Any]] = None,
        score_threshold: float = 0.6,
    ) -> Optional[Dict[str, Any]]:
        """
        Use semantic similarity to find a user document that matches a
        required document type.

        Args:
            required_doc_type: The required document name,
                e.g. "Safety Management Certificate" or "registry_certificate".
            where_filter: ChromaDB where clause to scope the search,
                e.g. {"vessel_id": 5} or {"customer_id": 3}.
            score_threshold: Maximum distance score to consider a match.
                Lower = stricter. ChromaDB returns L2 distances where
                0 = identical. A value of ~0.6 works well for Gemini
                embeddings with short document type names.

        Returns:
            The best-matching user document dict (with 'id', 'text',
            metadata, 'score') if the score is within threshold,
            otherwise None.
        """
        results = self.search_user_documents(
            query_text=required_doc_type,
            where_filter=where_filter,
            n_results=1,
        )
        if results and results[0].get("score", float("inf")) <= score_threshold:
            return results[0]
        return None

    def match_documents_against_requirements(
        self,
        required_doc_types: List[str],
        where_filter: Optional[Dict[str, Any]] = None,
        score_threshold: float = 0.6,
    ) -> Dict[str, Optional[Dict[str, Any]]]:
        """
        For each required document type, find the best-matching user
        document via semantic similarity.

        Args:
            required_doc_types: List of required document type names.
            where_filter: ChromaDB where clause to scope search.
            score_threshold: Maximum distance to consider a match.

        Returns:
            Dict mapping each required type to its best match (or None).
        """
        matches: Dict[str, Optional[Dict[str, Any]]] = {}
        for req_type in required_doc_types:
            matches[req_type] = self.match_required_document(
                required_doc_type=req_type,
                where_filter=where_filter,
                score_threshold=score_threshold,
            )
        return matches


# Singleton instance
_maritime_kb: Optional[MaritimeKnowledgeBase] = None


def get_maritime_knowledge_base() -> MaritimeKnowledgeBase:
    """Get MaritimeKnowledgeBase singleton instance"""
    global _maritime_kb
    if _maritime_kb is None:
        _maritime_kb = MaritimeKnowledgeBase()
    return _maritime_kb
