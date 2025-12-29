import pytest
import os
from core.azure_search import AzureAISearchService

@pytest.mark.asyncio
async def test_azure_search_demo_mode():
    """测试Azure Search Demo模式"""
    os.environ["DEMO_MODE"] = "true"
    service = AzureAISearchService()

    result = await service.hybrid_search(
        query="关税",
        top_k=2
    )

    assert "results" in result
    assert "metadata" in result
    assert result["metadata"]["provider"] == "Azure AI Search"
    assert result["metadata"]["demo_mode"] is True
    assert len(result["results"]) > 0
