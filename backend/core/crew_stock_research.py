import os
import time
from typing import List, Optional

from config import get_settings


def test_openai_connection(model: str, timeout: int = 10) -> None:
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


EVIDENCE_RULES = """You MUST follow these evidence rules:
1) Tag every claim as FACT (with source link/id), INFERENCE (reasoning), or ASSUMPTION (state sensitivity).
2) No uncited numbers (revenue, margins, multiples, guidance, etc).
3) Surface conflicts (show both, pick which to trust and why).
4) Time-stamp everything "as of YYYY-MM-DD".
Keep outputs concise; avoid repeating rules verbatim.
"""


def _init_llm():
    from crewai import LLM

    settings = get_settings()
    model_name = settings.openai_model or "gpt-5-mini"

    if settings.openai_api_key:
        os.environ.setdefault("OPENAI_API_KEY", settings.openai_api_key)
    if settings.openai_base_url:
        os.environ.setdefault("OPENAI_BASE_URL", settings.openai_base_url)

    test_openai_connection(model=model_name)

    # If supported by your CrewAI version, these help with timeouts:
    # return LLM(model=model_name, timeout=60, max_retries=1)
    return LLM(model=model_name)


def build_company_research_crew(company: str, question: str, ticker: Optional[str] = None):
    from crewai import Agent, Task, Crew

    llm = _init_llm()
    target = f"{company} ({ticker})" if ticker else company

    common_backstory = (
        "You are part of a disciplined hedge fund research pod.\n"
        + EVIDENCE_RULES
    )

    orchestrator = Agent(
        role="Research Lead (Orchestrator)",
        goal="Define key questions, assign sub-research, track unknowns. Keep it short and structured.",
        backstory=common_backstory,
        llm=llm,
    )

    fundamentals = Agent(
        role="Fundamentals Analyst",
        goal="Business model, financials, guidance, valuation, unit economics, QoE.",
        backstory=common_backstory,
        llm=llm,
    )

    industry = Agent(
        role="Industry & Moat Analyst",
        goal="Market structure, competitors, TAM, differentiation, moat durability.",
        backstory=common_backstory,
        llm=llm,
    )

    catalyst = Agent(
        role="Catalyst & News Analyst",
        goal="Upcoming events, earnings, product launches, regulatory/litigation, macro sensitivity.",
        backstory=common_backstory,
        llm=llm,
    )

    risk = Agent(
        role="Risk Officer",
        goal="Stress test assumptions, find red flags, rebut bullish claims.",
        backstory=common_backstory,
        llm=llm,
    )

    pm = Agent(
        role="Decision PM",
        goal="Synthesize; decide buy/hold/sell/watch; sizing + risk limits.",
        backstory=common_backstory,
        llm=llm,
    )

    writer = Agent(
        role="Proposal Writer",
        goal="Write final memo using prior outputs only; do not add new facts without sources.",
        backstory=common_backstory,
        llm=llm,
    )

    tasks: List[Task] = []

    # Orchestrator: force compact JSON (prevents giant wall of text)
    tasks.append(Task(
        description=(
            f"Create a research plan for {target} about: {question}\n"
            "Return JSON with keys: questions[], assignments[], unknowns[], required_sources[].\n"
            "Hard limit: 250 words."
        ),
        agent=orchestrator,
        expected_output="Compact JSON plan."
    ))

    tasks.append(Task(
        description=(
            f"Analyze fundamentals for {target} re: {question}. "
            "Return <= 12 bullets. Tag each bullet FACT/INFERENCE/ASSUMPTION with sources/timestamps."
        ),
        agent=fundamentals,
        expected_output="<=12 tagged bullets with citations."
    ))

    tasks.append(Task(
        description=(
            f"Analyze industry/moat for {target} re: {question}. "
            "Return <= 10 bullets. Tag each bullet FACT/INFERENCE/ASSUMPTION with sources/timestamps."
        ),
        agent=industry,
        expected_output="<=10 tagged bullets with citations."
    ))

    tasks.append(Task(
        description=(
            f"Analyze catalysts/news for {target} re: {question}. "
            "Return <= 10 bullets. Tag each bullet FACT/INFERENCE/ASSUMPTION with sources/timestamps."
        ),
        agent=catalyst,
        expected_output="<=10 tagged bullets with citations."
    ))

    tasks.append(Task(
        description=(
            f"Act as skeptic for {target} re: {question}. "
            "Return <= 12 bullets of risks/red flags. Tag each bullet with sources/timestamps."
        ),
        agent=risk,
        expected_output="<=12 tagged risk bullets with citations."
    ))

    tasks.append(Task(
        description=(
            f"Synthesize prior outputs for {target} re: {question}. "
            "Return 1) decision (buy/hold/sell/watch), 2) size, 3) risk limits, 4) confidence. "
            "Max 200 words, tagged + cited."
        ),
        agent=pm,
        expected_output="Compact decision summary."
    ))

    tasks.append(Task(
        description=(
            f"Write final memo for {target} re: {question} using ONLY prior outputs. "
            "Max 600 words. Use the schema: Thesis; Key Facts; Bull; Bear/Risks; Catalysts; Valuation; "
            "Positioning/Risk; Unknowns. Tag claims + cite."
        ),
        agent=writer,
        expected_output="<=600 word memo."
    ))

    crew = Crew(
        agents=[orchestrator, fundamentals, industry, catalyst, risk, pm, writer],
        tasks=tasks,
        verbose=True
    )
    return crew, tasks
