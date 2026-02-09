"""
FastAPI Main Application
"""
try:
    __import__('pysqlite3')
    import sys
    sys.modules['sqlite3'] = sys.modules.pop('pysqlite3')
except ImportError:
    pass

from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import uvicorn
import logging
import hashlib
import json
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import modules
from database import get_db, Base, engine
from models import Customer, Conversation, Message, CustomerCategory, MessageSender, Handoff, ConversationStatus
# from core.chatbot import get_chatbot
# from core.classifier import get_classifier
# from core.handoff_manager import get_handoff_manager
from core.crew_orchestrator import CrewAIOrchestrator, get_crew_orchestrator
from core.crew_stock_research import build_company_research_crew
from core.hedge_agent import get_hedge_agent
from services.market_data_service import get_market_data_service
from core.clerk_auth import get_current_user, User

from api.v2.demo_routes import router as demo_router
from api.v2.market_sentinel_routes import router as market_sentinel_router
from api.v2.maritime_routes import router as maritime_router
from api.v2.hedge_routes import router as hedge_router
from api.v2.visual_risk_routes import router as visual_risk_router


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title="DJI Sales AI Assistant API",
    description="DJI Drone Intelligent Sales Assistant System", version="0.1.0"
)

# 注册路由
app.include_router(demo_router)
app.include_router(market_sentinel_router)
app.include_router(maritime_router)
app.include_router(hedge_router)
app.include_router(visual_risk_router)
from api.analytics import router as analytics_router
app.include_router(analytics_router)

from api.deps import get_current_user

@app.get("/api/protected")
def read_protected(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Test protected route with Admin Whitelist Check and Stats
    """
    # 1. Get email from mock User object
    user_email = user.email
    
    # Check whitelist
    import os
    whitelist = os.getenv("ADMIN_WHITELIST", "").split(",")
    # Clean whitespace
    whitelist = [e.strip() for e in whitelist]
    
    is_admin = False
    if user_email and user_email.lower() in [w.lower() for w in whitelist]:
        is_admin = True
    
    # Force admin for hackathon if needed, but here we use the role from user
    if user.role == "admin":
        is_admin = True
    
    # Collect Stats if Admin
    stats = {}
    if is_admin:
        try:
            total_users = db.query(Customer).count()
            total_messages = db.query(Message).count()
            stats = {
                "total_users": total_users,
                "total_messages": total_messages
            }
        except Exception as e:
            logger.error(f"Error fetching stats: {e}")
            stats = {"error": "Failed to fetch stats"}
        
    return {
        "message": "You are authenticated",
        "user_id": user.id,
        "email": user_email,
        "is_admin": is_admin,
        "claims": user.dict(),
        "stats": stats
    }


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize core modules
try:
    # chatbot = get_chatbot()
    # classifier = get_classifier()
    # handoff_manager = get_handoff_manager()
    crew_orchestrator = get_crew_orchestrator()
    logger.info("Core modules initialized successfully")
except Exception as e:
    logger.error(f"Core module initialization failed: {e}")
    # Allow partial functionality in MVP stage
    # chatbot = None
    # classifier = None
    # handoff_manager = None
    crew_orchestrator = None


# ========== Data Models ==========

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
    """Request for manual message sending"""
    conversation_id: int
    content: str
    agent_name: str = "Human Agent"

class UpdateHandoffStatusRequest(BaseModel):
    """Update handoff status"""
    status: str  # pending/processing/completed
    agent_name: Optional[str] = None

class CompanyResearchRequest(BaseModel):
    """Company research request"""
    company: str
    question: str
    ticker: Optional[str] = None

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


# ========== API Routes ==========

@app.get("/")
def read_root():
    """Root path"""
    return {
        "message": "DJI Sales AI Assistant API",
        "version": "0.1.0",
        "status": "running"
    }

@app.post("/api/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    bg_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Dialogue Interface
    """
    # 1. Verify customer exists
    customer = db.query(Customer).filter(Customer.id == request.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # 2. Get or create active session
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
    
    # 3. Save customer message
    customer_msg = Message(
        conversation_id=active_conv.id,
        content=request.message,
        sender=MessageSender.CUSTOMER,
        language=request.language,
        created_at=datetime.now()
    )
    db.add(customer_msg)
    
    # 4. Call chatbot (CrewAI feature optional)
    response = None
    if request.use_crewai and crew_orchestrator:
        try:
            response = crew_orchestrator.chat(
                customer_id=request.customer_id,
                message=request.message,
                language=request.language
            )
        except Exception as e:
            logger.warning(f"CrewAI mode failed, falling back to default bot: {e}")
            response = None

    if response is None:
        response = chatbot.chat(
            customer_id=request.customer_id,
            message=request.message,
            language=request.language
        )
    
    # 5. Save AI message
    ai_msg = Message(
        conversation_id=active_conv.id,
        content=response['answer'],
        sender=MessageSender.AI,
        language=request.language,
        ai_confidence=response['confidence'],
        created_at=datetime.now()
    )
    db.add(ai_msg)
    
    # 6. Update session statistics
    active_conv.message_count += 2
    active_conv.avg_confidence = response['confidence']
    
    # 7. Asynchronously trigger customer classification (non-blocking)
    if active_conv.message_count >= 4:  # Classify after at least 2 rounds of dialogue
        bg_tasks.add_task(classify_customer_bg, request.customer_id, db)
    
    # 8. Create handoff record if manual handover is required
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
def create_customer(
    customer: CustomerCreate, 
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Create customer"""
    # Check if email already exists
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
def list_customers(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get customer list"""
    # Get customer list
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
    """Manually trigger customer classification"""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get conversation history
    messages = db.query(Message).join(Conversation).filter(
        Conversation.customer_id == customer_id
    ).order_by(Message.created_at.desc()).limit(20).all()
    
    if not messages:
        raise HTTPException(status_code=400, detail="No conversation history")
    
    # Format messages
    conversation_history = [
        {"sender": msg.sender.value, "content": msg.content}
        for msg in reversed(messages)
    ]
    
    # Classification
    result = classifier.classify(conversation_history)
    
    # Update database
    customer.category = result['category']
    customer.priority_score = result['priority_score']
    customer.classification_reason = result['reason']
    customer.updated_at = datetime.now()
    db.commit()
    
    return result

@app.post("/api/handoff")
def create_handoff(request: HandoffRequest, db: Session = Depends(get_db)):
    """Manual handoff"""
    conversation = db.query(Conversation).filter(Conversation.id == request.conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Create handoff
    handoff_id = handoff_manager.create_handoff(db, request.conversation_id, request.reason)
    
    # Generate summary
    summary = handoff_manager.generate_summary(db, request.conversation_id)
    
    return {
        "handoff_id": handoff_id,
        "summary": summary
    }

@app.get("/api/conversations/{customer_id}")
def get_conversations(customer_id: int, db: Session = Depends(get_db)):
    """Get all conversations for a customer"""
    # Get all conversations for a customer
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
    """Get single conversation details (via conversation_id)"""
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

# ========== Manual Handoff Related APIs ==========

@app.get("/api/handoffs")
def get_handoffs(status: Optional[str] = None, db: Session = Depends(get_db)):
    """Get handoff list"""
    from models import Handoff, HandoffStatus
    
    query = db.query(Handoff)
    
    # Status filter
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
    """Manually send message"""
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
    """Update handoff status"""
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
    """Run Company Research CrewAI pipeline"""
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

# ========== Admin Analytics API ==========

@app.get("/api/admin/stats")
def get_admin_stats(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get admin dashboard statistics"""
    if user.role != "admin":
         # In MVP, we might allow all logged in users for now, or check role
         pass 

    from sqlalchemy import func
    from datetime import timedelta
    
    # 1. Customer category statistics
    category_stats = db.query(
        Customer.category, func.count(Customer.id)
    ).group_by(Customer.category).all()
    
    # 2. Last 7 days conversation trend
    seven_days_ago = datetime.now() - timedelta(days=7)
    trend_stats = db.query(
        func.date(Conversation.started_at), func.count(Conversation.id)
    ).filter(Conversation.started_at >= seven_days_ago) \
     .group_by(func.date(Conversation.started_at)).all()
    
    # 3. Average confidence score
    avg_conf = db.query(func.avg(Conversation.avg_confidence)).scalar() or 0.85

    return {
        "categories": [{"name": str(c[0].value if c[0] else "normal"), "value": c[1]} for c in category_stats],
        "trends": [{"date": str(t[0]), "count": t[1]} for t in trend_stats],
        "overall": {
            "avg_confidence": round(float(avg_conf), 2),
            "total_customers": db.query(func.count(Customer.id)).scalar(),
            "total_conversations": db.query(func.count(Conversation.id)).scalar()
        }
    }

# ========== Background Tasks ==========

def classify_customer_bg(customer_id: int, db: Session):
    """Background task: Classify customer"""
    try:
        # Get conversation history
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
        print(f"Background classification failed: {e}")

# Mount static files and catch-all route
# This should be at the end of the script, but before uvicorn.run
static_path = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_path):
    app.mount("/", StaticFiles(directory=static_path, html=True), name="static")

@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    index_file = os.path.join(static_path, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "API is running, but frontend not found. Build the frontend and place it in 'backend/static'."}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
