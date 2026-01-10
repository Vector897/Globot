"""
FastAPI主应用
"""
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import uvicorn
import logging
import hashlib

# 导入模块
from database import get_db, Base, engine
from models import Customer, Conversation, Message, CustomerCategory, MessageSender, Handoff, ConversationStatus
from core.chatbot import get_chatbot
from core.classifier import get_classifier
from core.handoff_manager import get_handoff_manager
from core.crew_orchestrator import CrewAIOrchestrator, get_crew_orchestrator
from core.crew_stock_research import build_company_research_crew

# from api.v2.azure_routes import router as azure_router  # Disabled - Azure dependencies missing
from api.v2.demo_routes import router as demo_router
# from api.v2.market_sentinel_routes import router as market_sentinel_router  # Disabled - Azure dependencies missing
from services.telegram_service import get_telegram_service

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 创建数据库表
Base.metadata.create_all(bind=engine)

# 创建FastAPI应用
app = FastAPI(
    title="DJI Sales AI Assistant API",
    description="大疆无人机智能销售助理系统", version="0.1.0"
)

# 注册路由
# app.include_router(azure_router)  # Disabled - Azure dependencies missing
app.include_router(demo_router)
# app.include_router(market_sentinel_router)  # Disabled - Azure dependencies missing

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应限制来源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化核心模块
try:
    chatbot = get_chatbot()
    classifier = get_classifier()
    handoff_manager = get_handoff_manager()
    crew_orchestrator = get_crew_orchestrator()
    telegram_service = get_telegram_service()
    logger.info("核心模块初始化成功")
except Exception as e:
    logger.error(f"核心模块初始化失败: {e}")
    # MVP阶段允许部分功能不可用
    chatbot = None
    classifier = None
    handoff_manager = None
    crew_orchestrator = None
    telegram_service = None


# ========== 数据模型 ==========

class ChatRequest(BaseModel):
    customer_id: int
    message: str
    language: str = 'zh-cn'
    use_crewai: bool = False  # feature flag: enable CrewAI orchestration

class ChatResponse(BaseModel):
    answer: str
    confidence: float
    should_handoff: bool
    product_tag: Optional[str]

class CustomerCreate(BaseModel):
    name: str
    email: str
    company: Optional[str] = None
    phone: Optional[str] = None
    language: str = 'zh-cn'

class HandoffRequest(BaseModel):
    conversation_id: int
    reason: str = 'manual_request'

class HumanMessageRequest(BaseModel):
    """人工发送消息请求"""
    conversation_id: int
    content: str
    agent_name: str = "人工客服"

class UpdateHandoffStatusRequest(BaseModel):
    """更新转人工状态"""
    status: str  # pending/processing/completed
    agent_name: Optional[str] = None

class CompanyResearchRequest(BaseModel):
    """公司研究请求"""
    company: str
    question: str
    ticker: Optional[str] = None


class TelegramWebhookUpdate(BaseModel):
    """Telegram Webhook 更新"""
    update_id: int
    message: Optional[Dict[str, Any]] = None
    edited_message: Optional[Dict[str, Any]] = None
# ========== API路由 ==========

@app.get("/")
def read_root():
    """根路径"""
    return {
        "message": "DJI Sales AI Assistant API",
        "version": "0.1.0",
        "status": "running",
        "telegram_bot": "enabled" if telegram_service else "disabled"
    }

# ========== Telegram Bot 相关API ==========

@app.post("/webhook/telegram")
async def telegram_webhook(
    request: Request,
    bg_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Telegram Webhook 接收端点
    
    接收 Telegram 发送的更新并处理消息
    """
    try:
        # 获取原始数据
        data = await request.json()
        logger.info(f"收到 Telegram 更新: {data}")
        
        # 提取消息
        message = data.get("message") or data.get("edited_message")
        
        if not message:
            return {"ok": True, "message": "No message to process"}
        
        # 提取消息内容
        text = message.get("text", "").strip()
        chat_id = message.get("chat", {}).get("id")
        message_id = message.get("message_id")
        
        if not text or not chat_id:
            return {"ok": True, "message": "Invalid message format"}
        
        # 忽略命令（以 / 开头）
        if text.startswith("/"):
            await handle_telegram_command(text, chat_id, message_id, db)
            return {"ok": True}
        
        # 提取用户信息
        user_info = telegram_service.extract_user_info(message)
        
        # 发送 "正在输入" 状态
        telegram_service.send_typing_action(chat_id)
        
        # 获取或创建客户
        customer = await get_or_create_customer_from_telegram(user_info, db)
        
        # 获取或创建活跃会话
        active_conv = db.query(Conversation).filter(
            Conversation.customer_id == customer.id,
            Conversation.status == ConversationStatus.ACTIVE
        ).first()
        
        if not active_conv:
            active_conv = Conversation(
                customer_id=customer.id,
                status=ConversationStatus.ACTIVE,
                started_at=datetime.now()
            )
            db.add(active_conv)
            db.commit()
            db.refresh(active_conv)
        
        # 保存客户消息
        customer_msg = Message(
            conversation_id=active_conv.id,
            content=text,
            sender=MessageSender.CUSTOMER,
            language=user_info.get("language_code", "en"),
            created_at=datetime.now()
        )
        db.add(customer_msg)
        db.commit()
        
        # 调用聊天机器人
        response = chatbot.chat(
            customer_id=customer.id,
            message=text,
            language=user_info.get("language_code", "en")
        )
        
        # 保存AI消息
        ai_msg = Message(
            conversation_id=active_conv.id,
            content=response['answer'],
            sender=MessageSender.AI,
            language=user_info.get("language_code", "en"),
            ai_confidence=response['confidence'],
            created_at=datetime.now()
        )
        db.add(ai_msg)
        
        # 更新会话统计
        active_conv.message_count += 2
        active_conv.avg_confidence = response['confidence']
        
        # 如果需要转人工
        if response['should_handoff']:
            handoff_manager.create_handoff(
                db,
                active_conv.id,
                reason='low_confidence' if response['confidence'] < 0.7 else 'customer_request'
            )
            active_conv.status = ConversationStatus.HANDOFF
        
        db.commit()
        
        # 格式化回复并发送到 Telegram
        formatted_answer = telegram_service.format_message_for_telegram(
            response['answer'],
            response['confidence']
        )
        
        telegram_service.send_message(
            chat_id=chat_id,
            text=formatted_answer,
            reply_to_message_id=message_id
        )
        
        # 异步触发客户分类
        if active_conv.message_count >= 4:
            bg_tasks.add_task(classify_customer_bg, customer.id, db)
        
        return {"ok": True, "conversation_id": active_conv.id}
        
    except Exception as e:
        logger.error(f"处理 Telegram webhook 失败: {e}", exc_info=True)
        return {"ok": False, "error": str(e)}

async def handle_telegram_command(
    command: str,
    chat_id: int,
    message_id: int,
    db: Session
):
    """
    处理 Telegram 命令
    
    Args:
        command: 命令文本（如 /start）
        chat_id: Telegram chat ID
        message_id: 消息 ID
        db: 数据库会话
    """
    if command.startswith("/start"):
        welcome_text = """
👋 欢迎使用 DJI 智能销售助理！

我可以帮您：
✅ 了解 DJI 无人机产品
✅ 解答技术问题
✅ 提供购买建议
✅ 连接专业销售团队

直接发送您的问题，我会立即回复！

---
🤖 Powered by Azure AI
        """
        telegram_service.send_message(
            chat_id=chat_id,
            text=welcome_text.strip()
        )
    
    elif command.startswith("/help"):
        help_text = """
📖 使用帮助

**常见问题：**
• M30T 续航时间是多少？
• Dock 3 有什么特点？
• 如何选择合适的无人机？

**命令列表：**
/start - 开始使用
/help - 查看帮助
/human - 转人工客服

有任何问题直接发送消息即可！
        """
        telegram_service.send_message(
            chat_id=chat_id,
            text=help_text.strip()
        )
    
    elif command.startswith("/human"):
        # 转人工
        telegram_service.send_message(
            chat_id=chat_id,
            text="已为您转接人工客服，请稍等，我们的销售顾问会尽快回复您。⏰"
        )

async def get_or_create_customer_from_telegram(
    user_info: Dict[str, str],
    db: Session
) -> Customer:
    """
    从 Telegram 用户信息获取或创建客户
    
    Args:
        user_info: Telegram 用户信息
        db: 数据库会话
        
    Returns:
        Customer 对象
    """
    telegram_id = user_info["telegram_id"]
    
    # 使用 telegram_id 作为 email 的唯一标识（临时方案）
    # 生产环境应该使用独立的 telegram_id 字段
    email = f"telegram_{telegram_id}@temp.dji.com"
    
    # 查找现有客户
    customer = db.query(Customer).filter(Customer.email == email).first()
    
    if customer:
        # 更新客户信息（如果用户名改变）
        if customer.name != user_info["full_name"]:
            customer.name = user_info["full_name"]
            customer.updated_at = datetime.now()
            db.commit()
        return customer
    
    # 创建新客户
    new_customer = Customer(
        name=user_info["full_name"],
        email=email,
        company=f"Telegram User (@{user_info['username']})" if user_info['username'] else "Telegram User",
        phone=telegram_id,  # 临时存储 telegram_id
        language=user_info["language_code"],
        category=CustomerCategory.NORMAL,
        priority_score=3,
        created_at=datetime.now()
    )
    
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    
    logger.info(f"创建新客户: {new_customer.name} (Telegram ID: {telegram_id})")
    
    return new_customer

@app.post("/api/telegram/set-webhook")
def set_telegram_webhook(webhook_url: Optional[str] = None):
    """
    设置 Telegram Webhook
    
    Args:
        webhook_url: Webhook URL（可选，默认使用配置中的 URL）
    """
    if not telegram_service:
        raise HTTPException(status_code=503, detail="Telegram service not available")
    
    try:
        result = telegram_service.set_webhook(webhook_url)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/telegram/webhook-info")
def get_telegram_webhook_info():
    """
    获取 Telegram Webhook 信息
    """
    if not telegram_service:
        raise HTTPException(status_code=503, detail="Telegram service not available")
    
    try:
        result = telegram_service.get_webhook_info()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/telegram/webhook")
def delete_telegram_webhook():
    """
    删除 Telegram Webhook
    """
    if not telegram_service:
        raise HTTPException(status_code=503, detail="Telegram service not available")
    
    try:
        result = telegram_service.delete_webhook()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/telegram/bot-info")
def get_telegram_bot_info():
    """
    获取 Telegram Bot 信息
    """
    if not telegram_service:
        raise HTTPException(status_code=503, detail="Telegram service not available")
    
    try:
        result = telegram_service.get_me()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    bg_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    对话接口
    """
    # 1. 验证客户存在
    customer = db.query(Customer).filter(Customer.id == request.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # 2. 获取或创建活跃会话
    active_conv = db.query(Conversation).filter(
        Conversation.customer_id == request.customer_id,
        Conversation.status == "active"
    ).first()
    
    if not active_conv:
        active_conv = Conversation(
            customer_id=request.customer_id,
            status="active",
            started_at=datetime.now()
        )
        db.add(active_conv)
        db.commit()
        db.refresh(active_conv)
    
    # 3. 保存客户消息
    customer_msg = Message(
        conversation_id=active_conv.id,
        content=request.message,
        sender=MessageSender.CUSTOMER,
        language=request.language,
        created_at=datetime.now()
    )
    db.add(customer_msg)
    
    # 4. 调用聊天机器人（CrewAI特性可选）
    response = None
    if request.use_crewai and crew_orchestrator:
        try:
            response = crew_orchestrator.chat(
                customer_id=request.customer_id,
                message=request.message,
                language=request.language
            )
        except Exception as e:
            logger.warning(f"CrewAI模式失败，回退默认机器人: {e}")
            response = None

    if response is None:
        response = chatbot.chat(
            customer_id=request.customer_id,
            message=request.message,
            language=request.language
        )
    
    # 5. 保存AI消息
    ai_msg = Message(
        conversation_id=active_conv.id,
        content=response['answer'],
        sender=MessageSender.AI,
        language=request.language,
        ai_confidence=response['confidence'],
        created_at=datetime.now()
    )
    db.add(ai_msg)
    
    # 6. 更新会话统计
    active_conv.message_count += 2
    active_conv.avg_confidence = response['confidence']
    
    # 7. 异步触发客户分类（不阻塞主流程）
    if active_conv.message_count >= 4:  # 至少2轮对话后才分类
        bg_tasks.add_task(classify_customer_bg, request.customer_id, db)
    
    # 8. 如果需要转人工，创建转接记录
    if response['should_handoff']:
        handoff_manager.create_handoff(
            db,
            active_conv.id,
            reason='low_confidence' if response['confidence'] < 0.7 else 'customer_request'
        )
    
    db.commit()
    
    return {
        "answer": response['answer'],
        "confidence": response['confidence'],
        "should_handoff": response['should_handoff'],
        "product_tag": response.get('product_tag'),
        "conversation_id": active_conv.id
    }

@app.post("/api/customers", status_code=201)
def create_customer(customer: CustomerCreate, db: Session = Depends(get_db)):
    """创建客户"""
    # 检查邮箱是否已存在
    existing = db.query(Customer).filter(Customer.email == customer.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    new_customer = Customer(
        name=customer.name,
        email=customer.email,
        company=customer.company,
        phone=customer.phone,
        language=customer.language,
        created_at=datetime.now()
    )
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    
    return {
        "id": new_customer.id,
        "name": new_customer.name,
        "email": new_customer.email,
        "company": new_customer.company,
        "phone": new_customer.phone,
        "category": new_customer.category.value if new_customer.category else "NORMAL",
        "priority_score": new_customer.priority_score or 3,
        "created_at": new_customer.created_at.isoformat()
    }

@app.get("/api/customers")
def list_customers(db: Session = Depends(get_db)):
    """获取客户列表"""
    customers = db.query(Customer).order_by(Customer.priority_score.desc()).all()
    return {
        "total": len(customers),
        "customers": [
            {
                "id": c.id,
                "name": c.name,
                "email": c.email,
                "company": c.company,
                "category": c.category.value if c.category else None,
                "priority_score": c.priority_score
            }
            for c in customers
        ]
    }

@app.post("/api/classify/{customer_id}")
async def classify_customer(customer_id: int, db: Session = Depends(get_db)):
    """手动触发客户分类"""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # 获取对话历史
    messages = db.query(Message).join(Conversation).filter(
        Conversation.customer_id == customer_id
    ).order_by(Message.created_at.desc()).limit(20).all()
    
    if not messages:
        raise HTTPException(status_code=400, detail="No conversation history")
    
    # 格式化消息
    conversation_history = [
        {"sender": msg.sender.value, "content": msg.content}
        for msg in reversed(messages)
    ]
    
    # 分类
    result = classifier.classify(conversation_history)
    
    # 更新数据库
    customer.category = result['category']
    customer.priority_score = result['priority_score']
    customer.classification_reason = result['reason']
    customer.updated_at = datetime.now()
    db.commit()
    
    return result

@app.post("/api/handoff")
def create_handoff(request: HandoffRequest, db: Session = Depends(get_db)):
    """手动转人工"""
    conversation = db.query(Conversation).filter(Conversation.id == request.conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # 创建转接
    handoff_id = handoff_manager.create_handoff(db, request.conversation_id, request.reason)
    
    # 生成摘要
    summary = handoff_manager.generate_summary(db, request.conversation_id)
    
    return {
        "handoff_id": handoff_id,
        "summary": summary
    }

@app.get("/api/conversations/{customer_id}")
def get_conversations(customer_id: int, db: Session = Depends(get_db)):
    """获取客户的所有对话"""
    # 获取客户的所有对话
    conversations = db.query(Conversation).filter(
        Conversation.customer_id == customer_id
    ).order_by(Conversation.started_at.desc()).all()
    
    result = []
    for conversation in conversations:
        messages = db.query(Message).filter(
            Message.conversation_id == conversation.id
        ).order_by(Message.created_at).all()
        
        result.append({
            "id": conversation.id,
            "customer_id": conversation.customer_id,
            "status": conversation.status.value if hasattr(conversation.status, 'value') else conversation.status,
            "message_count": conversation.message_count,
            "created_at": conversation.started_at.isoformat(),
            "messages": [
                {
                    "id": msg.id,
                    "sender": msg.sender.value if hasattr(msg.sender, 'value') else msg.sender,
                    "content": msg.content,
                    "ai_confidence": msg.ai_confidence,
                    "created_at": msg.created_at.isoformat()
                }
                for msg in messages
            ]
        })
    
    return result

@app.get("/api/conversation/{conversation_id}")
def get_conversation(conversation_id: int, db: Session = Depends(get_db)):
    """获取单个对话详情（通过conversation_id）"""
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id
    ).first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    messages = db.query(Message).filter(
        Message.conversation_id == conversation.id
    ).order_by(Message.created_at).all()
    
    return {
        "id": conversation.id,
        "customer_id": conversation.customer_id,
        "status": conversation.status.value if hasattr(conversation.status, 'value') else conversation.status,
        "message_count": conversation.message_count,
        "created_at": conversation.started_at.isoformat(),
        "messages": [
            {
                "id": msg.id,
                "sender": msg.sender.value if hasattr(msg.sender, 'value') else msg.sender,
                "content": msg.content,
                "ai_confidence": msg.ai_confidence,
                "created_at": msg.created_at.isoformat()
            }
            for msg in messages
        ]
    }

# ========== 人工接手相关API ==========

@app.get("/api/handoffs")
def get_handoffs(status: Optional[str] = None, db: Session = Depends(get_db)):
    """获取转人工列表"""
    from models import Handoff, HandoffStatus
    
    query = db.query(Handoff)
    
    # 状态筛选
    if status:
        try:
            status_enum = HandoffStatus(status)
            query = query.filter(Handoff.status == status_enum)
        except ValueError:
            pass
    
    handoffs = query.order_by(Handoff.created_at.desc()).all()
    
    result = []
    for handoff in handoffs:
        conversation = db.query(Conversation).filter(Conversation.id == handoff.conversation_id).first()
        if not conversation:
            continue
            
        customer = db.query(Customer).filter(Customer.id == conversation.customer_id).first()
        if not customer:
            continue
        
        result.append({
            "id": handoff.id,
            "conversation_id": handoff.conversation_id,
            "status": handoff.status.value if hasattr(handoff.status, 'value') else handoff.status,
            "trigger_reason": handoff.trigger_reason,
            "agent_name": handoff.agent_name,
            "created_at": handoff.created_at.isoformat(),
            "updated_at": handoff.updated_at.isoformat() if handoff.updated_at else None,
            "customer": {
                "id": customer.id,
                "name": customer.name,
                "email": customer.email,
                "category": customer.category.value if customer.category else "normal",
                "priority_score": customer.priority_score or 3
            }
        })
    
    return {"total": len(result), "handoffs": result}

@app.post("/api/messages/human")
def send_human_message(request: HumanMessageRequest, db: Session = Depends(get_db)):
    """人工发送消息"""
    conversation = db.query(Conversation).filter(Conversation.id == request.conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    human_msg = Message(
        conversation_id=request.conversation_id,
        content=request.content,
        sender=MessageSender.HUMAN,
        created_at=datetime.now()
    )
    db.add(human_msg)
    conversation.message_count += 1
    conversation.status = ConversationStatus.HANDOFF
    db.commit()
    db.refresh(human_msg)
    
    return {"message_id": human_msg.id, "status": "sent", "created_at": human_msg.created_at.isoformat()}

@app.put("/api/handoffs/{handoff_id}/status")
def update_handoff_status(handoff_id: int, request: UpdateHandoffStatusRequest, db: Session = Depends(get_db)):
    """更新转人工状态"""
    from models import Handoff, HandoffStatus
    
    handoff = db.query(Handoff).filter(Handoff.id == handoff_id).first()
    if not handoff:
        raise HTTPException(status_code=404, detail="Handoff not found")
    
    try:
        handoff.status = HandoffStatus(request.status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    if request.agent_name:
        handoff.agent_name = request.agent_name
    
    handoff.updated_at = datetime.now()
    db.commit()
    
    return {
        "id": handoff.id,
        "status": handoff.status.value,
        "agent_name": handoff.agent_name,
        "updated_at": handoff.updated_at.isoformat()
    }

# ========== Company Research CrewAI ==========

@app.post("/api/company-research")
def run_company_research(request: CompanyResearchRequest):
    """运行公司研究CrewAI流水线"""
    try:
        crew, tasks = build_company_research_crew(
            company=request.company,
            question=request.question,
            ticker=request.ticker,
        )
        result = crew.kickoff()
        # CrewAI returns a rich object; cast to string for API response.
        return {
            "company": request.company,
            "ticker": request.ticker,
            "question": request.question,
            "result": str(result)
        }
    except Exception as e:
        logger.error(f"Company research crew failed: {e}")
        raise HTTPException(status_code=500, detail=f"Company research failed: {e}")

# ========== 后台任务 ==========

def classify_customer_bg(customer_id: int, db: Session):
    """后台任务：分类客户"""
    try:
        # 获取对话历史
        messages = db.query(Message).join(Conversation).filter(
            Conversation.customer_id == customer_id
        ).order_by(Message.created_at.desc()).limit(20).all()
        
        if messages:
            conversation_history = [
                {"sender": msg.sender.value, "content": msg.content}
                for msg in reversed(messages)
            ]
            
            result = classifier.classify(conversation_history)
            
            customer = db.query(Customer).filter(Customer.id == customer_id).first()
            if customer:
                customer.category = result['category']
                customer.priority_score = result['priority_score']
                customer.classification_reason = result['reason']
                customer.updated_at = datetime.now()
                db.commit()
    except Exception as e:
        print(f"后台分类失败: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
