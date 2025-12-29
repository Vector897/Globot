from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential
import os
from typing import Dict, List, Optional

class AzureAISearchService:
    """Azure AI Search服务封装"""

    def __init__(self):
        self.demo_mode = os.getenv("DEMO_MODE", "true") == "true"
        self.search_count = 0

        if not self.demo_mode:
            self.client = SearchClient(
                endpoint=os.getenv("AZURE_SEARCH_ENDPOINT"),
                index_name=os.getenv("AZURE_SEARCH_INDEX", "globot-knowledge"),
                credential=AzureKeyCredential(os.getenv("AZURE_SEARCH_KEY"))
            )

    async def hybrid_search(
        self,
        query: str,
        filters: Optional[Dict] = None,
        top_k: int = 5
    ) -> Dict:
        """混合检索 (BM25 + Vector)

        Returns:
            {
                "results": [...],
                "metadata": {
                    "provider": "Azure AI Search",
                    "method": "Hybrid (BM25 + Semantic)",
                    "total_results": 156
                }
            }
        """
        self.search_count += 1

        if self.demo_mode:
            # Mock高质量检索结果
            mock_results = [
                {
                    "content": "M400 RTK安装步骤: 1. 连接D-RTK 3...",
                    "source": "M400_User_Manual.pdf",
                    "score": 0.95
                },
                {
                    "content": "关税编码9018.90适用于医疗超声设备...",
                    "source": "HS_Code_Database.pdf",
                    "score": 0.89
                }
            ]

            return {
                "results": mock_results[:top_k],
                "metadata": {
                    "provider": "Azure AI Search",
                    "method": "Hybrid (BM25 + Semantic Ranker)",
                    "total_results": 156,
                    "search_id": f"azure-search-{self.search_count}",
                    "demo_mode": True
                }
            }

        else:
            # 真实搜索
            results = list(self.client.search(
                search_text=query,
                filter=filters,
                top=top_k
            ))

            return {
                "results": [
                    {"content": doc["content"], "score": doc["@search.score"]}
                    for doc in results
                ],
                "metadata": {
                    "provider": "Azure AI Search",
                    "method": "Hybrid",
                    "total_results": len(results)
                }
            }

    def get_stats(self) -> Dict:
        return {
            "search_calls": self.search_count
        }
