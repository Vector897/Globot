import asyncio
from fastapi import WebSocket
from demo.crisis_455pm_data import CRISIS_TIMELINE
from demo.cot_data import (
    get_reasoning_steps_for_demo,
    get_debate_exchanges_for_demo,
    get_final_decision_for_demo,
    get_execution_steps_for_demo,
    get_execution_summary_for_demo
)
from services.visual_risk_service import get_visual_risk_analyzer
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class CrisisAutoPlayController:
    """
    Crisis Demo Auto-Play Controller
    
    Enhanced version: Integrates complete Chain-of-Thought (CoT) event emission
    Used for demonstrating transparent and traceable AI decision-making to Imagine Cup judges
    """
    
    def __init__(self):
        self.timeline = CRISIS_TIMELINE
        self.is_playing = False
        self.cot_steps = get_reasoning_steps_for_demo()
        self.debates = get_debate_exchanges_for_demo()
        self.final_decision = get_final_decision_for_demo()
        self.execution_steps = get_execution_steps_for_demo()
        self.execution_summary = get_execution_summary_for_demo()
        self.confirmation_event = asyncio.Event()  # 用于等待人工确认
        self.confirmation_action = None  # 存储用户的确认动作

    def confirm_decision(self, action: str):
        """接收用户的确认决策"""
        logger.info(f"User confirmation received: {action}")
        self.confirmation_action = action
        self.confirmation_event.set()

    async def run_demo_sequence(self, websocket: WebSocket):
        """
        Execute complete Demo sequence - about 60 seconds
        
        Timeline:
        - T+0s:   Normal state display
        - T+5s:   Black swan event trigger
        - T+8s:   CoT reasoning chain start (10 steps)
        - T+42s:  Adversarial debate start
        - T+52s:  Final decision presentation
        - T+60s:  Demo complete
        """
        try:
            # =====================================================
            # Phase 0: Normal State (0-5 seconds)
            # =====================================================
            logger.info("Demo Sequence: T0 - Normal State")
            await websocket.send_json({
                "type": "STATE_UPDATE",
                "timestamp": self.timeline["t0_normal_state"]["timestamp"],
                "phase": "normal",
                "data": self.timeline["t0_normal_state"]
            })
            await asyncio.sleep(5)

            # =====================================================
            # Phase 1: Black Swan Event (T+5s)
            # =====================================================
            logger.info("Demo Sequence: T1 - Black Swan Alert")
            await websocket.send_json({
                "type": "ALERT",
                "timestamp": self.timeline["t1_black_swan"]["timestamp"],
                "severity": "CRITICAL",
                "phase": "detection",
                "data": self.timeline["t1_black_swan"]
            })
            await asyncio.sleep(2)

            # =====================================================
            # Phase 1.5: Visual Risk Analysis (T+7s) - NEW!
            # Demonstrates Gemini Vision multimodal capabilities
            # =====================================================
            logger.info("Demo Sequence: T1.5 - Visual Risk Analysis (Gemini Vision)")
            
            # Send visual analysis start event
            await websocket.send_json({
                "type": "VISUAL_RISK_START",
                "timestamp": datetime.now().isoformat(),
                "message": "Initiating satellite imagery analysis via Gemini Vision",
                "source": "Google Static Maps API (Satellite)",
                "location": "Suez Canal, Egypt (30.45°N, 32.35°E)"
            })
            await asyncio.sleep(1.0)
            
            # Call real Gemini Vision API with Satellite Image
            # Coordinates for Suez Canal (Ever Given location approx)
            try:
                analyzer = get_visual_risk_analyzer()
                result = await analyzer.analyze_image(
                    coordinates=(30.45, 32.35) 
                )
                
                # Send visual analysis result
                await websocket.send_json({
                    "type": "VISUAL_RISK_RESULT",
                    "timestamp": datetime.now().isoformat(),
                    "analysis": result.to_dict()
                })
            except Exception as e:
                logger.error(f"Visual risk analysis fail in demo: {e}")
                # Fallback purely handled by service, but if service crashes, we catch here
                await websocket.send_json({
                    "type": "ERROR",
                    "timestamp": datetime.now().isoformat(),
                    "message": "Visual analysis service temporarily unavailable"
                })
            await asyncio.sleep(1.5)

            # =====================================================
            # Phase 2: Chain-of-Thought Reasoning Chain (T+8s - T+42s)
            # =====================================================
            logger.info("Demo Sequence: T2 - CoT Reasoning Chain Started")
            
            # Send CoT start event
            await websocket.send_json({
                "type": "COT_START",
                "timestamp": datetime.now().isoformat(),
                "message": "Multi-Agent reasoning chain initiated",
                "total_steps": len(self.cot_steps)
            })
            
            # Send each reasoning step
            for i, step in enumerate(self.cot_steps):
                # Send single step reasoning event
                await websocket.send_json({
                    "type": "COT_STEP",
                    "timestamp": datetime.now().isoformat(),
                    "step_index": i,
                    "total_steps": len(self.cot_steps),
                    "data": step
                })
                
                # If there are RAG sources, send citation event
                if step.get("sources"):
                    await asyncio.sleep(0.5)  # Brief delay before sending citation
                    await websocket.send_json({
                        "type": "RAG_CITATION",
                        "timestamp": datetime.now().isoformat(),
                        "step_id": step["step_id"],
                        "agent_id": step["agent_id"],
                        "sources": step["sources"]
                    })
                
                # Delay between steps
                delay = step.get("delay_seconds", 3)
                await asyncio.sleep(delay)

            # =====================================================
            # Phase 3: Adversarial Debate (T+42s - T+52s)
            # =====================================================
            logger.info("Demo Sequence: T3 - Adversarial Debate Started")
            
            # Send debate start event
            await websocket.send_json({
                "type": "DEBATE_START",
                "timestamp": datetime.now().isoformat(),
                "message": "Adversarial Agent initiating challenge sequence",
                "total_exchanges": len(self.debates)
            })
            await asyncio.sleep(1)
            
            # Send each debate exchange
            for i, exchange in enumerate(self.debates):
                # Send challenge
                await websocket.send_json({
                    "type": "DEBATE_CHALLENGE",
                    "timestamp": datetime.now().isoformat(),
                    "exchange_index": i,
                    "data": {
                        "exchange_id": exchange["exchange_id"],
                        "challenger": exchange["challenger_agent"],
                        "defender": exchange["defender_agent"],
                        "challenge": exchange["challenge"],
                        "reason": exchange["challenge_reason"]
                    }
                })
                await asyncio.sleep(2)
                
                # Send response
                await websocket.send_json({
                    "type": "DEBATE_RESPONSE",
                    "timestamp": datetime.now().isoformat(),
                    "exchange_index": i,
                    "data": {
                        "exchange_id": exchange["exchange_id"],
                        "response": exchange["response"]
                    }
                })
                await asyncio.sleep(1.5)
                
                # Send resolution
                await websocket.send_json({
                    "type": "DEBATE_RESOLVE",
                    "timestamp": datetime.now().isoformat(),
                    "exchange_index": i,
                    "data": {
                        "exchange_id": exchange["exchange_id"],
                        "resolution": exchange["resolution"],
                        "accepted": exchange["resolution_accepted"],
                        "sources": exchange.get("sources", [])
                    }
                })
                await asyncio.sleep(1.5)

            # =====================================================
            # Phase 4: Final Decision (T+52s - T+58s)
            # =====================================================
            logger.info("Demo Sequence: T4 - Final Decision")
            
            await websocket.send_json({
                "type": "DECISION_READY",
                "timestamp": datetime.now().isoformat(),
                "data": self.final_decision
            })
            await asyncio.sleep(3)
            
            # Send tactical options (compatible with old UI)
            await websocket.send_json({
                "type": "TACTICAL_OPTIONS",
                "timestamp": self.timeline["t3_tactical_options"]["timestamp"],
                "options": self.timeline["t3_tactical_options"]["options"]
            })
            await asyncio.sleep(3)

            # =====================================================
            # Phase 5: Awaiting User Confirmation (T+58s)
            # =====================================================
            logger.info("Demo Sequence: T5 - Awaiting Confirmation")
            
            # Clear event BEFORE asking user, to ensure we capture any subsequent click
            self.confirmation_event.clear() 
            
            await websocket.send_json({
                "type": "AWAITING_CONFIRMATION",
                "timestamp": datetime.now().isoformat(),
                "message": "Awaiting user approval to execute reroute",
                "options": self.final_decision.get("approval_options", [])
            })
            
            # 等待人工确认（必须人为决策才能继续）
            logger.info("Waiting for human approval...")
            await self.confirmation_event.wait()  # 阻塞，直到用户点击确认按钮
            
            # 发送确认接收事件
            await websocket.send_json({
                "type": "CONFIRMATION_RECEIVED",
                "timestamp": datetime.now().isoformat(),
                "action": self.confirmation_action or "approve",
                "message": f"User confirmed: {self.confirmation_action or 'Execute reroute'}"
            })
            await asyncio.sleep(1)

            # =====================================================
            # Phase 6: Execution Animation (T+62s - T+75s)
            # =====================================================
            logger.info("Demo Sequence: T6 - Execution Steps")
            
            # Send execution start event
            await websocket.send_json({
                "type": "EXECUTION_START",
                "timestamp": datetime.now().isoformat(),
                "message": "Executing reroute decision",
                "total_steps": len(self.execution_steps)
            })
            await asyncio.sleep(0.5)
            
            # Send each execution step
            for i, step in enumerate(self.execution_steps):
                # First send step as "executing"
                await websocket.send_json({
                    "type": "EXECUTION_STEP",
                    "timestamp": datetime.now().isoformat(),
                    "step_index": i,
                    "total_steps": len(self.execution_steps),
                    "status": "executing",
                    "data": step
                })
                
                # Wait for step duration
                await asyncio.sleep(step["duration_ms"] / 1000)
                
                # Send step completion
                await websocket.send_json({
                    "type": "EXECUTION_STEP_COMPLETE",
                    "timestamp": datetime.now().isoformat(),
                    "step_index": i,
                    "step_id": step["step_id"],
                    "status": "complete"
                })
                await asyncio.sleep(0.3)
            
            # =====================================================
            # Phase 7: Execution Complete (T+75s)
            # =====================================================
            logger.info("Demo Sequence: T7 - Execution Complete")
            await websocket.send_json({
                "type": "EXECUTION_COMPLETE",
                "timestamp": datetime.now().isoformat(),
                "data": self.execution_summary
            })
            await asyncio.sleep(2)

            # =====================================================
            # Demo Complete
            # =====================================================
            logger.info("Demo Sequence: Complete")
            await websocket.send_json({
                "type": "DEMO_COMPLETE",
                "timestamp": datetime.now().isoformat(),
                "message": "Crisis Averted: Decision executed in 75 seconds",
                "summary": {
                    "total_reasoning_steps": len(self.cot_steps),
                    "debates": len(self.debates),
                    "execution_steps": len(self.execution_steps),
                    "savings": "$112,500",
                    "risk_reduction": "85 -> 22"
                }
            })

        except Exception as e:
            logger.error(f"Error in demo sequence: {e}", exc_info=True)
            await websocket.send_json({
                "type": "ERROR",
                "timestamp": datetime.now().isoformat(),
                "message": str(e)
            })
