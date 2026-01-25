"""
CrewAI Crew for Maritime Compliance Checking
Multi-agent system for comprehensive route compliance analysis
"""
import os
import time
import json
import logging
from typing import List, Optional, Dict, Any, Tuple

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


# Try to import CrewAI
try:
    from crewai import Agent, Task, Crew, LLM
    HAS_CREWAI = True
except ImportError:
    HAS_CREWAI = False
    logger.warning("crewai not found. Maritime compliance crew will not be available.")


def test_openai_connection(model: str, timeout: int = 10) -> None:
    """Test OpenAI connection before initializing crew"""
    from openai import OpenAI
    client = OpenAI(timeout=timeout, max_retries=0)
    start = time.time()
    try:
        client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "ping"}],
        )
    except Exception as e:
        latency = round(time.time() - start, 3)
        raise RuntimeError(
            f"OpenAI health check failed after {latency}s: {type(e).__name__}: {e}"
        ) from e


MARITIME_COMPLIANCE_RULES = """You MUST follow these maritime compliance rules:
1) Cite specific regulations (e.g., "SOLAS Chapter II-2, Reg 10" or "MARPOL Annex VI, Reg 14")
2) Tag each requirement as MANDATORY, RECOMMENDED, or CONDITIONAL (state conditions)
3) For missing documents, specify: regulation source, ports requiring it, deadline if applicable
4) Confidence levels: HIGH (direct regulation match), MEDIUM (interpretation needed), LOW (unclear)
5) Consider vessel type, flag state, and gross tonnage for applicability assessment
6) Time-stamp findings and note any recent regulatory changes
Keep outputs concise and actionable.
"""


def _init_llm():
    """Initialize LLM for CrewAI"""
    if not HAS_CREWAI:
        raise RuntimeError("CrewAI not installed")

    model_name = settings.openai_model or "gpt-4o-mini"

    if settings.openai_api_key:
        os.environ.setdefault("OPENAI_API_KEY", settings.openai_api_key)
    if settings.openai_base_url:
        os.environ.setdefault("OPENAI_BASE_URL", settings.openai_base_url)

    # Test connection
    test_openai_connection(model=model_name)

    return LLM(model=model_name)


def build_maritime_compliance_crew(
    vessel_info: Dict[str, Any],
    route_ports: List[str],
    user_documents: List[Dict[str, Any]]
) -> Tuple[Any, List[Any]]:
    """
    Build CrewAI crew for maritime compliance checking

    Args:
        vessel_info: Dict with vessel details (name, imo_number, vessel_type, flag_state, gross_tonnage)
        route_ports: List of port codes in route order
        user_documents: List of user document dicts (document_type, expiry_date, etc.)

    Returns:
        Tuple of (Crew, List[Task])
    """
    if not HAS_CREWAI:
        raise RuntimeError("CrewAI not installed. Cannot build compliance crew.")

    from core.maritime_tools import get_maritime_tools

    llm = _init_llm()
    tools = get_maritime_tools()

    common_backstory = (
        "You are part of a maritime compliance advisory team with expertise in "
        "international shipping regulations, port state control, and vessel documentation.\n"
        + MARITIME_COMPLIANCE_RULES
    )

    # Format inputs for agents
    vessel_str = json.dumps(vessel_info, indent=2)
    route_str = " -> ".join(route_ports)
    docs_summary = "\n".join([
        f"- {d.get('document_type')}: expires {d.get('expiry_date', 'N/A')}"
        for d in user_documents
    ])

    # ========== AGENTS ==========

    regulation_researcher = Agent(
        role="Maritime Regulation Researcher",
        goal="Identify all applicable international and regional regulations for the voyage",
        backstory=common_backstory + "\nYou specialize in IMO conventions (SOLAS, MARPOL, STCW), "
                  "port state control regimes, and regional requirements.",
        llm=llm,
        tools=tools,
        verbose=True,
    )

    document_analyst = Agent(
        role="Document Compliance Analyst",
        goal="Compare vessel documents against regulatory requirements, identify gaps and expiration issues",
        backstory=common_backstory + "\nYou are expert at certificate validation, understanding "
                  "document requirements, and identifying compliance gaps.",
        llm=llm,
        verbose=True,
    )

    port_specialist = Agent(
        role="Port Requirements Specialist",
        goal="Identify port-specific requirements including advance notices, local regulations, and ECA compliance",
        backstory=common_backstory + "\nYou have deep knowledge of individual port requirements, "
                  "PSC inspection priorities, and local authority procedures.",
        llm=llm,
        tools=tools,
        verbose=True,
    )

    risk_officer = Agent(
        role="Risk Assessment Officer",
        goal="Assess compliance risks, prioritize gaps by severity, recommend mitigation strategies",
        backstory=common_backstory + "\nYou focus on PSC inspection risks, detention probabilities, "
                  "and operational impacts of compliance failures.",
        llm=llm,
        verbose=True,
    )

    report_writer = Agent(
        role="Compliance Report Writer",
        goal="Synthesize all findings into clear, actionable compliance reports",
        backstory=common_backstory + "\nYou excel at communicating complex compliance matters clearly "
                  "to ship operators and management.",
        llm=llm,
        verbose=True,
    )

    # ========== TASKS ==========

    tasks: List[Task] = []

    # Task 1: Research applicable regulations
    tasks.append(Task(
        description=f"""
Research all applicable maritime regulations for this voyage:

VESSEL INFORMATION:
{vessel_str}

ROUTE: {route_str}

Identify:
1. Applicable IMO conventions (SOLAS, MARPOL, STCW, ISM, ISPS, Load Line, etc.)
2. Port State Control regime for each port (Paris MOU, Tokyo MOU, USCG, etc.)
3. Regional requirements (EU MRV, ECA zones, etc.)
4. Flag state requirements

Output as JSON with keys:
- imo_conventions: list of {{convention, applicable_chapters, requirements}}
- psc_regimes: list of {{port, regime, priority_areas}}
- regional_requirements: list of {{region, requirement, applicability}}
- flag_state_requirements: list of requirements

Limit: 500 words total.
""",
        agent=regulation_researcher,
        expected_output="JSON with categorized applicable regulations"
    ))

    # Task 2: Port-specific requirements
    tasks.append(Task(
        description=f"""
For each port on the route ({route_str}), identify specific requirements:

VESSEL TYPE: {vessel_info.get('vessel_type', 'container')}

For each port determine:
1. Required documents for port entry
2. Advance notification requirements (hours before arrival)
3. ECA/emission requirements if applicable
4. Pilot and berthing requirements
5. Local customs and immigration procedures

Output as JSON:
{{
  "port_requirements": {{
    "<port_code>": {{
      "documents": [],
      "advance_notice_hours": int,
      "eca_zone": bool,
      "special_requirements": []
    }}
  }}
}}

Limit: 400 words.
""",
        agent=port_specialist,
        expected_output="JSON with per-port requirements"
    ))

    # Task 3: Document gap analysis
    tasks.append(Task(
        description=f"""
Compare the vessel's documents against all requirements identified.

VESSEL DOCUMENTS:
{docs_summary}

REQUIRED DOCUMENTS (from previous analyses):
- Use outputs from regulation researcher and port specialist tasks

Identify:
1. Documents that are present and valid
2. Documents that are present but expired or expiring within 30 days
3. Documents that are missing entirely
4. Any documents with unclear validity

Output as JSON:
{{
  "valid_documents": [{{document_type, expiry_date, status}}],
  "expired_documents": [{{document_type, expired_on, urgency}}],
  "expiring_soon": [{{document_type, expires_in_days}}],
  "missing_documents": [{{document_type, required_by, ports_affected}}],
  "gap_summary": "brief summary"
}}

Limit: 400 words.
""",
        agent=document_analyst,
        expected_output="JSON document gap analysis"
    ))

    # Task 4: Risk assessment
    tasks.append(Task(
        description=f"""
Based on all previous findings, assess compliance risks:

Consider:
1. PSC inspection likelihood at each port
2. Detention risk based on document gaps
3. Operational delays that could result
4. Financial penalties for non-compliance
5. Flag state reputation factors

Provide:
1. Overall risk level (LOW/MEDIUM/HIGH/CRITICAL)
2. Risk score 0-100
3. Per-port risk assessment
4. Priority actions ranked by urgency

Output as JSON:
{{
  "overall_risk_level": "LOW|MEDIUM|HIGH|CRITICAL",
  "risk_score": 0-100,
  "port_risks": [{{port, risk_level, detention_probability, key_concerns}}],
  "priority_actions": [{{action, urgency, deadline, impact}}],
  "mitigation_recommendations": []
}}

Limit: 400 words.
""",
        agent=risk_officer,
        expected_output="JSON risk assessment with prioritized actions"
    ))

    # Task 5: Final report
    tasks.append(Task(
        description=f"""
Synthesize all findings into a comprehensive compliance report.

Create TWO outputs:

1. STRUCTURED JSON:
{{
  "overall_status": "COMPLIANT|PARTIAL|NON_COMPLIANT",
  "compliance_score": 0-100,
  "route_summary": {{
    "total_ports": int,
    "compliant_ports": int,
    "risk_level": "string"
  }},
  "critical_findings": [],
  "missing_documents": [],
  "recommendations": [],
  "next_steps": []
}}

2. EXECUTIVE SUMMARY (narrative):
- 2-3 sentence overview of compliance status
- Key findings by category
- Top 3 priority actions
- Estimated timeline to achieve full compliance

Write for ship operators who need clear, actionable guidance.

Limit: 600 words total (both outputs combined).
""",
        agent=report_writer,
        expected_output="JSON structured report + narrative executive summary"
    ))

    # Create Crew
    crew = Crew(
        agents=[
            regulation_researcher,
            document_analyst,
            port_specialist,
            risk_officer,
            report_writer
        ],
        tasks=tasks,
        verbose=True
    )

    return crew, tasks


async def run_compliance_check(
    vessel_info: Dict[str, Any],
    route_ports: List[str],
    user_documents: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Run the full compliance check using CrewAI

    Returns:
        Dict with compliance results and agent outputs
    """
    if not HAS_CREWAI:
        return {
            "error": "CrewAI not installed",
            "mock_result": True,
            "overall_status": "PENDING_REVIEW",
            "message": "Compliance check requires CrewAI to be installed"
        }

    try:
        crew, tasks = build_maritime_compliance_crew(
            vessel_info=vessel_info,
            route_ports=route_ports,
            user_documents=user_documents
        )

        # Run the crew
        result = crew.kickoff()

        # Parse the result
        return {
            "success": True,
            "crew_output": str(result),
            "tasks_completed": len(tasks),
            "raw_result": result
        }

    except Exception as e:
        logger.error(f"Compliance crew error: {e}")
        return {
            "error": str(e),
            "success": False,
            "overall_status": "ERROR"
        }


class CrewAIComplianceOrchestrator:
    """
    Orchestrator for CrewAI maritime compliance checks
    Provides singleton pattern and caching
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._available = HAS_CREWAI

    @property
    def is_available(self) -> bool:
        return self._available

    async def check_compliance(
        self,
        vessel_info: Dict[str, Any],
        route_ports: List[str],
        user_documents: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Run compliance check"""
        return await run_compliance_check(
            vessel_info=vessel_info,
            route_ports=route_ports,
            user_documents=user_documents
        )


def get_compliance_orchestrator() -> CrewAIComplianceOrchestrator:
    """Get singleton orchestrator instance"""
    return CrewAIComplianceOrchestrator()
