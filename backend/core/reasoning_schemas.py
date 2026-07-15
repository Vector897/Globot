"""Typed, inspectable records for the decision-support UI.

These schemas represent activity summaries and supporting evidence. They do not
expose private model reasoning and must not be interpreted as autonomous action.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class AgentType(str, Enum):
    MARKET_SENTINEL = "market_sentinel"
    FINANCIAL_HEDGE = "financial_hedge"
    LOGISTICS_ORCHESTRATOR = "logistics_orchestrator"
    COMPLIANCE_MANAGER = "compliance_manager"
    ADVERSARIAL_REVIEWER = "adversarial_reviewer"


class EvidenceSource(BaseModel):
    """A source supplied to the user-facing activity summary."""

    title: str
    reference: Optional[str] = None
    excerpt: Optional[str] = None
    relevance_score: Optional[float] = Field(default=None, ge=0, le=1)


class ActivityStep(BaseModel):
    """A high-level, reviewable record of an assistant activity."""

    step_id: str
    agent: AgentType
    title: str
    summary: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    confidence: Optional[float] = Field(default=None, ge=0, le=1)
    evidence: list[EvidenceSource] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class DecisionRecord(BaseModel):
    """A recommendation that requires a human reviewer before use."""

    decision_id: str
    trigger_event: str
    activities: list[ActivityStep]
    recommendation: str
    human_approval_required: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
