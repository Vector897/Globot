import pytest
import os
from core.azure_llm import AzureOpenAIService

@pytest.mark.asyncio
async def test_demo_mode():
    """测试Demo模式"""
    os.environ["DEMO_MODE"] = "true"
    service = AzureOpenAIService()

    result = await service.chat([
        {"role": "user", "content": "分析风险"}
    ])

    assert "metadata" in result
    assert result["metadata"]["provider"] == "Azure OpenAI Service"
    assert result["metadata"]["demo_mode"] is True
    assert "Azure" in result["content"]  # Mock数据包含Azure字样
