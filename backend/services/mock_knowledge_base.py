"""
Mock Knowledge Base Loader for Globot RAG System
================================================
Converts JSON mock data into LangChain Document objects for Agent testing.

Usage:
    from services.mock_knowledge_base import MockKnowledgeBase
    
    kb = MockKnowledgeBase()
    docs = kb.load_all()
    vector_store.add_documents(docs)
"""

from langchain_core.documents import Document
import json
from pathlib import Path
from typing import List, Optional


class MockKnowledgeBase:
    """
    Mock 知识库加载器，用于 Globot Agent 单元测试。
    将 JSON 格式的 Mock 数据转换为 LangChain Document 对象。
    """
    
    def __init__(self, mock_data_dir: Optional[str] = None):
        """
        Initialize the MockKnowledgeBase.
        
        Args:
            mock_data_dir: Path to the mock data directory. 
                          Defaults to backend/data/mock/
        """
        if mock_data_dir is None:
            self.mock_dir = Path(__file__).parent.parent / "data" / "mock"
        else:
            self.mock_dir = Path(mock_data_dir)
    
    def load_hs_codes(self) -> List[Document]:
        """Load HS Code mock data for tariff queries."""
        return self._load_json_to_docs("hs_codes.json", self._transform_hs_code)
    
    def load_incoterms(self) -> List[Document]:
        """Load Incoterms 2020 mock data for trade term queries."""
        return self._load_json_to_docs("incoterms.json", self._transform_incoterm)
    
    def load_sanctions(self) -> List[Document]:
        """Load sanctions list mock data for compliance checks."""
        return self._load_json_to_docs("sanctions_list.json", self._transform_sanctions)
    
    def load_port_congestion(self) -> List[Document]:
        """Load port congestion mock data for logistics planning."""
        return self._load_json_to_docs("port_congestion.json", self._transform_port)
    
    def load_freight_rates(self) -> List[Document]:
        """Load freight rate mock data for cost calculations."""
        return self._load_json_to_docs("freight_rates.json", self._transform_freight)
    
    def load_carrier_routes(self) -> List[Document]:
        """Load carrier route mock data for route planning."""
        return self._load_json_to_docs("carrier_routes.json", self._transform_route)
    
    def load_all(self) -> List[Document]:
        """
        Load all mock documents from all categories.
        
        Returns:
            List of all LangChain Document objects ready for VectorStore.
        """
        all_docs = []
        
        loaders = [
            ("HS Codes", self.load_hs_codes),
            ("Incoterms", self.load_incoterms),
            ("Sanctions", self.load_sanctions),
            ("Port Congestion", self.load_port_congestion),
            ("Freight Rates", self.load_freight_rates),
            ("Carrier Routes", self.load_carrier_routes),
        ]
        
        for name, loader in loaders:
            docs = loader()
            print(f"  Loaded {len(docs)} {name} documents")
            all_docs.extend(docs)
        
        print(f"Total: {len(all_docs)} mock documents loaded")
        return all_docs
    
    def _load_json_to_docs(self, filename: str, transform_fn) -> List[Document]:
        """Generic JSON loading method."""
        filepath = self.mock_dir / filename
        if not filepath.exists():
            print(f"Warning: {filepath} not found, skipping...")
            return []
        
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return [transform_fn(item) for item in data]
    
    def _transform_hs_code(self, item: dict) -> Document:
        """Transform HS Code data to Document."""
        return Document(
            page_content=item["embedding_content"],
            metadata={
                "id": item["id"],
                "code": item["data"]["hs_code"],
                "category": item["data"].get("category", "General"),
                "is_hazardous": item["data"].get("is_hazardous", False),
                "source": item["source"],
                "content_type": item["content_type"],
                "raw_json": json.dumps(item["data"], ensure_ascii=False)
            }
        )
    
    def _transform_incoterm(self, item: dict) -> Document:
        """Transform Incoterm data to Document."""
        return Document(
            page_content=item["embedding_content"],
            metadata={
                "id": item["id"],
                "term_code": item["term_code"],
                "full_name": item["full_name"],
                "transport_mode": item.get("mode_of_transport", "Any"),
                "raw_json": json.dumps(item["data"], ensure_ascii=False)
            }
        )
    
    def _transform_sanctions(self, item: dict) -> Document:
        """Transform sanctions data to Document."""
        return Document(
            page_content=item["embedding_content"],
            metadata={
                "id": item["id"],
                "entity_name": item["data"]["entity_name"],
                "country": item["data"]["country"],
                "source": item["source"],
                "content_type": item["content_type"],
                "status": item["data"].get("status", "SANCTIONED"),
                "raw_json": json.dumps(item["data"], ensure_ascii=False)
            }
        )
    
    def _transform_port(self, item: dict) -> Document:
        """Transform port congestion data to Document."""
        return Document(
            page_content=item["embedding_content"],
            metadata={
                "id": item["id"],
                "port_code": item["port_code"],
                "port_name": item["port_name"],
                "country": item["country"],
                "status": item["data"]["current_status"],
                "wait_days": item["data"]["average_wait_time_days"],
                "raw_json": json.dumps(item["data"], ensure_ascii=False)
            }
        )
    
    def _transform_freight(self, item: dict) -> Document:
        """Transform freight rate data to Document."""
        return Document(
            page_content=item["embedding_content"],
            metadata={
                "id": item["id"],
                "route": item["route"],
                "route_code": item["route_code"],
                "via": item["via"],
                "rate_usd": item["data"]["total_rate_usd"],
                "transit_days": item["data"]["transit_time_days"],
                "carrier": item["data"]["carrier"],
                "raw_json": json.dumps(item["data"], ensure_ascii=False)
            }
        )
    
    def _transform_route(self, item: dict) -> Document:
        """Transform carrier route data to Document."""
        return Document(
            page_content=item["embedding_content"],
            metadata={
                "id": item["id"],
                "service_name": item["service_name"],
                "carrier": item["carrier"],
                "status": item["data"]["status"],
                "frequency": item["data"]["frequency"],
                "raw_json": json.dumps(item["data"], ensure_ascii=False)
            }
        )


# Standalone test
if __name__ == "__main__":
    print("=" * 60)
    print("Mock Knowledge Base Loader Test")
    print("=" * 60)
    
    kb = MockKnowledgeBase()
    docs = kb.load_all()
    
    print("\n" + "-" * 60)
    print("Sample Documents:")
    print("-" * 60)
    
    for doc in docs[:3]:
        print(f"\n[{doc.metadata['id']}]")
        print(f"  Content: {doc.page_content[:80]}...")
        print(f"  Metadata keys: {list(doc.metadata.keys())}")
