"""
Visual Risk API Routes

Endpoints for visual risk analysis using Gemini Vision.
Supports satellite imagery and video analysis for supply chain risks.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
import logging

from services.visual_risk_service import get_visual_risk_analyzer, VisualRiskResult

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/visual-risk", tags=["Visual Risk"])


@router.get("/status")
async def get_service_status():
    """Get Visual Risk service status"""
    analyzer = get_visual_risk_analyzer()
    
    # Simple reachability check for Google Maps (optional but good for debugging)
    static_maps_reachable = False
    if analyzer.api_key:
        try:
            # Try to fetch a tiny image to verify key permissions
            test = await analyzer.download_satellite_image(0, 0, zoom=1)
            static_maps_reachable = test is not None
        except:
            pass

    return {
        "status": "operational",
        "service": "visual_risk_analyzer",
        "model": analyzer.model,
        "api_configured": bool(analyzer.api_key),
        "static_maps_reachable": static_maps_reachable,
        "capabilities": [
            "satellite_imagery_analysis",
            "canal_blockage_detection",
            "port_congestion_detection",
            "weather_hazard_detection",
            "real_time_satellite_fetching"
        ]
    }


@router.get("/demo")
async def get_demo_analysis(scenario: str = "suez_blockage"):
    """
    Get demo visual risk analysis result.
    
    Supported scenarios:
    - suez_blockage: Suez Canal blockage (Ever Given style)
    - port_congestion: Rotterdam port congestion
    """
    analyzer = get_visual_risk_analyzer()
    
    if scenario not in ["suez_blockage", "port_congestion"]:
        scenario = "suez_blockage"
    
    result = await analyzer.get_demo_analysis(scenario)
    
    return {
        "success": True,
        "scenario": scenario,
        "analysis": result.to_dict(),
        "demo_mode": True
    }


@router.post("/analyze")
async def analyze_image(
    file: UploadFile = File(...),
    source_type: str = "satellite"
):
    """
    Analyze uploaded image for supply chain risks.
    
    Args:
        file: Image file (JPEG, PNG, WebP)
        source_type: Type of source (satellite, news, camera)
        
    Returns:
        Visual risk analysis result
    """
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {allowed_types}"
        )
    
    # Read file content
    try:
        content = await file.read()
        if len(content) > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    except Exception as e:
        logger.error(f"Failed to read uploaded file: {e}")
        raise HTTPException(status_code=400, detail="Failed to read file")
    
    # Analyze with Gemini Vision
    analyzer = get_visual_risk_analyzer()
    
    try:
        result = await analyzer.analyze_image(
            image_bytes=content,
            mime_type=file.content_type or "image/jpeg"
        )
        result.source_type = source_type
        
        return {
            "success": True,
            "filename": file.filename,
            "analysis": result.to_dict()
        }
        
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        # Return demo result on error
        demo_result = await analyzer.get_demo_analysis()
        return {
            "success": True,
            "filename": file.filename,
            "analysis": demo_result.to_dict(),
            "fallback": True,
            "error": str(e)
        }


@router.get("/scenarios")
async def list_demo_scenarios():
    """List available demo scenarios for visual risk analysis"""
    return {
        "scenarios": [
            {
                "id": "suez_blockage",
                "name": "Suez Canal Blockage",
                "description": "Major container vessel blocking Suez Canal (Ever Given scenario)",
                "severity": "critical",
                "image_type": "satellite"
            },
            {
                "id": "port_congestion",
                "name": "Rotterdam Port Congestion", 
                "description": "Severe congestion at Rotterdam port with vessel queues",
                "severity": "high",
                "image_type": "drone/camera"
            }
        ]
    }
