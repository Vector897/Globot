import asyncio
from fastapi import WebSocket
from demo.crisis_455pm_data import CRISIS_TIMELINE
import logging

logger = logging.getLogger(__name__)

class CrisisAutoPlayController:
    def __init__(self):
        self.timeline = CRISIS_TIMELINE
        self.is_playing = False

    async def run_demo_sequence(self, websocket: WebSocket):
        """执行完整Demo序列 - 总时长2分58秒 (178秒)"""
        try:
            # T0: 正常状态 (持续10秒)
            # 16:50:00 - Global View
            logger.info("Demo Sequence: T0 Started")
            await websocket.send_json({
                "type": "STATE_UPDATE",
                "timestamp": self.timeline["t0_normal_state"]["timestamp"],
                "data": self.timeline["t0_normal_state"]
            })
            await asyncio.sleep(10)

            # T1: 黑天鹅 (持续5秒)
            # 16:55:00 - Alert
            logger.info("Demo Sequence: T1 Alert")
            await websocket.send_json({
                "type": "ALERT",
                "timestamp": self.timeline["t1_black_swan"]["timestamp"],
                "severity": "CRITICAL",
                "data": self.timeline["t1_black_swan"]
            })
            await asyncio.sleep(5)

            # T2: AI推理 (持续15秒)
            # 16:56:30 - Reasoning
            logger.info("Demo Sequence: T2 Reasoning")
            reasoning = self.timeline["t2_ai_reasoning"]
            for i, step in enumerate(reasoning["fermi_estimation"]["reasoning_steps"]):
                await websocket.send_json({
                    "type": "REASONING_STEP",
                    "timestamp": "2025-12-26T16:56:30Z", # Simplified timestamp for demo
                    "step_number": i + 1,
                    "description": step,
                    "azure_service": "Azure OpenAI (GPT-4-Turbo)"
                })
                # Distribute steps over 15 seconds (approx 3s per step for 5 steps)
                await asyncio.sleep(3)

            # T3: 战术方案 (持续10秒)
            # 16:58:20 - Options
            logger.info("Demo Sequence: T3 Options")
            await websocket.send_json({
                "type": "TACTICAL_OPTIONS",
                "timestamp": self.timeline["t3_tactical_options"]["timestamp"],
                "options": self.timeline["t3_tactical_options"]["options"]
            })
            
            # Wait for "user decision" simulation (10s)
            await asyncio.sleep(10)

            # T4: 执行 (持续5秒)
            # 16:58:58 - Execution
            logger.info("Demo Sequence: T4 Execution")
            await websocket.send_json({
                "type": "EXECUTION",
                "timestamp": self.timeline["t4_execution"]["timestamp"],
                "actions": self.timeline["t4_execution"]["actions"],
                "final_outcome": self.timeline["t4_execution"]["final_outcome"]
            })
            await asyncio.sleep(5)

            # END: 完成
            logger.info("Demo Sequence: Complete")
            await websocket.send_json({
                "type": "DEMO_COMPLETE",
                "message": "Crisis Averted: $104,500 saved in 2:58"
            })

        except Exception as e:
            logger.error(f"Error in demo sequence: {e}")
            await websocket.send_json({
                "type": "ERROR",
                "message": str(e)
            })
