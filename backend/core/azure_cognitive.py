from azure.ai.textanalytics import TextAnalyticsClient
from azure.core.credentials import AzureKeyCredential
import os
from typing import Dict, List, Optional

class AzureCognitiveService:
    """Azure认知服务 - 情绪分析"""

    def __init__(self):
        self.demo_mode = os.getenv("DEMO_MODE", "true") == "true"
        self.cognitive_calls = 0

        if not self.demo_mode:
            self.client = TextAnalyticsClient(
                endpoint=os.getenv("AZURE_COGNITIVE_ENDPOINT"),
                credential=AzureKeyCredential(os.getenv("AZURE_COGNITIVE_KEY"))
            )

    async def analyze_sentiment(self, text: str) -> Dict:
        """情绪分析

        Returns:
            {
                "sentiment": "negative",
                "urgency": 0.99,
                "confidence": 0.997,
                "metadata": {...}
            }
        """
        self.cognitive_calls += 1

        if self.demo_mode:
            # 根据关键词判断
            urgency_keywords = ["emergency", "immediate", "critical", "关税", "暴涨"]
            urgency = 0.99 if any(k in text.lower() for k in urgency_keywords) else 0.3

            return {
                "sentiment": "negative" if urgency > 0.5 else "neutral",
                "urgency": urgency,
                "confidence": 0.997,
                "metadata": {
                    "provider": "Azure Cognitive Services",
                    "service": "Sentiment Analysis",
                    "demo_mode": True
                }
            }

        else:
            # 真实API调用
            response = self.client.analyze_sentiment([text])[0]

            return {
                "sentiment": response.sentiment,
                "confidence": response.confidence_scores.get(response.sentiment, 0),
                "metadata": {
                    "provider": "Azure Cognitive Services"
                }
            }

    def get_stats(self) -> Dict:
        return {
            "cognitive_calls": self.cognitive_calls
        }
