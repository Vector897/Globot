"""
Maritime Knowledge Base Service - RAG for maritime regulations
Uses ChromaDB for vector storage with hybrid search capabilities
"""
import logging
import os
import json
from typing import List, Optional, Dict, Any
from dataclasses import dataclass

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Optional imports with graceful fallback
try:
    from langchain_community.embeddings import HuggingFaceEmbeddings
    from langchain_community.vectorstores import Chroma
    from langchain_core.documents import Document
    HAS_LANGCHAIN = True
except ImportError:
    HAS_LANGCHAIN = False
    logger.warning("langchain_community not found. MaritimeKnowledgeBase will run in MOCK mode.")

    # Mock Document class
    class Document:
        def __init__(self, page_content: str, metadata: Optional[Dict] = None):
            self.page_content = page_content
            self.metadata = metadata or {}

try:
    from rank_bm25 import BM25Okapi
    HAS_BM25 = True
except ImportError:
    HAS_BM25 = False
    logger.warning("rank_bm25 not found. BM25 hybrid search disabled.")

try:
    from sentence_transformers import CrossEncoder
    HAS_RERANKER = True
except ImportError:
    HAS_RERANKER = False
    logger.warning("sentence_transformers not found. Reranking disabled.")


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
        "customs_documentation": "Customs and documentation requirements"
    }

    def __init__(self):
        self.mock_mode = not HAS_LANGCHAIN
        self.embeddings = None
        self.collections: Dict[str, Any] = {}
        self.reranker = None
        self.bm25_indices: Dict[str, Any] = {}
        self.doc_maps: Dict[str, Dict[str, Document]] = {}

        if not self.mock_mode:
            try:
                # Initialize embedding model (English-focused for legal text)
                self.embeddings = HuggingFaceEmbeddings(
                    model_name="sentence-transformers/all-MiniLM-L6-v2"
                )

                # Initialize ChromaDB collections
                persist_dir = settings.maritime_kb_persist_dir
                os.makedirs(persist_dir, exist_ok=True)

                for name in self.COLLECTIONS.keys():
                    collection_dir = os.path.join(persist_dir, name)
                    os.makedirs(collection_dir, exist_ok=True)

                    self.collections[name] = Chroma(
                        persist_directory=collection_dir,
                        embedding_function=self.embeddings,
                        collection_name=name
                    )

                # Initialize reranker
                if HAS_RERANKER:
                    try:
                        self.reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
                        logger.info("Reranker model loaded.")
                    except Exception as e:
                        logger.warning(f"Failed to load Reranker: {e}")

                logger.info(f"MaritimeKnowledgeBase initialized with {len(self.collections)} collections")

            except Exception as e:
                logger.error(f"Failed to initialize MaritimeKnowledgeBase: {e}. Switching to MOCK mode.")
                self.mock_mode = True
        else:
            logger.info("MaritimeKnowledgeBase initialized in MOCK mode.")

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
        if self.mock_mode:
            return self._get_mock_port_results(port_code, vessel_type)

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
        if self.mock_mode:
            return {port: self._get_mock_port_results(port, vessel_info.get("vessel_type"))
                    for port in port_codes}

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
        if self.mock_mode:
            return self._get_mock_required_documents(port_code, vessel_type)

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
        if self.mock_mode:
            return []

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
        if self.mock_mode:
            return self._get_mock_general_results(query, filters)

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

        # Rerank if available
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
        if self.mock_mode:
            logger.warning("Cannot add documents in MOCK mode")
            return 0

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
        if not self.reranker or len(results) == 0:
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

    # ========== Mock Data Methods ==========

    def _get_mock_port_results(
        self,
        port_code: str,
        vessel_type: Optional[str]
    ) -> List[SearchResult]:
        """Generate mock port regulation results"""
        mock_regulations = [
            SearchResult(
                content=f"All vessels calling at port {port_code} must provide 24-hour advance notice of arrival (ISPS Code requirement).",
                metadata={"port_code": port_code, "regulation_type": "security", "source": "ISPS Code"},
                score=0.95,
                source="port_regulations"
            ),
            SearchResult(
                content=f"Vessels must submit crew list and cargo manifest before arrival at {port_code}.",
                metadata={"port_code": port_code, "regulation_type": "customs", "source": "Port Authority"},
                score=0.90,
                source="customs_documentation"
            ),
            SearchResult(
                content=f"Port State Control inspections follow Paris MOU / Tokyo MOU guidelines. Vessels must have valid ISM and ISPS certificates.",
                metadata={"port_code": port_code, "regulation_type": "psc", "source": "PSC Regime"},
                score=0.88,
                source="psc_requirements"
            ),
        ]

        if vessel_type == "tanker":
            mock_regulations.append(SearchResult(
                content=f"Tanker vessels at {port_code} must comply with MARPOL Annex I requirements for oil pollution prevention.",
                metadata={"port_code": port_code, "vessel_type": "tanker", "source": "MARPOL Annex I"},
                score=0.92,
                source="imo_conventions"
            ))

        return mock_regulations

    def _get_mock_required_documents(
        self,
        port_code: str,
        vessel_type: str
    ) -> List[Dict[str, Any]]:
        """Generate mock required documents list"""
        base_docs = [
            {"document_type": "safety_certificate", "regulation_source": "SOLAS", "description": "Passenger Ship Safety Certificate or Cargo Ship Safety Equipment Certificate"},
            {"document_type": "load_line_certificate", "regulation_source": "Load Line Convention", "description": "International Load Line Certificate"},
            {"document_type": "marpol_certificate", "regulation_source": "MARPOL", "description": "International Oil Pollution Prevention Certificate (IOPP)"},
            {"document_type": "ism_certificate", "regulation_source": "ISM Code", "description": "Safety Management Certificate (SMC) and Document of Compliance (DOC)"},
            {"document_type": "isps_certificate", "regulation_source": "ISPS Code", "description": "International Ship Security Certificate (ISSC)"},
            {"document_type": "crew_certificate", "regulation_source": "STCW", "description": "Valid certificates of competency for all crew"},
            {"document_type": "registry_certificate", "regulation_source": "Flag State", "description": "Certificate of Registry"},
            {"document_type": "tonnage_certificate", "regulation_source": "Tonnage Convention", "description": "International Tonnage Certificate"},
            {"document_type": "insurance_certificate", "regulation_source": "CLC/Bunker Convention", "description": "Civil Liability Insurance Certificate"},
        ]

        # Add port-specific document
        for doc in base_docs:
            doc["port_code"] = port_code

        return base_docs

    def _get_mock_general_results(
        self,
        query: str,
        filters: Optional[Dict]
    ) -> List[SearchResult]:
        """Generate mock general search results"""
        return [
            SearchResult(
                content=f"[MOCK] Search result for query: {query}. SOLAS Chapter II-2 Regulation 10 requires fire-fighting appliances on all vessels.",
                metadata={"source_convention": "SOLAS", "chapter": "II-2", "regulation": "10"},
                score=0.85,
                source="imo_conventions"
            ),
            SearchResult(
                content=f"[MOCK] MARPOL Annex VI establishes regulations for the prevention of air pollution from ships, including SOx emission limits in ECAs.",
                metadata={"source_convention": "MARPOL", "annex": "VI"},
                score=0.80,
                source="regional_requirements"
            ),
        ]


# Singleton instance
_maritime_kb: Optional[MaritimeKnowledgeBase] = None


def get_maritime_knowledge_base() -> MaritimeKnowledgeBase:
    """Get MaritimeKnowledgeBase singleton instance"""
    global _maritime_kb
    if _maritime_kb is None:
        _maritime_kb = MaritimeKnowledgeBase()
    return _maritime_kb
