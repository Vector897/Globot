# Roadmap

This roadmap describes public priorities for Globot. Items may be reordered as contributors join and as evaluation results arrive. Status is tracked through GitHub issues and pull requests.

## Near term (next 1–2 months)

- [ ] Expand CI beyond syntax/build: FastAPI route smoke tests and key scenario calculation fixtures
- [ ] Document every mock data boundary in the UI and API responses
- [ ] Add an explicit “provenance” panel for sources that back a recommendation summary
- [ ] Harden contribution path: first-time contributor labels, clearer issue templates, dependency update cadence via Dependabot
- [ ] Optional OpenAI-assisted **maintainer** workflows (issue triage drafts, PR review checklists) with human approval before any reply is posted — see [OPENAI_API_PLAN.md](OPENAI_API_PLAN.md)

## Mid term (3–6 months)

- [ ] Pluggable adapters for news / AIS / document corpora behind the same review contracts
- [ ] Evaluation harness for model-assisted summaries (faithfulness, latency, maintainer acceptance)
- [ ] Accessibility pass on high-traffic demo screens
- [ ] Versioned releases with changelog-driven notes and tagged GitHub Releases
- [ ] Codex Security–style review for dependency and auth surfaces when appropriate

## Longer term

- [ ] Shared OSS reference patterns for HITL logistics decision support
- [ ] Community scenarios contributed under clearly licensed sample data
- [ ] Optional multi-maintainer review rotation as contributor load grows

## Non-goals

- Autonomous execution against live trading, booking, or payment systems
- Shipping production credentials or personal allowlists in the repository
- Claiming mock demos as live sanctions / market truth
