import pytest
import os
from core.azure_cognitive import AzureCognitiveService

@pytest.mark.asyncio
async def test_azure_cognitive_demo_mode():
    """测试Azure Cognitive Demo模式"""
    os.environ["DEMO_MODE"] = "true"
    service = AzureCognitiveService()

    result = await service.analyze_sentiment("Critical tariff increase alert!")

    assert "sentiment" in result
    assert "urgency" in result
    assert result["metadata"]["provider"] == "Azure Cognitive Services"
    assert result["metadata"]["demo_mode"] is True
    # "Critical" should trigger high urgency
    assert result["urgency"] > 0.5
