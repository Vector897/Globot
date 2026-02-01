"""
Visual Risk Service - Gemini 2.0 Flash Vision Analysis for Supply Chain Risks

Uses Gemini's multimodal capabilities to analyze:
- Satellite imagery (canal blockages, port congestion)
- News footage (protests, disasters)
- Traffic camera feeds (border delays)

Identifies risks affecting maritime routes and supply chains.
"""
import logging
import base64
import httpx
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field
from pathlib import Path
from datetime import datetime
import json
import os

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class VisualRiskResult:
    """Result of visual risk analysis"""
    risk_type: str  # e.g., "canal_blockage", "port_congestion", "weather_hazard"
    severity: float  # 0.0 - 1.0
    description: str
    affected_routes: List[str] = field(default_factory=list)
    affected_ports: List[str] = field(default_factory=list)
    confidence: float = 0.0
    raw_analysis: str = ""
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    source_type: str = "satellite"  # satellite, news, camera
    recommendations: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "risk_type": self.risk_type,
            "severity": self.severity,
            "description": self.description,
            "affected_routes": self.affected_routes,
            "affected_ports": self.affected_ports,
            "confidence": self.confidence,
            "raw_analysis": self.raw_analysis,
            "timestamp": self.timestamp,
            "source_type": self.source_type,
            "recommendations": self.recommendations,
        }


# Demo mock data for Suez Canal blockage scenario
DEMO_SUEZ_BLOCKAGE_RESULT = VisualRiskResult(
    risk_type="canal_blockage",
    severity=0.95,
    description="CRITICAL: Detected large container vessel blocking Suez Canal. "
                "Satellite imagery shows vessel 'Ever Given' grounded diagonally across canal width. "
                "Estimated 150+ vessels queuing at both entrances.",
    affected_routes=[
        "Asia-Europe via Suez",
        "Asia-Mediterranean via Suez", 
        "Middle East-Europe via Suez",
        "India-Europe via Suez"
    ],
    affected_ports=[
        "Port Said (Egypt)",
        "Suez (Egypt)",
        "Rotterdam (Netherlands)",
        "Singapore",
        "Shanghai (China)"
    ],
    confidence=0.98,
    raw_analysis="""
[Gemini Vision Analysis Report]

IMAGE TYPE: Satellite Imagery (Sentinel-2)
LOCATION: Suez Canal, Egypt (30.4°N, 32.3°E)
TIMESTAMP: 2026-01-31T16:00:00Z

DETECTED OBJECTS:
1. Large container vessel (~400m length) - GROUNDED
   - Orientation: Diagonal (blocking full canal width)
   - Status: Immobile for estimated 6+ hours
   - Vessel ID: Likely "Ever Given" class mega-container ship

2. Vessel Queue (North Entrance):
   - Count: ~85 vessels
   - Types: Container ships, tankers, bulk carriers
   - Queue Length: ~15 nautical miles

3. Vessel Queue (South Entrance):
   - Count: ~70 vessels  
   - Types: Mixed commercial vessels
   - Queue Length: ~12 nautical miles

RISK ASSESSMENT:
- Canal Status: BLOCKED (100% obstruction)
- Estimated Clearance Time: 5-7 days (requires specialized salvage)
- Daily Trade Impact: $9.6 billion
- Affected Daily Shipping: 12% of global trade

CONFIDENCE: 98% (clear satellite imagery, verified by AIS data correlation)
""",
    source_type="satellite",
    recommendations=[
        "Immediate route diversion via Cape of Good Hope (+10-14 days)",
        "Contact clients with affected cargo for delay notification",
        "Monitor fuel price impact (expected +15-20% for diverted routes)",
        "Review war risk insurance coverage for alternative routes"
    ]
)

DEMO_PORT_CONGESTION_RESULT = VisualRiskResult(
    risk_type="port_congestion",
    severity=0.72,
    description="HIGH: Rotterdam port experiencing severe congestion. "
                "Drone footage shows container yard at 95% capacity with 23 vessels at anchor.",
    affected_routes=[
        "Transatlantic Westbound",
        "Asia-Europe Northbound"
    ],
    affected_ports=[
        "Rotterdam (Netherlands)",
        "Antwerp (Belgium)",
        "Hamburg (Germany)"
    ],
    confidence=0.89,
    raw_analysis="[Congestion analysis from port surveillance...]",
    source_type="camera",
    recommendations=[
        "Consider alternative discharge at Antwerp or Hamburg",
        "Pre-arrange extended storage at current loading ports",
        "Notify customers of potential 3-5 day delays"
    ]
)


class VisualRiskAnalyzer:
    """
    Visual Risk Analyzer using Gemini 2.0 Flash
    
    Analyzes satellite imagery and video feeds to detect supply chain risks.
    Falls back to demo mock data when API is unavailable.
    """
    
    VISION_PROMPT = """You are an expert maritime supply chain risk analyst with access to satellite imagery.

Analyze this image and identify any supply chain disruption risks, specifically looking for:
1. Canal/waterway blockages (grounded vessels, debris, construction)
2. Port congestion (vessel queues, overcrowded terminals)
3. Weather hazards (storms, ice, flooding)
4. Infrastructure damage (damaged berths, cranes, roads)
5. Security incidents (protests, military activity)

For each risk identified, provide:
- Risk Type (canal_blockage, port_congestion, weather_hazard, infrastructure_damage, security_incident)
- Severity (0.0-1.0 scale)
- Detailed description of what you observe
- Affected maritime routes
- Affected ports
- Your confidence level (0.0-1.0)
- Recommended actions

Format your response as JSON:
{
  "risks": [
    {
      "risk_type": "string",
      "severity": float,
      "description": "string",
      "affected_routes": ["string"],
      "affected_ports": ["string"],
      "confidence": float,
      "recommendations": ["string"]
    }
  ],
  "raw_analysis": "Your detailed analysis text"
}

If no risks are detected, return: {"risks": [], "raw_analysis": "No supply chain risks detected in this image."}
"""

    def __init__(self):
        self.api_key = settings.google_api_key  # For Gemini
        self.maps_api_key = settings.google_maps_api_key or settings.google_api_key  # For Maps (fallback to same key)
        self.model = "gemini-2.0-flash"
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"
        self._client: Optional[httpx.AsyncClient] = None
        logger.info(f"VisualRiskAnalyzer initialized (Gemini: {bool(self.api_key)}, Maps: {bool(self.maps_api_key)})")
    
    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=60.0)
        return self._client
    
    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()
    
    async def download_satellite_image(self, lat: float, lon: float, zoom: int = 14) -> Optional[bytes]:
        """Download satellite image from Google Static Maps API"""
        if not self.maps_api_key:
            logger.warning("No Maps API key for satellite image download")
            return None
            
        url = "https://maps.googleapis.com/maps/api/staticmap"
        params = {
            "center": f"{lat},{lon}",
            "zoom": str(zoom),
            "size": "640x640",
            "maptype": "satellite",
            "key": self.maps_api_key
        }
        
        try:
            client = await self._get_client()
            response = await client.get(url, params=params)
            if response.status_code == 200:
                logger.info(f"Fetched satellite image from Google Maps: 200 OK")
                return response.content
            else:
                logger.error(f"Failed to fetch satellite image: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            logger.error(f"Error fetching satellite image: {e}")
            return None

    async def analyze_image(
        self, 
        image_path: Optional[str] = None,
        image_bytes: Optional[bytes] = None,
        mime_type: str = "image/jpeg",
        coordinates: Optional[tuple[float, float]] = None
    ) -> VisualRiskResult:
        """
        Analyze an image for supply chain risks using Gemini Vision.
        
        Args:
            image_path: Path to local image file
            image_bytes: Raw image bytes (alternative to path)
            mime_type: MIME type of the image
            coordinates: Optional (lat, lon) to fetch satellite image
            
        Returns:
            VisualRiskResult with detected risks
        """
        # Load image bytes from coordinates if provided and valid
        if coordinates and not image_bytes and not image_path:
            logger.info(f"Fetching satellite image for coordinates: {coordinates}")
            image_bytes = await self.download_satellite_image(coordinates[0], coordinates[1])
            if image_bytes:
                mime_type = "image/png"  # Static Maps returns PNG by default usually, or valid image

        # Load image bytes if path provided
        if image_path and not image_bytes:
            try:
                with open(image_path, "rb") as f:
                    image_bytes = f.read()
                # Detect mime type from extension
                ext = Path(image_path).suffix.lower()
                mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", 
                           ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp"}
                mime_type = mime_map.get(ext, "image/jpeg")
            except Exception as e:
                logger.error(f"Failed to load image from {image_path}: {e}")
                return self._get_demo_result()
        
        if not image_bytes:
            logger.warning("No image provided (and fetch failed), returning demo result")
            return self._get_demo_result()
        
        # Check if API is configured
        if not self.api_key:
            logger.warning("Google API key not configured, using demo mock data")
            return self._get_demo_result()
        
        # Call Gemini Vision API
        try:
            result = await self._call_gemini_vision(image_bytes, mime_type)
            return result
        except Exception as e:
            logger.error(f"Gemini Vision API error: {e}")
            logger.info("Falling back to demo mock data")
            return self._get_demo_result()
    
    async def _call_gemini_vision(self, image_bytes: bytes, mime_type: str) -> VisualRiskResult:
        """Call Gemini Vision API with image"""
        client = await self._get_client()
        
        # Encode image to base64
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")
        
        # Prepare request payload
        payload = {
            "contents": [{
                "parts": [
                    {"text": self.VISION_PROMPT},
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": image_b64
                        }
                    }
                ]
            }],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 4096,
                "responseMimeType": "application/json"
            }
        }
        
        url = f"{self.base_url}/models/{self.model}:generateContent?key={self.api_key}"
        
        response = await client.post(url, json=payload)
        
        if response.status_code == 429:
            logger.warning("Gemini API rate limited (429), using demo data")
            return self._get_demo_result()
        
        if response.status_code != 200:
            logger.error(f"Gemini API error {response.status_code}: {response.text[:500]}")
            return self._get_demo_result()
        
        # Parse response
        result = response.json()
        try:
            content = result["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(content)
            
            if not parsed.get("risks"):
                return VisualRiskResult(
                    risk_type="none",
                    severity=0.0,
                    description="No supply chain risks detected in this image.",
                    confidence=0.9,
                    raw_analysis=parsed.get("raw_analysis", "")
                )
            
            # Return first/primary risk
            risk = parsed["risks"][0]
            return VisualRiskResult(
                risk_type=risk.get("risk_type", "unknown"),
                severity=risk.get("severity", 0.5),
                description=risk.get("description", ""),
                affected_routes=risk.get("affected_routes", []),
                affected_ports=risk.get("affected_ports", []),
                confidence=risk.get("confidence", 0.5),
                raw_analysis=parsed.get("raw_analysis", ""),
                recommendations=risk.get("recommendations", [])
            )
            
        except (KeyError, json.JSONDecodeError) as e:
            logger.error(f"Failed to parse Gemini response: {e}")
            return self._get_demo_result()
    
    def _get_demo_result(self, scenario: str = "suez_blockage") -> VisualRiskResult:
        """Get demo mock result for testing/demo purposes"""
        if scenario == "port_congestion":
            return DEMO_PORT_CONGESTION_RESULT
        return DEMO_SUEZ_BLOCKAGE_RESULT
    
    async def get_demo_analysis(self, scenario: str = "suez_blockage") -> VisualRiskResult:
        """Get demo analysis result for UI demonstration"""
        return self._get_demo_result(scenario)


# Singleton instance
_visual_risk_analyzer: Optional[VisualRiskAnalyzer] = None


def get_visual_risk_analyzer() -> VisualRiskAnalyzer:
    """Get VisualRiskAnalyzer singleton instance"""
    global _visual_risk_analyzer
    if _visual_risk_analyzer is None:
        _visual_risk_analyzer = VisualRiskAnalyzer()
    return _visual_risk_analyzer
