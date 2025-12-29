import asyncio
import os
import sys

# Ensure current directory is in path
sys.path.append(os.getcwd())

from core.azure_llm import AzureOpenAIService
from core.azure_search import AzureAISearchService
from core.azure_cognitive import AzureCognitiveService
from fastapi import FastAPI
from fastapi.testclient import TestClient
from api.v2.azure_routes import router

async def verify_llm():
    print("Testing Azure LLM...")
    os.environ["DEMO_MODE"] = "true"
    service = AzureOpenAIService()
    res = await service.chat([{"role": "user", "content": "test"}])
    print("LLM Result metadata:", res["metadata"])
    assert res["metadata"]["demo_mode"] is True

async def verify_search():
    print("Testing Azure Search...")
    service = AzureAISearchService()
    res = await service.hybrid_search("query")
    print("Search Result count:", len(res["results"]))
    assert res["metadata"]["demo_mode"] is True

async def verify_cognitive():
    print("Testing Azure Cognitive...")
    service = AzureCognitiveService()
    res = await service.analyze_sentiment("Critical alert")
    print("Cognitive Result:", res)
    assert res["metadata"]["demo_mode"] is True

def verify_api():
    print("Testing API...")
    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    
    res = client.get("/api/v2/azure/stats")
    print("Stats API:", res.status_code, res.json())
    assert res.status_code == 200
    
    res = client.post("/api/v2/azure/chat", json={"messages": [{"role": "user", "content": "hi"}]})
    print("Chat API:", res.status_code)
    assert res.status_code == 200

async def main():
    try:
        await verify_llm()
        await verify_search()
        await verify_cognitive()
        verify_api()
        print("\n✅ ALL VERIFICATIONS PASSED")
    except Exception as e:
        print(f"\n❌ VERIFICATION FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
