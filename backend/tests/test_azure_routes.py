import sys
import os
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(parent_dir)

# Mock Azure modules to avoid ImportError in environment without Azure SDK
from unittest.mock import MagicMock
sys.modules["azure"] = MagicMock()
sys.modules["azure.core"] = MagicMock()
sys.modules["azure.core.credentials"] = MagicMock()
sys.modules["azure.search"] = MagicMock()
sys.modules["azure.search.documents"] = MagicMock()
sys.modules["azure.ai"] = MagicMock()
sys.modules["azure.ai.textanalytics"] = MagicMock()
sys.modules["openai"] = MagicMock()

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from api.v2.azure_routes import router
import os

app = FastAPI()
app.include_router(router)
client = TestClient(app)

def test_azure_stats_endpoint():
    """测试Azure Stats端点"""
    os.environ["DEMO_MODE"] = "true"
    response = client.get("/api/v2/azure/stats")
    assert response.status_code == 200
    data = response.json()
    assert "openai_calls" in data
    assert "search_calls" in data
    assert "cognitive_calls" in data
    assert "timestamp" in data

def test_azure_chat_endpoint():
    """测试Azure Chat端点"""
    os.environ["DEMO_MODE"] = "true"
    response = client.post(
        "/api/v2/azure/chat",
        json={
            "messages": [{"role": "user", "content": "分析风险"}]
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "content" in data
    assert data["metadata"]["provider"] == "Azure OpenAI Service"
