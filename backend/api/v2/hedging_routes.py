"""
金融对冲专家库 API 路由
提供对冲策略分析和建议的 REST 接口
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
from core.hedging_agent import get_hedging_agent
from services.hedging_knowledge_base import get_hedging_knowledge_base

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/hedging", tags=["hedging"])


# ============ 请求/响应模型 ============

class ExposureDetails(BaseModel):
    """对冲敞口详情"""
    commodity: str  # 商品类型：iron_ore, crude_oil, shipping 等
    exposure_quantity: float  # 数量（吨、桶等）
    exposure_price: float  # 当前或预期价格
    time_horizon: str = "3_months"  # 时间窗口
    risk_tolerance: str = "moderate"  # 风险容忍度：conservative, moderate, aggressive
    markets: Optional[List[str]] = None  # 涉及市场
    description: Optional[str] = None  # 详细描述


class KnowledgeSearchRequest(BaseModel):
    """知识库搜索请求"""
    query: str
    commodity_type: Optional[str] = None
    hedge_product_type: Optional[str] = None
    risk_types: Optional[List[str]] = None
    doc_type: Optional[str] = None  # strategy, risk_management, compliance, case_study
    top_k: int = 5


class CrisisResponseRequest(BaseModel):
    """危机响应请求"""
    crisis_type: str  # geopolitical, supply_chain, price_spike, liquidity_crisis
    affected_commodities: Optional[List[str]] = None
    exposure_details: Optional[Dict[str, Any]] = None


# ============ API 端点 ============

@router.post("/analyze-hedging", summary="分析对冲需求")
async def analyze_hedging_requirement(exposure: ExposureDetails):
    """
    分析对冲需求并返回策略建议
    
    示例请求：
    ```json
    {
        "commodity": "iron_ore",
        "exposure_quantity": 100000,
        "exposure_price": 120,
        "time_horizon": "3_months",
        "risk_tolerance": "moderate",
        "markets": ["Shanghai", "Rotterdam"],
        "description": "4月进口铁矿石合同，需要锁定成本"
    }
    ```
    
    返回：包含推荐策略、成本估算、风险评分的分析结果
    """
    try:
        agent = get_hedging_agent()
        result = agent.analyze_hedging_requirement({
            "commodity": exposure.commodity,
            "exposure_quantity": exposure.exposure_quantity,
            "exposure_price": exposure.exposure_price,
            "time_horizon": exposure.time_horizon,
            "risk_tolerance": exposure.risk_tolerance,
            "markets": exposure.markets or [],
            "description": exposure.description or ""
        })
        return result
    
    except Exception as e:
        logger.error(f"对冲分析失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search-knowledge", summary="搜索对冲知识库")
async def search_knowledge(
    query: str = Query(..., description="搜索关键词"),
    commodity_type: Optional[str] = Query(None, description="商品类型"),
    hedge_product_type: Optional[str] = Query(None, description="对冲工具"),
    doc_type: Optional[str] = Query(None, description="文档类型"),
    top_k: int = Query(5, ge=1, le=20, description="返回数量")
):
    """
    搜索对冲知识库
    
    参数：
    - query: 搜索文本（必填）
    - commodity_type: iron_ore, crude_oil, copper, shipping 等
    - hedge_product_type: futures, options, swaps, forwards
    - doc_type: strategy, risk_management, compliance, case_study
    - top_k: 返回结果数量（1-20）
    
    示例：
    ```
    GET /api/v2/hedging/search-knowledge?query=铁矿石对冲&commodity_type=iron_ore&doc_type=strategy
    ```
    """
    try:
        kb = get_hedging_knowledge_base()
        results = kb.search(
            query=query,
            doc_type=doc_type,
            top_k=top_k
        )
        
        return {
            "status": "success",
            "query": query,
            "filters": {
                "commodity_type": commodity_type,
                "hedge_product_type": hedge_product_type,
                "doc_type": doc_type
            },
            "results_count": len(results),
            "results": results
        }
    
    except Exception as e:
        logger.error(f"知识库搜索失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/strategy-by-scenario", summary="按场景获取对冲策略")
async def get_strategy_by_scenario(
    scenario: str = Query(
        ..., 
        description="场景类型",
        enum=[
            "iron_ore_import_hedge",
            "crude_oil_storage_protection",
            "shipping_cost_lock",
            "geopolitical_risk_response"
        ]
    )
):
    """
    按预定义场景获取对冲策略
    
    支持的场景：
    - iron_ore_import_hedge: 铁矿石进口对冲
    - crude_oil_storage_protection: 原油库存保护
    - shipping_cost_lock: 运费成本锁定
    - geopolitical_risk_response: 地缘风险应急
    
    示例：
    ```
    GET /api/v2/hedging/strategy-by-scenario?scenario=iron_ore_import_hedge
    ```
    """
    try:
        kb = get_hedging_knowledge_base()
        strategies = kb.get_strategy_by_scenario(scenario)
        
        return {
            "status": "success",
            "scenario": scenario,
            "strategies_count": len(strategies),
            "strategies": strategies
        }
    
    except Exception as e:
        logger.error(f"场景策略获取失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/crisis-response", summary="获取危机应对指导")
async def get_crisis_response(request: CrisisResponseRequest):
    """
    获取特定危机类型的应对指导和应急方案
    
    示例请求：
    ```json
    {
        "crisis_type": "geopolitical",
        "affected_commodities": ["iron_ore", "shipping"],
        "exposure_details": {
            "commodity": "iron_ore",
            "exposure_quantity": 100000,
            "exposure_price": 120
        }
    }
    ```
    
    支持的危机类型：
    - geopolitical: 地缘政治风险（如红海危机）
    - supply_chain: 供应链中断
    - price_spike: 商品价格暴涨
    - liquidity_crisis: 流动性危机
    """
    try:
        agent = get_hedging_agent()
        result = agent.get_crisis_response_guidance(request.crisis_type)
        return result
    
    except Exception as e:
        logger.error(f"危机应对指导生成失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/hedging-primers", summary="获取对冲基础知识")
async def get_hedging_primers(topic: Optional[str] = Query(None, description="主题")):
    """
    获取对冲基础知识和学习资料
    
    示例：
    ```
    GET /api/v2/hedging/hedging-primers?topic=basis_risk
    ```
    """
    try:
        kb = get_hedging_knowledge_base()
        
        # 搜索教育性内容
        primers = kb.search(
            query=topic or "对冲基础",
            doc_type="risk_management",
            top_k=5
        )
        
        return {
            "status": "success",
            "topic": topic,
            "primers": primers
        }
    
    except Exception as e:
        logger.error(f"知识库查询失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/market-guides", summary="获取交易所和市场指南")
async def get_market_guides(
    jurisdiction: Optional[str] = Query(None, description="司法管辖区（cn, us, eu, sg）")
):
    """
    获取不同交易所和市场的交易指南
    
    示例：
    ```
    GET /api/v2/hedging/market-guides?jurisdiction=cn
    ```
    """
    try:
        kb = get_hedging_knowledge_base()
        
        query = f"{jurisdiction} 交易所规则" if jurisdiction else "交易所规则"
        guides = kb.search(
            query=query,
            doc_type="compliance",
            top_k=5
        )
        
        return {
            "status": "success",
            "jurisdiction": jurisdiction,
            "guides": guides
        }
    
    except Exception as e:
        logger.error(f"市场指南查询失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/kb-stats", summary="获取知识库统计信息")
async def get_kb_stats():
    """
    获取知识库的统计信息和覆盖范围
    """
    try:
        kb = get_hedging_knowledge_base()
        
        stats = {
            "total_documents": len(kb.documents),
            "strategies": sum(1 for doc in kb.documents.values() if doc.doc_type == "strategy"),
            "risk_management": sum(1 for doc in kb.documents.values() if doc.doc_type == "risk_management"),
            "compliance": sum(1 for doc in kb.documents.values() if doc.doc_type == "compliance"),
            "case_studies": sum(1 for doc in kb.documents.values() if doc.doc_type == "case_study"),
            "commodities": list(set(doc.commodity_type.value for doc in kb.documents.values())),
            "hedge_products": list(set(doc.hedge_product_type.value for doc in kb.documents.values())),
            "jurisdictions": list(set(doc.jurisdiction.value for doc in kb.documents.values())),
            "last_updated": "2024-01-18"
        }
        
        return {
            "status": "success",
            "statistics": stats
        }
    
    except Exception as e:
        logger.error(f"统计信息查询失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health", summary="健康检查")
async def health_check():
    """检查对冲知识库服务状态"""
    try:
        kb = get_hedging_knowledge_base()
        agent = get_hedging_agent()
        
        return {
            "status": "healthy",
            "service": "Hedging Expert Knowledge Base",
            "documents_loaded": len(kb.documents),
            "agent_active": True
        }
    
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
