from fastapi import APIRouter
from pydantic import BaseModel
from core.azure_llm import AzureOpenAIService
from core.azure_search import AzureAISearchService
from core.azure_cognitive import AzureCognitiveService
from typing import List, Dict
from datetime import datetime

router = APIRouter(prefix="/api/v2/azure", tags=["Azure Services"])

# 全局实例 (单例模式)
openai_service = AzureOpenAIService()
search_service = AzureAISearchService()
cognitive_service = AzureCognitiveService()

@router.get("/stats")
async def get_azure_stats():
    """获取Azure服务统计

    必须返回:
    {
        "openai_calls": int,
        "search_calls": int,
        "cognitive_calls": int,
        "total_tokens": int,
        "cost_usd": float,
        "timestamp": str
    }
    """
    openai_stats = openai_service.get_stats()
    search_stats = search_service.get_stats()
    cognitive_stats = cognitive_service.get_stats()

    return {
        **openai_stats,
        **search_stats,
        **cognitive_stats,
        "timestamp": datetime.utcnow().isoformat()
    }

class ChatRequest(BaseModel):
    messages: List[Dict]
    model: str = "gpt-4-turbo"

@router.post("/chat")
async def azure_chat(request: ChatRequest):
    """Azure OpenAI聊天接口"""
    response = await openai_service.chat(
        messages=request.messages,
        model=request.model
    )
    return response
