import asyncio
import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import WebSocket

from core.crew_maritime_compliance import build_maritime_compliance_crew
from services.visual_risk_service import get_visual_risk_analyzer

logger = logging.getLogger(__name__)

class RealTimeCrisisController:
    """
    Real-Time Crisis Analysis Controller
    Uses real CrewAI agents and Gemini to analyze arbitrary routes.
    """
    
    def __init__(self, origin_port: str, destination_port: str):
        self.origin_name = origin_port
        self.destination_name = destination_port
        self.is_playing = False
        self.confirmation_event = asyncio.Event()
        self.confirmation_action = None
        
        # Mapping names to codes (fallback to name if not found)
        self.port_mapping = {
            'Shanghai': 'CNSHA',
            'Singapore': 'SGSIN',
            'Rotterdam': 'NLRTM',
            'Los Angeles': 'USLAX',
            'Long Beach': 'USLGB',
            'Hong Kong': 'HKHKG',
            'Shenzhen': 'CNSZX',
            'Busan': 'KRPUS',
            'Hamburg': 'DEHAM',
            'Antwerp': 'BEANR',
            'Dubai': 'AEJEA',
            'Mumbai': 'INBOM',
            'Tokyo': 'JPTYO',
            'New York': 'USNYC',
            'Felixstowe': 'GBFXT',
            'Colombo': 'LKCMB',
            'Tanjung Pelepas': 'MYTPP',
            'Port Klang': 'MYPKG',
        }
        
    def get_port_code(self, name: str) -> str:
        return self.port_mapping.get(name, name)

    def _map_role_to_id(self, role: str) -> str:
        role_lower = role.lower()
        if 'market' in role_lower or 'sentinel' in role_lower:
            return 'market_sentinel'
        if 'risk' in role_lower or 'hedger' in role_lower or 'financial' in role_lower:
            return 'risk_hedger'
        if 'logistics' in role_lower or 'orchestrator' in role_lower:
            return 'logistics'
        if 'compliance' in role_lower or 'specialist' in role_lower:
            return 'compliance'
        if 'adversarial' in role_lower or 'challenger' in role_lower:
            return 'adversarial'
        return 'compliance' # default

    def confirm_decision(self, action: str):
        self.confirmation_action = action
        self.confirmation_event.set()

    async def run_demo_sequence(self, websocket: WebSocket):
        try:
            # 1. Normal State
            await websocket.send_json({
                "type": "STATE_UPDATE",
                "timestamp": datetime.now().isoformat(),
                "phase": "normal",
                "data": {
                    "shipments": [],
                    "risk_score": 5.0
                }
            })
            await asyncio.sleep(3)

            # 2. Black Swan Trigger (Real Gemini Analysis Start)
            await websocket.send_json({
                "type": "ALERT",
                "timestamp": datetime.now().isoformat(),
                "severity": "ELEVATED",
                "title": f"Analyzing Route: {self.origin_name} to {self.destination_name}",
                "description": "Geopolitical risk scanners detected potential disruptions in major corridors. Initiating multi-agent compliance and risk assessment.",
                "source": "Global Risk Sentinel"
            })
            await asyncio.sleep(2)

            # 3. Visual Risk (Gemini Vision)
            await websocket.send_json({
                "type": "VISUAL_RISK_START",
                "timestamp": datetime.now().isoformat(),
                "message": "Analyzing key maritime chokepoints via Gemini Vision",
                "source": "Live Satellite Feed",
                "location": "Global Corridor Analysis"
            })
            
            try:
                analyzer = get_visual_risk_analyzer()
                # For dynamic demo, we might analyze a relevant chokepoint based on the route
                # but for simplicity, let's stick to Suez/Hormuz context or a default
                result = await analyzer.analyze_image(coordinates=(30.45, 32.35))
                await websocket.send_json({
                    "type": "VISUAL_RISK_RESULT",
                    "timestamp": datetime.now().isoformat(),
                    "analysis": result.to_dict()
                })
            except Exception as e:
                logger.error(f"Visual risk analysis failed: {e}")
            
            await asyncio.sleep(2)

            # 4. Multi-Agent Reasoning (CrewAI + Gemini)
            await websocket.send_json({
                "type": "COT_START",
                "timestamp": datetime.now().isoformat(),
                "message": "Assembling CrewAI Agent Task Force",
                "total_steps": 5
            })

            # Initialize Crew
            vessel_info = {
                "name": "Vessel Orion",
                "imo_number": "9912345",
                "vessel_type": "container",
                "flag_state": "Singapore",
                "gross_tonnage": 65000
            }
            route_ports = [self.get_port_code(self.origin_name), self.get_port_code(self.destination_name)]
            user_documents = [] # Could add some demo docs here

            crew, tasks = build_maritime_compliance_crew(vessel_info, route_ports, user_documents)
            
            # EXECUTION: Running CrewAI
            logger.info("Executing CrewAI for dynamic demo...")
            
            # For now, let's notify the UI of task starts
            for i, task in enumerate(tasks):
                await websocket.send_json({
                    "type": "COT_STEP",
                    "timestamp": datetime.now().isoformat(),
                    "step_index": i,
                    "total_steps": len(tasks),
                    "data": {
                        "step_id": f"realtime-step-{i}",
                        "agent_id": self._map_role_to_id(task.agent.role),
                        "action": "analyze",
                        "title": task.agent.role,
                        "content": f"Analyzing compliance and risks for {self.origin_name} to {self.destination_name} route...",
                        "status": "thinking",
                        "confidence": 0.95,
                        "azure_service": "Azure OpenAI / Gemini"
                    }
                })
                # Simulate some progress for UI
                await asyncio.sleep(2)
                
            # Final kickoff to get the real result
            result = await asyncio.to_thread(crew.kickoff)
            
            # 5. Final Decision
            # Parse the final structured result if possible
            final_json = {}
            try:
                # Attempt to extract JSON from result.raw or result
                raw_text = str(result.raw) if hasattr(result, 'raw') else str(result)
                import re
                json_match = re.search(r"\{.*\}", raw_text, re.DOTALL)
                if json_match:
                    final_json = json.loads(json_match.group())
            except:
                final_json = {
                    "final_recommendation": str(result),
                    "recommendation_details": {"route": f"{self.origin_name} -> {self.destination_name}"}
                }

            await websocket.send_json({
                "type": "DECISION_READY",
                "timestamp": datetime.now().isoformat(),
                "data": {
                    "decision_id": "REAL-TIME-001",
                    "final_recommendation": final_json.get("final_recommendation", "Adjust route based on current risks"),
                    "recommendation_details": final_json.get("recommendation_details", final_json),
                    "approval_options": [
                        {"id": "approve", "label": "Approve Gemini Decision", "action": "execute_reroute"},
                        {"id": "manual", "label": "Manual Override", "action": "escalate"}
                    ]
                }
            })

            # Wait for confirmation
            self.confirmation_event.clear()
            await websocket.send_json({
                "type": "AWAITING_CONFIRMATION",
                "timestamp": datetime.now().isoformat()
            })
            
            await self.confirmation_event.wait()

            # Execution Animation
            await websocket.send_json({
                "type": "EXECUTION_START",
                "timestamp": datetime.now().isoformat(),
                "message": "Executing dynamic reroute strategy"
            })
            
            await asyncio.sleep(3)
            await websocket.send_json({
                "type": "EXECUTION_COMPLETE",
                "timestamp": datetime.now().isoformat(),
                "data": {
                    "final_status": "EXECUTED",
                    "actions_completed": ["Carrier notification sent", "Insurance adjusted"]
                }
            })

            await websocket.send_json({
                "type": "DEMO_COMPLETE",
                "timestamp": datetime.now().isoformat(),
                "message": "Analysis Complete: Route Secured via Gemini Agent Crew"
            })

        except Exception as e:
            logger.error(f"Error in dynamic demo: {e}", exc_info=True)
            await websocket.send_json({
                "type": "ERROR",
                "message": f"Real-time analysis error: {str(e)}"
            })
