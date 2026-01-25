from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import enum

class CustomerCategory(str, enum.Enum):
    """客户类别枚举"""
    HIGH_VALUE = "high_value"  # 优质客户
    NORMAL = "normal"          # 普通客户
    LOW_VALUE = "low_value"    # 低价值客户

class ConversationStatus(str, enum.Enum):
    """会话状态枚举"""
    ACTIVE = "active"      # 进行中
    CLOSED = "closed"      # 已关闭
    HANDOFF = "handoff"    # 已转人工

class MessageSender(str, enum.Enum):
    """消息发送者枚举"""
    CUSTOMER = "customer"  # 客户
    AI = "ai"             # AI
    HUMAN = "human"       # 人工客服


# ========== Maritime Compliance Enums ==========

class VesselType(str, enum.Enum):
    """Vessel type enumeration"""
    CONTAINER = "container"
    TANKER = "tanker"
    BULK_CARRIER = "bulk_carrier"
    RO_RO = "ro_ro"
    GENERAL_CARGO = "general_cargo"
    LNG_CARRIER = "lng_carrier"
    PASSENGER = "passenger"
    FISHING = "fishing"
    OFFSHORE = "offshore"
    OTHER = "other"


class DocumentType(str, enum.Enum):
    """User document type enumeration for maritime certificates"""
    SAFETY_CERTIFICATE = "safety_certificate"           # SOLAS Safety Certificates
    LOAD_LINE_CERTIFICATE = "load_line_certificate"     # Load Line Convention
    MARPOL_CERTIFICATE = "marpol_certificate"           # MARPOL compliance
    CREW_CERTIFICATE = "crew_certificate"               # STCW certificates
    ISM_CERTIFICATE = "ism_certificate"                 # ISM Code (Safety Management)
    ISPS_CERTIFICATE = "isps_certificate"               # ISPS Code (Security)
    CLASS_CERTIFICATE = "class_certificate"             # Classification society certificate
    INSURANCE_CERTIFICATE = "insurance_certificate"     # P&I, Hull insurance
    CUSTOMS_DECLARATION = "customs_declaration"         # Customs documents
    HEALTH_CERTIFICATE = "health_certificate"           # Maritime health certificate
    TONNAGE_CERTIFICATE = "tonnage_certificate"         # International Tonnage Certificate
    REGISTRY_CERTIFICATE = "registry_certificate"       # Certificate of Registry
    CREW_LIST = "crew_list"                             # Crew list document
    CARGO_MANIFEST = "cargo_manifest"                   # Cargo manifest
    BALLAST_WATER_CERTIFICATE = "ballast_water_certificate"  # BWM Convention
    OTHER = "other"


class RegulationType(str, enum.Enum):
    """Maritime regulation type enumeration"""
    IMO_CONVENTION = "imo_convention"           # SOLAS, MARPOL, STCW, etc.
    PORT_STATE_CONTROL = "port_state_control"   # PSC regimes (Paris MOU, Tokyo MOU)
    PORT_SPECIFIC = "port_specific"             # Individual port rules
    REGIONAL = "regional"                       # EU, US, regional requirements
    CUSTOMS = "customs"                         # Customs regulations
    ENVIRONMENTAL = "environmental"             # ECA, ballast water, emissions
    SECURITY = "security"                       # ISPS, security requirements
    FLAG_STATE = "flag_state"                   # Flag state requirements


class ComplianceStatus(str, enum.Enum):
    """Compliance check status"""
    COMPLIANT = "compliant"
    NON_COMPLIANT = "non_compliant"
    PARTIAL = "partial"
    PENDING_REVIEW = "pending_review"
    EXPIRED = "expired"


class PSCRegime(str, enum.Enum):
    """Port State Control regime enumeration"""
    PARIS_MOU = "paris_mou"           # Europe and North Atlantic
    TOKYO_MOU = "tokyo_mou"           # Asia-Pacific
    INDIAN_OCEAN_MOU = "indian_ocean_mou"
    MEDITERRANEAN_MOU = "mediterranean_mou"
    ABUJA_MOU = "abuja_mou"           # West and Central Africa
    BLACK_SEA_MOU = "black_sea_mou"
    CARIBBEAN_MOU = "caribbean_mou"
    RIYADH_MOU = "riyadh_mou"         # Gulf region
    VINA_DEL_MAR = "vina_del_mar"     # Latin America
    USCG = "uscg"                     # US Coast Guard
    AMSA = "amsa"                     # Australian Maritime Safety Authority


# ========== 数据模型 ==========

class Customer(Base):
    """客户表"""
    __tablename__ = "customers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    email = Column(String(100), unique=True, index=True)
    company = Column(String(200))
    phone = Column(String(50))
    language = Column(String(10), default='zh-cn')
    
    # 分类相关
    category = Column(Enum(CustomerCategory), default=CustomerCategory.NORMAL)
    priority_score = Column(Integer, default=3)  # 1-5分
    classification_reason = Column(Text)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # 关系
    conversations = relationship("Conversation", back_populates="customer")
    vessels = relationship("Vessel", back_populates="customer")
    user_documents = relationship("UserDocument", back_populates="customer")


class Conversation(Base):
    """会话表"""
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    status = Column(Enum(ConversationStatus), default=ConversationStatus.ACTIVE)
    summary = Column(Text)  # 对话摘要
    
    # 统计
    message_count = Column(Integer, default=0)
    avg_confidence = Column(Float)  # 平均置信度
    
    # 时间戳
    started_at = Column(DateTime, default=datetime.now)
    ended_at = Column(DateTime)
    
    # 关系
    customer = relationship("Customer", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation")

class Message(Base):
    """消息表"""
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    content = Column(Text, nullable=False)
    sender = Column(Enum(MessageSender), nullable=False)
    language = Column(String(10))
    
    # AI相关
    ai_confidence = Column(Float)  # 0.00-1.00
    retrieved_docs = Column(Text)  # RAG检索的文档片段（JSON格式）
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.now)
    
    # 关系
    conversation = relationship("Conversation", back_populates="messages")

class HandoffStatus(str, enum.Enum):
    """转人工状态枚举"""
    PENDING = "pending"      # 待处理
    PROCESSING = "processing"  # 处理中
    COMPLETED = "completed"    # 已完成

class Handoff(Base):
    """人工转接记录表"""
    __tablename__ = "handoffs"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    trigger_reason = Column(String(50))  # manual/low_confidence/customer_request
    agent_name = Column(String(100))  # 接管的销售人员
    status = Column(Enum(HandoffStatus), default=HandoffStatus.PENDING)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

class KBDocument(Base):
    """知识库文档元数据表"""
    __tablename__ = "kb_documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200))
    content = Column(Text)
    doc_type = Column(String(50))  # manual/faq/product_spec
    product_tag = Column(String(100))  # M30/M400/Dock3等
    source_file = Column(String(200))

    # 时间戳
    created_at = Column(DateTime, default=datetime.now)


# ========== Maritime Compliance Models ==========

class Vessel(Base):
    """Vessel registration table"""
    __tablename__ = "vessels"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    name = Column(String(200), nullable=False)
    imo_number = Column(String(20), unique=True, index=True)  # IMO Ship ID
    mmsi = Column(String(20))                                  # Maritime Mobile Service Identity
    call_sign = Column(String(20))
    vessel_type = Column(Enum(VesselType))
    flag_state = Column(String(100))                          # Flag country
    gross_tonnage = Column(Float)
    dwt = Column(Float)                                        # Deadweight tonnage
    year_built = Column(Integer)
    classification_society = Column(String(100))              # DNV, Lloyd's, etc.

    # Timestamps
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # Relationships
    customer = relationship("Customer", back_populates="vessels")
    documents = relationship("UserDocument", back_populates="vessel")
    compliance_checks = relationship("ComplianceCheck", back_populates="vessel")


class UserDocument(Base):
    """User-uploaded documents (certificates, permits)"""
    __tablename__ = "user_documents"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    vessel_id = Column(Integer, ForeignKey("vessels.id"), nullable=True)

    # Document info
    title = Column(String(300), nullable=False)
    document_type = Column(Enum(DocumentType), nullable=False)
    file_path = Column(String(500), nullable=False)           # Storage path
    file_name = Column(String(300))
    file_size = Column(Integer)                               # bytes
    mime_type = Column(String(100))

    # OCR/Extracted content
    extracted_text = Column(Text)                             # OCR result
    ocr_provider = Column(String(50))                         # landing_ai
    ocr_confidence = Column(Float)
    extracted_fields = Column(Text)                           # JSON: structured fields

    # Document metadata
    issuing_authority = Column(String(200))
    issue_date = Column(DateTime)
    expiry_date = Column(DateTime)
    document_number = Column(String(100))

    # Validation status
    is_validated = Column(Boolean, default=False)
    validation_notes = Column(Text)

    # Timestamps
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # Relationships
    customer = relationship("Customer", back_populates="user_documents")
    vessel = relationship("Vessel", back_populates="documents")


class Port(Base):
    """Port information table"""
    __tablename__ = "ports"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    un_locode = Column(String(10), unique=True, index=True)   # UN/LOCODE
    country = Column(String(100), nullable=False)
    country_code = Column(String(3))                          # ISO 3166-1 alpha-3
    region = Column(String(100))                              # Asia, Europe, Americas, etc.
    latitude = Column(Float)
    longitude = Column(Float)

    # PSC regime
    psc_regime = Column(Enum(PSCRegime), nullable=True)

    # Port characteristics
    is_eca = Column(Boolean, default=False)                   # Emission Control Area
    has_shore_power = Column(Boolean, default=False)
    max_draft = Column(Float)                                 # meters

    # Timestamps
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # Relationships
    regulations = relationship("PortRegulation", back_populates="port")


class MaritimeRegulation(Base):
    """Maritime law/regulation knowledge base"""
    __tablename__ = "maritime_regulations"

    id = Column(Integer, primary_key=True, index=True)

    # Regulation identification
    title = Column(String(500), nullable=False)
    regulation_type = Column(Enum(RegulationType), nullable=False)
    source_convention = Column(String(200))                   # e.g., "SOLAS", "MARPOL Annex VI"
    chapter = Column(String(100))
    regulation_number = Column(String(50))

    # Content
    summary = Column(Text)                                    # Short summary
    full_text = Column(Text)                                  # Full regulation text

    # Applicability (JSON arrays)
    applicable_vessel_types = Column(Text)                    # JSON array of VesselType
    applicable_regions = Column(Text)                         # JSON array
    applicable_flag_states = Column(Text)                     # JSON array
    min_gross_tonnage = Column(Float)                         # Minimum GT for applicability

    # Required documents (JSON array of DocumentType)
    required_documents = Column(Text)

    # Metadata
    effective_date = Column(DateTime)
    amendment_date = Column(DateTime)
    source_url = Column(String(500))

    # Vector embedding reference
    chroma_doc_id = Column(String(100))                       # Reference to ChromaDB

    # Timestamps
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class PortRegulation(Base):
    """Port-specific regulations"""
    __tablename__ = "port_regulations"

    id = Column(Integer, primary_key=True, index=True)
    port_id = Column(Integer, ForeignKey("ports.id"))
    maritime_regulation_id = Column(Integer, ForeignKey("maritime_regulations.id"), nullable=True)

    # Port-specific requirements
    title = Column(String(500), nullable=False)
    description = Column(Text)
    required_documents = Column(Text)                         # JSON array
    advance_notice_hours = Column(Integer)                    # Hours before arrival

    # Applicability
    applicable_vessel_types = Column(Text)                    # JSON array

    # Contact info
    authority_name = Column(String(200))
    authority_contact = Column(String(200))

    # Vector embedding reference
    chroma_doc_id = Column(String(100))

    # Timestamps
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # Relationships
    port = relationship("Port", back_populates="regulations")
    maritime_regulation = relationship("MaritimeRegulation")


class ComplianceCheck(Base):
    """Route compliance check records"""
    __tablename__ = "compliance_checks"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    vessel_id = Column(Integer, ForeignKey("vessels.id"))

    # Route info
    route_name = Column(String(300))
    route_ports = Column(Text)                                # JSON array of port codes

    # Results
    overall_status = Column(Enum(ComplianceStatus))
    compliance_score = Column(Float)                          # 0-100

    # Detailed results (JSON)
    port_results = Column(Text)                               # Per-port compliance details
    missing_documents = Column(Text)                          # JSON array
    recommendations = Column(Text)                            # JSON array

    # Natural language report
    summary_report = Column(Text)
    detailed_report = Column(Text)

    # CrewAI metadata
    crew_run_id = Column(String(100))
    agent_outputs = Column(Text)                              # Raw agent outputs (JSON)

    # Timestamps
    created_at = Column(DateTime, default=datetime.now)

    # Relationships
    customer = relationship("Customer")
    vessel = relationship("Vessel", back_populates="compliance_checks")
