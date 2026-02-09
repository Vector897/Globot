from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import uuid
import random
import json
import urllib.request

router = APIRouter(prefix="/api/v2/market-sentinel", tags=["market-sentinel"])

# --- Data Models ---
class Lane(BaseModel):
    origin: str
    destination: str
    commodities: Optional[List[str]] = None

class Sensitivity(BaseModel):
    min_severity: Optional[str] = None
    min_confidence: Optional[float] = None

class MarketSentinelRequest(BaseModel):
    watchlist: Dict[str, Any]
    time_window_hours: int = 24
    sensitivity: Optional[Sensitivity] = None

class MarketSentinelResponse(BaseModel):
    thread_id: str
    signal_packet: Dict[str, Any]
    raw_text: str
    request_echo: Dict[str, Any]


def _agent_debug_log(hypothesis_id: str, location: str, message: str, data: Dict[str, Any]) -> None:
    payload = {
        "runId": "pre-fix",
        "hypothesisId": hypothesis_id,
        "location": location,
        "message": message,
        "data": data,
        "timestamp": int(datetime.utcnow().timestamp() * 1000),
    }
    try:
        req = urllib.request.Request(
            "http://127.0.0.1:7242/ingest/05d36e09-cd94-4f96-af55-b3946c76739f",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=1):
            pass
    except Exception:
        pass

# --- Mock Logic ---

def generate_red_sea_crisis_packet(origin, destination):
    """Simulate Critical Red Sea Crisis (e.g. for Europe routes)"""
    return {
        "signal_id": f"sig-redsea-{uuid.uuid4().hex[:6]}",
        "timestamp_utc": datetime.utcnow().isoformat() + "Z",
        "summary": "CRITICAL ALERT: Houthi missile activity detected in Bab el-Mandeb Strait. Multiple commercial vessels targeting reported. Insurance premiums rising sharply.",
        "affected_lanes": [
            {
                "origin": origin,
                "destination": destination,
                "risk": "missile_threat_high"
            }
        ],
        "entities": [
            {"name": "Houthi Rebels", "type": "militia"},
            {"name": "Bab el-Mandeb Strait", "type": "location"},
            {"name": "Maersk Gibraltar", "type": "vessel"},
            {"name": "US CENTCOM", "type": "organization"}
        ],
        "severity": "CRITICAL",
        "expected_horizon_days": 14,
        "recommended_next_flows": [
            "Initiate immediate reroute via Cape of Good Hope",
            "Activate war risk insurance protocols",
            "Notify end-customers of 10-14 day delay"
        ],
        "citations": [
            {"title": "UKMTO Security Warnings", "url": "https://www.ukmto.org/indian-ocean/warnings"},
            {"title": "Reuters: Shipping firms pause Red Sea transits", "url": "https://reuters.com/business/red-sea-crisis"}
        ],
        "confidence": 0.95
    }

def generate_la_congestion_packet(origin, destination):
    """Simulate Port Congestion (e.g. for US West Coast)"""
    return {
        "signal_id": f"sig-lax-{uuid.uuid4().hex[:6]}",
        "timestamp_utc": datetime.utcnow().isoformat() + "Z",
        "summary": "MEDIUM ALERT: Labor negotiations stalled at Port of Los Angeles/Long Beach. ILWU slow-down tactics impacting turnaround times. 5-7 day berthing delays expected.",
        "affected_lanes": [
            {
                "origin": origin,
                "destination": destination,
                "risk": "labor_dispute_congestion"
            }
        ],
        "entities": [
            {"name": "Port of Los Angeles", "type": "infrastructure"},
            {"name": "ILWU ", "type": "organization"},
            {"name": "PMA", "type": "organization"}
        ],
        "severity": "MEDIUM",
        "expected_horizon_days": 21,
        "recommended_next_flows": [
            "Consider diversion to Oakland or Seattle-Tacoma",
            "Prioritize air freight for critical components"
        ],
        "citations": [
            {"title": "JOC: West Coast labor talks stall", "url": "https://joc.com/maritime-news"},
            {"title": "FreightWaves: LAX Queues lengthen", "url": "https://freightwaves.com/news"}
        ],
        "confidence": 0.75
    }

def generate_normal_packet(origin, destination):
    """Simulate Normal Operations"""
    return {
        "signal_id": f"sig-norm-{uuid.uuid4().hex[:6]}",
        "timestamp_utc": datetime.utcnow().isoformat() + "Z",
        "summary": "Standard operations detected. No significant geopolitical or meteorological disruptions reported on this route.",
        "affected_lanes": [
            {
                "origin": origin,
                "destination": destination,
                "risk": "minimal"
            }
        ],
        "entities": [
            {"name": "Global Trade", "type": "topic"}
        ],
        "severity": "LOW",
        "expected_horizon_days": 0,
        "recommended_next_flows": [
            "Continue standard monitoring"
        ],
        "citations": [],
        "confidence": 0.98
    }

@router.post("/run", response_model=MarketSentinelResponse)
async def run_analysis(request: MarketSentinelRequest):
    # Extract route info
    lanes = request.watchlist.get("lanes", [])
    origin = "Unknown"
    destination = "Unknown"
    
    if lanes:
        first_lane = lanes[0]
        origin = first_lane.get("origin", "Unknown")
        destination = first_lane.get("destination", "Unknown")
    # #region agent log
    _agent_debug_log(
        "H2",
        "backend/api/v2/market_sentinel_routes.py:run_analysis",
        "Received Market Sentinel request route context",
        {
            "lanesCount": len(lanes),
            "firstLane": lanes[0] if lanes else None,
            "origin": origin,
            "destination": destination,
            "entitiesCount": len(request.watchlist.get("entities", [])),
        },
    )
    # #endregion
    
    # 1. Determine Scenario based on Route
    # Shanghai (CNSHA/CNNGB) -> Rotterdam (NLRTM/DEHAM) = Red Sea Crisis
    is_europe_route = (origin in ["CNSHA", "CNNGB", "CNSZX", "Shanghai"]) and (destination in ["NLRTM", "DEHAM", "BEANR", "Rotterdam"])
    
    # Shanghai -> LA/Long Beach (USLAX/USLGB) = Congestion
    is_us_route = (origin in ["CNSHA", "CNNGB"]) and (destination in ["USLAX", "USLGB", "Los Angeles"])
    # #region agent log
    _agent_debug_log(
        "H5",
        "backend/api/v2/market_sentinel_routes.py:run_analysis",
        "Route classification decision",
        {
            "origin": origin,
            "destination": destination,
            "is_europe_route": is_europe_route,
            "is_us_route": is_us_route,
            "selectedBranch": "europe" if is_europe_route else ("us" if is_us_route else "normal"),
        },
    )
    # #endregion
    
    if is_europe_route:
        packet = generate_red_sea_crisis_packet(origin, destination)
        raw_text = "AI ANALYSIS: High-confidence signals of hostile activity in Red Sea region affecting trade route."
    elif is_us_route:
        packet = generate_la_congestion_packet(origin, destination)
        raw_text = "AI ANALYSIS: Union negotations breakdown detected. Port efficiency metrics declining."
    else:
        # Default/Fallback
        packet = generate_normal_packet(origin, destination)
        raw_text = "AI ANALYSIS: Routine patterns observed. No anomalies."

    return {
        "thread_id": str(uuid.uuid4()),
        "signal_packet": packet,
        "raw_text": raw_text,
        "request_echo": request.dict()
    }

@router.get("/health")
async def health_check():
    return {"status": "healthy", "mode": "high_fidelity_mock"}

@router.get("/agents/status")
async def get_agents_status():
    return {"agents": [{"name": "MockAgent", "status": "active"}]}
