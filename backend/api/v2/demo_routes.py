from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from demo.autoplay_controller import CrisisAutoPlayController
import uuid
import logging
import asyncio
from pydantic import BaseModel
from typing import Optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/demo", tags=["Demo"])

# Simple in-memory storage for active demo controllers
# demo_id -> controller_instance
active_sessions = {}

class DemoStartRequest(BaseModel):
    scenario: str = "crisis_455pm"
    origin_port: Optional[str] = None
    destination_port: Optional[str] = None

@router.post("/start")
async def start_demo(request: DemoStartRequest):
    """
    启动Demo
    返回 demo_id 和 WebSocket URL
    """
    demo_id = str(uuid.uuid4())
    logger.info(f"Starting demo session: {demo_id} for scenario: {request.scenario} from {request.origin_port} to {request.destination_port}")
    
    # Check if we should use real Gemini analysis
    if request.origin_port and request.destination_port and request.scenario != "crisis_455pm":
        from demo.realtime_controller import RealTimeCrisisController
        controller = RealTimeCrisisController(request.origin_port, request.destination_port)
    else:
        controller = CrisisAutoPlayController()
    active_sessions[demo_id] = controller

    return {
        "demo_id": demo_id,
        "status": "started",
        "websocket_url": f"ws://localhost:8000/api/v2/demo/ws?demo_id={demo_id}",
        "duration_seconds": 178
    }

@router.websocket("/ws")
async def websocket_demo(websocket: WebSocket, demo_id: str):
    """
    WebSocket连接处理
    """
    await websocket.accept()
    logger.info(f"WebSocket connected for demo_id: {demo_id}")

    controller = active_sessions.get(demo_id)
    if not controller:
        logger.warning(f"Demo session not found: {demo_id}")
        await websocket.close(code=1008, reason="Invalid demo_id")
        return

    demo_task = None
    
    try:
        # Loop to handle commands from client (e.g., "play", "confirm")
        while True:
            data = await websocket.receive_json()
            logger.info(f"Received command: {data}")
            
            if data.get("action") == "play":
                if not controller.is_playing:
                    controller.is_playing = True
                    # 在后台任务中运行demo序列，这样主循环可以继续接收消息
                    demo_task = asyncio.create_task(controller.run_demo_sequence(websocket))
                    logger.info("Demo sequence started in background")
            elif data.get("action") == "confirm":
                # 用户确认决策（Approve/Override/Details）
                confirmation_type = data.get("confirmation_type", "approve")
                logger.info(f"User confirmed decision: {confirmation_type}")
                controller.confirm_decision(confirmation_type)
            elif data.get("action") == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {demo_id}")
        if demo_id in active_sessions:
            del active_sessions[demo_id]
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close(code=1011)
        except:
            pass
    finally:
        # 取消后台任务
        if demo_task and not demo_task.done():
            demo_task.cancel()
        if demo_id in active_sessions:
            del active_sessions[demo_id]
