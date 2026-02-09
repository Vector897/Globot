"""
Financial Hedging API Routes

API endpoints for financial risk hedging functionality.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import logging

from core.hedge_agent import get_hedge_agent
from services.market_data_service import get_market_data_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/hedge", tags=["Financial Hedging"])


# ========== Request Models ==========

class HedgeOperationParams(BaseModel):
    """Operation parameters for hedging calculations"""
    fuel_consumption_monthly: float = 1000  # tons
    revenue_foreign_monthly: float = 1_800_000  # EUR
    fx_pair: str = "EUR"
    monthly_voyages: int = 4
    current_route: str = "Shanghai → Rotterdam"


class CrisisActivationRequest(BaseModel):
    """Request to activate crisis hedging mode"""
    crisis_scenario: str  # 'red_sea', 'fuel_spike', 'currency_crisis'
    operation_params: HedgeOperationParams


# ========== API Endpoints ==========

@router.post("/assess-risk")
def assess_hedging_risk(params: HedgeOperationParams):
    """
    Assess financial risk exposure.
    
    Returns risk assessment with VaR calculations for fuel, currency, and freight risks.
    
    Example response:
    ```json
    {
      "market_regime": "crisis",
      "urgency": "CRITICAL",
      "total_exposure_usd": 10000000,
"total_var_95_usd": 1500000,
      "risk_breakdown": {...}
    }
    ```
    """
    try:
        hedge_agent = get_hedge_agent()
        operation_dict = params.dict()
        risk_assessment = hedge_agent.assess_risk(operation_dict)
        return risk_assessment
    except Exception as e:
        logger.error(f"Risk assessment failed: {e}")
        raise HTTPException(status_code=500, detail=f"Risk assessment failed: {e}")


@router.post("/recommend")
def recommend_hedging_strategy(params: HedgeOperationParams, crisis_override: bool = False):
    """
    Get optimal hedging strategy recommendations.
    
    Returns comprehensive strategy with specific positions for fuel, currency, and freight.
    
    Args:
        params: Operation parameters
        crisis_override: Force crisis hedging mode (default: auto-detect from market)
    
    Example response:
    ```json
    {
      "regime": "normal",
      "fuel_hedging": {
        "hedge_ratio": "60.0%",
        "positions": [...]
      },
      "currency_hedging": {...},
      "freight_strategy": {...}
    }
    ```
    """
    try:
        hedge_agent = get_hedge_agent()
        operation_dict = params.dict()
        strategy = hedge_agent.recommend_hedging_strategy(operation_dict, crisis_override)
        return strategy
    except Exception as e:
        logger.error(f"Strategy recommendation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Strategy recommendation failed: {e}")


@router.post("/crisis-activate")
def activate_crisis_hedging(request: CrisisActivationRequest):
    """
    Activate emergency crisis hedging protocol.
    
    Returns crisis management plan with immediate actions and hedging strategy.
    
    Crisis scenarios:
    - 'red_sea': Red Sea / Suez Canal disruption
    - 'fuel_spike': Fuel price spike scenario
    - 'currency_crisis': Currency volatility crisis
    
    Example response:
    ```json
    {
      "alert_level": "CRITICAL",
      "immediate_actions": [...],
      "hedging_strategy": {...},
      "monitoring_protocol": {...}
    }
    ```
    """
    try:
        # Initialize agent with crisis scenario
        hedge_agent = get_hedge_agent(crisis_scenario=request.crisis_scenario)
        operation_dict = request.operation_params.dict()
        crisis_plan = hedge_agent.activate_crisis_hedging(operation_dict)
        return crisis_plan
    except Exception as e:
        logger.error(f"Crisis activation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Crisis activation failed: {e}")


@router.get("/market-data")
def get_market_data(crisis_scenario: Optional[str] = None):
    """
    Get current market data for all asset classes.
    
    Returns fuel prices, FX rates, freight rates, and crisis indicators.
    
    Args:
        crisis_scenario: Optional crisis scenario to simulate
    
    Example response:
    ```json
    {
      "market_regime": "normal",
      "crisis_indicators": [],
      "fuel": {...},
      "fx": {...},
      "freight": {...}
    }
    ```
    """
    try:
        market_service = get_market_data_service(crisis_scenario)
        market_summary = market_service.get_market_summary()
        return market_summary
    except Exception as e:
        logger.error(f"Market data retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=f"Market data retrieval failed: {e}")


@router.post("/report")
def generate_hedge_report(params: HedgeOperationParams):
    """
    Generate executive-level hedging report in natural language.
    
    Returns formatted text report with risk analysis and recommendations.
    
    Example response:
    ```json
    {
      "report": "======================================================================\\nFINANCIAL HEDGE AGENT REPORT\\n...",
      "timestamp": "2026-01-24T00:00:00Z"
    }
    ```
    """
    try:
        hedge_agent = get_hedge_agent()
        operation_dict = params.dict()
        report_text = hedge_agent.generate_agent_report(operation_dict)
        return {
            "report": report_text,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Report generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Report generation failed: {e}")


@router.get("/health")
def hedge_module_health():
    """
    Check health status of hedging module.
    
    Returns status of all hedging components.
    """
    try:
        # Test hedge agent
        hedge_agent = get_hedge_agent()
        
        # Test market data service
        market_service = get_market_data_service()
        market_data = market_service.get_market_summary()
        
        return {
            "status": "healthy",
            "hedge_agent": "initialized",
            "market_data_service": "initialized",
            "current_regime": market_data.get("market_regime", "unknown"),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
