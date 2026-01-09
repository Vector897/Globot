"""
Agent Chain-of-Thought (CoT) Demo Data

Detailed CoT mock data for Imagine Cup demonstration
Showcasing transparent and traceable AI decision-making
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any

# =============================================================================
# RAG Knowledge Sources
# =============================================================================

RAG_SOURCES = {
    "maritime_safety": {
        "document_id": "DOC-MSR-2024",
        "title": "Maritime Safety Regulations 2024",
        "section": "Section 4.2 - Emergency Rerouting Procedures",
        "content_snippet": "In case of geopolitical disruption affecting designated shipping lanes, vessels are advised to initiate contingency route planning within 4 hours of alert confirmation.",
        "relevance_score": 0.94,
        "azure_service": "Azure AI Search"
    },
    "ofac_sanctions": {
        "document_id": "DOC-OFAC-2025",
        "title": "OFAC Sanctions Compliance Guide",
        "section": "Chapter 7 - Maritime Trade Restrictions",
        "content_snippet": "Vessels transiting through sanctioned waterways must obtain pre-clearance. Alternative routes via Cape of Good Hope are pre-approved for most cargo categories.",
        "relevance_score": 0.91,
        "azure_service": "Azure AI Search"
    },
    "fuel_cost_analysis": {
        "document_id": "DOC-FUEL-Q4-2025",
        "title": "Q4 2025 Bunker Fuel Price Index",
        "section": "Regional Analysis - Africa",
        "content_snippet": "South African port bunker costs are 18% higher than Middle East averages due to limited refinery capacity. Recommend fuel hedging for Cape route transitions.",
        "relevance_score": 0.87,
        "azure_service": "Azure AI Search"
    },
    "insurance_maritime": {
        "document_id": "DOC-INS-WAR-2025",
        "title": "War Risk Insurance Premium Guide 2025",
        "section": "Section 3.1 - Hormuz Strait Coverage",
        "content_snippet": "War risk premiums for Hormuz Strait transit increased 340% following December 2025 incidents. Alternative route insurance costs may offset premium savings.",
        "relevance_score": 0.89,
        "azure_service": "Azure AI Search"
    },
    "carrier_capacity": {
        "document_id": "DOC-LOG-CAP-2025",
        "title": "Global Carrier Capacity Report - December 2025",
        "section": "Cape Route Availability",
        "content_snippet": "Current Cape of Good Hope route utilization at 73%. Maersk, MSC, and CMA-CGM have confirmed emergency capacity allocation for rerouted vessels.",
        "relevance_score": 0.92,
        "azure_service": "Azure AI Search"
    }
}

# =============================================================================
# Complete Chain-of-Thought Reasoning Steps
# =============================================================================

COT_REASONING_CHAIN = [
    # ===================== T+5s: Market Sentinel Detection =====================
    {
        "step_id": "STEP-001",
        "agent_id": "market_sentinel",
        "action": "detect",
        "title": "Anomaly Signal Detection",
        "content": "Reuters flash detected: Houthi rebels seized a Marshall Islands-flagged oil tanker in Strait of Hormuz. Keyword match confidence 97.2%, geographic coordinates overlap with current route SHP-001.",
        "confidence": 0.972,
        "azure_service": "Azure OpenAI GPT-4-Turbo",
        "sources": ["maritime_safety"],
        "duration_ms": 1250,
        "delay_seconds": 5
    },
    {
        "step_id": "STEP-002",
        "agent_id": "market_sentinel",
        "action": "analyze",
        "title": "Multi-Source Signal Validation",
        "content": "Cross-validated with Bloomberg, Bing News API and AIS vessel tracking data. Event authenticity confirmed. Risk level escalated from MEDIUM to CRITICAL. North Atlantic corridor risk indicators increased by 47%.",
        "confidence": 0.95,
        "azure_service": "Azure Cognitive Services",
        "sources": ["maritime_safety", "insurance_maritime"],
        "duration_ms": 2100,
        "delay_seconds": 3
    },
    
    # ===================== T+15s: Risk Hedger Analysis =====================
    {
        "step_id": "STEP-003",
        "agent_id": "risk_hedger",
        "action": "calculate",
        "title": "Financial Exposure Calculation",
        "content": "Affected cargo identified: 3 in-transit shipments, total value $455,000. Estimated 14-day delay losses include: Storage fees $12,000, Penalty clauses $35,000, Insurance premium increase $28,000. Total exposure: $75,000.",
        "confidence": 0.88,
        "azure_service": "Azure OpenAI GPT-4-Turbo",
        "sources": ["insurance_maritime"],
        "duration_ms": 3200,
        "delay_seconds": 5
    },
    {
        "step_id": "STEP-004",
        "agent_id": "risk_hedger",
        "action": "analyze",
        "title": "Hedging Strategy Evaluation",
        "content": "Analyzed three hedging options: (1) Additional cargo insurance $8,500; (2) Fuel futures hedge $5,200; (3) Currency lock $3,800. Recommendation: Option 1+2 combination at $13,700, covering 85% of risk exposure.",
        "confidence": 0.91,
        "azure_service": "Azure OpenAI GPT-4-Turbo",
        "sources": ["insurance_maritime", "fuel_cost_analysis"],
        "duration_ms": 2800,
        "delay_seconds": 4
    },
    
    # ===================== T+28s: Logistics Orchestrator Planning =====================
    {
        "step_id": "STEP-005",
        "agent_id": "logistics",
        "action": "search",
        "title": "Alternative Route Search",
        "content": "Azure AI Search queried historical route data. Three viable alternatives identified: (A) Cape of Good Hope +14 days; (B) Vietnam transshipment +7 days; (C) Air freight split +2 days. Now querying carrier availability for each route.",
        "confidence": 0.85,
        "azure_service": "Azure AI Search",
        "sources": ["carrier_capacity"],
        "duration_ms": 1800,
        "delay_seconds": 5
    },
    {
        "step_id": "STEP-006",
        "agent_id": "logistics",
        "action": "calculate",
        "title": "Cost-Benefit Analysis",
        "content": "Comprehensive ROI calculation: (A) Cape route: Cost $8,000, Avoided loss $112,500, ROI 14.06x; (B) Vietnam transship: Cost $22,000, Avoided loss $67,000, ROI 3.05x; (C) Air freight: Cost $45,000, Avoided loss $75,000, ROI 1.67x. Recommendation: Option A.",
        "confidence": 0.93,
        "azure_service": "Azure OpenAI GPT-4-Turbo",
        "sources": ["fuel_cost_analysis", "carrier_capacity"],
        "duration_ms": 2400,
        "delay_seconds": 4
    },
    
    # ===================== T+34s: Compliance Manager Validation =====================
    {
        "step_id": "STEP-007",
        "agent_id": "compliance",
        "action": "validate",
        "title": "Sanctions List Verification",
        "content": "Cape route ports verified: Cape Town, Durban, Maputo. Cross-checked against OFAC SDN list, UN sanctions, EU restrictive measures. Result: 0 conflicts, route 100% compliant.",
        "confidence": 0.98,
        "azure_service": "Azure OpenAI GPT-4-Turbo",
        "sources": ["ofac_sanctions"],
        "duration_ms": 2100,
        "delay_seconds": 4
    },
    {
        "step_id": "STEP-008",
        "agent_id": "compliance",
        "action": "validate",
        "title": "Documentation Compliance Confirmed",
        "content": "Cargo documentation verified: HS Code 9018.90 (Medical Equipment) meets South Africa import requirements. Form 7501 pre-filled and ready for submission upon final approval. 89 international regulations validated.",
        "confidence": 0.96,
        "azure_service": "Azure Form Recognizer",
        "sources": ["ofac_sanctions", "maritime_safety"],
        "duration_ms": 1600,
        "delay_seconds": 3
    },
    
    # ===================== T+42s: Adversarial Debate Challenge =====================
    {
        "step_id": "STEP-009",
        "agent_id": "adversarial",
        "action": "challenge",
        "title": "Cost Assumption Challenge",
        "content": "Challenge: Logistics Orchestrator's Cape route cost estimate appears optimistic. According to Q4 2025 Bunker Fuel Price Index, South African port refueling costs are 18% higher than Middle East. Suggest adjusting cost estimate to $9,440 (+18%).",
        "confidence": 0.87,
        "azure_service": "Azure OpenAI GPT-4-Turbo",
        "sources": ["fuel_cost_analysis"],
        "duration_ms": 1900,
        "delay_seconds": 4
    },
    {
        "step_id": "STEP-010",
        "agent_id": "adversarial",
        "action": "challenge",
        "title": "Time Window Risk",
        "content": "Challenge: Current analysis assumes sufficient carrier capacity. However, similar incidents may cause capacity surge. Recommend immediate slot reservation and prepare Vietnam transshipment as Plan B fallback.",
        "confidence": 0.82,
        "azure_service": "Azure OpenAI GPT-4-Turbo",
        "sources": ["carrier_capacity"],
        "duration_ms": 1700,
        "delay_seconds": 3
    }
]

# =============================================================================
# Adversarial Debate Exchanges
# =============================================================================

DEBATE_EXCHANGES = [
    {
        "exchange_id": "DEBATE-001",
        "challenger_agent": "adversarial",
        "defender_agent": "logistics",
        "challenge": "Cape route cost estimate of $8,000 is overly optimistic. South African port fuel premiums (+18%) not accounted for.",
        "challenge_reason": "Q4 2025 Bunker Fuel Price Index shows significantly higher fuel costs at South African ports.",
        "response": "Challenge accepted. Fuel cost adjusted to $9,440. ROI updated to 11.92x. Still remains optimal option.",
        "resolution": "Cost estimate corrected. Option A (Cape of Good Hope) still recommended, but ROI adjusted from 14.06x to 11.92x.",
        "resolution_accepted": True,
        "sources": ["fuel_cost_analysis"]
    },
    {
        "exchange_id": "DEBATE-002",
        "challenger_agent": "adversarial",
        "defender_agent": "logistics",
        "challenge": "Carrier capacity availability assumption may be overly optimistic. Similar incidents could trigger 200-300% demand surge within 24-48 hours.",
        "challenge_reason": "Historical data shows capacity demand spikes significantly after geopolitical events.",
        "response": "Contacted Maersk, MSC, CMA-CGM for emergency capacity confirmation. Cape route currently at 73% utilization with sufficient buffer.",
        "resolution": "Slots pre-reserved. Vietnam transshipment prepared as Plan B to ensure fallback option if capacity tightens.",
        "resolution_accepted": True,
        "sources": ["carrier_capacity"]
    }
]

# =============================================================================
# Final Decision Summary
# =============================================================================

FINAL_DECISION = {
    "decision_id": "DEC-20251226-001",
    "trigger_event": "Strait of Hormuz Vessel Seizure Incident",
    "trigger_agent": "market_sentinel",
    "final_recommendation": "Reroute via Cape of Good Hope",
    "recommendation_details": {
        "route_change": "Shanghai -> Cape of Good Hope -> Rotterdam",
        "additional_days": 14,
        "additional_cost": "$9,440 (adjusted)",
        "risk_reduction": "85 -> 22 (risk score)",
        "savings": "$112,500 (avoided potential loss)"
    },
    "human_approval_required": True,
    "approval_options": [
        {"id": "approve", "label": "One-Click Confirm", "action": "execute_reroute"},
        {"id": "details", "label": "View Details", "action": "show_details"},
        {"id": "manual", "label": "Human Override", "action": "escalate_to_human"}
    ],
    "total_duration_ms": 58000,
    "agents_involved": ["market_sentinel", "risk_hedger", "logistics", "compliance", "adversarial"]
}


# =============================================================================
# Execution Phase Steps (NEW)
# =============================================================================

EXECUTION_STEPS = [
    {
        "step_id": "EXEC-001",
        "action": "carrier_notification",
        "title": "Notifying Carriers",
        "description": "Contacting Maersk and MSC for Cape route slot reservation",
        "azure_service": "Azure Communication Services",
        "duration_ms": 2000
    },
    {
        "step_id": "EXEC-002",
        "action": "slot_confirmation",
        "title": "Slot Confirmed",
        "description": "Maersk confirmed slot on MV Cape Runner, departing Jan 12",
        "azure_service": "Azure Logic Apps",
        "duration_ms": 1500
    },
    {
        "step_id": "EXEC-003",
        "action": "insurance_update",
        "title": "Updating Insurance",
        "description": "Filing war risk premium adjustment with Lloyd's of London",
        "azure_service": "Azure OpenAI GPT-4",
        "duration_ms": 1800
    },
    {
        "step_id": "EXEC-004",
        "action": "route_activation",
        "title": "Activating New Route",
        "description": "Updating vessel navigation system with Cape of Good Hope waypoints",
        "azure_service": "Azure Maps",
        "duration_ms": 2200
    },
    {
        "step_id": "EXEC-005",
        "action": "fuel_hedging",
        "title": "Fuel Hedging",
        "description": "Executing fuel futures hedge for South African port refueling",
        "azure_service": "Azure Functions",
        "duration_ms": 1600
    },
    {
        "step_id": "EXEC-006",
        "action": "customer_notification",
        "title": "Customer Notification",
        "description": "Sending delay notification to 3 affected customers with revised ETA",
        "azure_service": "Azure Communication Services",
        "duration_ms": 1200
    }
]

EXECUTION_SUMMARY = {
    "total_steps": 6,
    "total_duration_ms": 10300,
    "actions_completed": [
        "Carrier slot reserved on MV Cape Runner",
        "Insurance premium adjusted (-$28,000 war risk)",
        "Navigation updated to Cape route",
        "Fuel hedge executed for $5,200",
        "3 customers notified of +14 day delay"
    ],
    "final_status": "REROUTE_EXECUTED",
    "risk_score_before": 85,
    "risk_score_after": 22,
    "estimated_savings": "$112,500"
}


def get_reasoning_steps_for_demo() -> List[Dict[str, Any]]:
    """Get reasoning steps for Demo WebSocket streaming"""
    steps = []
    for step_data in COT_REASONING_CHAIN:
        # Replace source references with full data
        sources = []
        for source_key in step_data.get("sources", []):
            if source_key in RAG_SOURCES:
                sources.append(RAG_SOURCES[source_key])
        
        step = {
            **step_data,
            "sources": sources,
            "timestamp": datetime.now().isoformat()
        }
        steps.append(step)
    
    return steps


def get_debate_exchanges_for_demo() -> List[Dict[str, Any]]:
    """Get debate exchanges for Demo WebSocket streaming"""
    exchanges = []
    for exchange_data in DEBATE_EXCHANGES:
        # Replace source references with full data
        sources = []
        for source_key in exchange_data.get("sources", []):
            if source_key in RAG_SOURCES:
                sources.append(RAG_SOURCES[source_key])
        
        exchange = {
            **exchange_data,
            "sources": sources,
            "timestamp": datetime.now().isoformat()
        }
        exchanges.append(exchange)
    
    return exchanges


def get_final_decision_for_demo() -> Dict[str, Any]:
    """Get final decision data"""
    return {
        **FINAL_DECISION,
        "timestamp": datetime.now().isoformat()
    }


def get_execution_steps_for_demo() -> List[Dict[str, Any]]:
    """Get execution steps for Demo WebSocket streaming"""
    return [
        {
            **step,
            "timestamp": datetime.now().isoformat()
        }
        for step in EXECUTION_STEPS
    ]


def get_execution_summary_for_demo() -> Dict[str, Any]:
    """Get execution summary data"""
    return {
        **EXECUTION_SUMMARY,
        "timestamp": datetime.now().isoformat()
    }

