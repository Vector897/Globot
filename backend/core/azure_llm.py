from openai import AzureOpenAI
from typing import List, Dict
import os
from datetime import datetime

class AzureOpenAIService:
    """Azure OpenAI服务封装

    支持两种模式:
    - Demo模式: 返回预设Mock数据 + Azure元数据
    - 真实模式: 调用Azure OpenAI API
    """

    def __init__(self):
        self.demo_mode = os.getenv("DEMO_MODE", "true") == "true"
        self.call_count = 0  # 统计调用次数

        if not self.demo_mode:
            # 真实模式 only when demo_mode = false
            self.client = AzureOpenAI(
                api_key=os.getenv("AZURE_OPENAI_KEY"),
                api_version="2024-02-15-preview",
                azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
            )

    async def chat(
        self,
        messages: List[Dict],
        model: str = "gpt-4-turbo"
    ) -> Dict:
        """聊天接口

        Args:
            messages: 对话历史 [{"role": "user", "content": "..."}]
            model: 模型名称

        Returns:
            {
                "content": "AI回复内容",
                "metadata": {
                    "provider": "Azure OpenAI Service",
                    "model": "gpt-4-turbo",
                    "tokens_used": 1250,
                    "call_id": "azure-127",
                    "timestamp": "2025-12-26T..."
                }
            }
        """
        self.call_count += 1

        if self.demo_mode:
            # Demo模式: 返回精美Mock数据
            mock_responses = {
                "分析": "基于Azure AI分析，该货物面临25%关税上涨风险...",
                "估算": "根据费米估计，预计损失$112,500，置信度92%...",
                "建议": "综合Azure AI Search检索的历史案例，建议采用物流改道方案..."
            }

            # 简单关键词匹配
            user_message = messages[-1]["content"] if messages else ""
            response_content = next(
                (v for k, v in mock_responses.items() if k in user_message),
                "Azure OpenAI正在处理您的请求..."
            )

            return {
                "content": response_content,
                "metadata": {
                    "provider": "Azure OpenAI Service",
                    "model": model,
                    "tokens_used": len(response_content) * 2,
                    "call_id": f"azure-{self.call_count}",
                    "timestamp": datetime.utcnow().isoformat(),
                    "demo_mode": True
                }
            }

        else:
            # 真实模式: 调用Azure API
            response = self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.7,
                max_tokens=2000
            )

            return {
                "content": response.choices[0].message.content,
                "metadata": {
                    "provider": "Azure OpenAI Service",
                    "model": model,
                    "tokens_used": response.usage.total_tokens,
                    "call_id": response.id,
                    "timestamp": datetime.utcnow().isoformat(),
                    "demo_mode": False
                }
            }

    def get_stats(self) -> Dict:
        """获取统计信息 - 用于/api/v2/azure/stats端点"""
        return {
            "openai_calls": self.call_count,
            "total_tokens": self.call_count * 1250,  # 估算
            "cost_usd": round(self.call_count * 0.02, 2)
        }
