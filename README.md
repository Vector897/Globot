# Globot

[![CI](https://github.com/Vector897/Globot/actions/workflows/ci.yml/badge.svg)](https://github.com/Vector897/Globot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.11](https://img.shields.io/badge/Python-3.11-3776AB.svg)](backend/requirements.txt)
[![React + Vite](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB.svg)](frontend/package.json)

**Open-source decision-support workspace for supply-chain disruption review.**

Globot helps operators inspect disruption signals, compare route options, review compliance documents, and keep a **human accountable** for every consequential recommendation. It is built as a transparent research and demonstration system, not as an autonomous execution engine.

> Default demos use mock and synthetic data. Outputs must be independently reviewed before they inform operational, compliance, or financial decisions.

## Why this project matters

Shipping and trade disruptions affect food, energy, medical supply, and manufacturing lead times. Existing tooling is often either a static dashboard or a black-box model. Globot sits in between:

- **Inspectable multi-agent activity** — market, logistics, compliance, and hedging perspectives in one review flow
- **Human-in-the-loop by design** — recommendations cannot be treated as actions without explicit approval
- **Reproducible open demo** — local fixtures and documented scenarios so contributors can verify behaviour
- **Pluggable integrations** — mock sources today; production adapters tomorrow (AIS, news, insurance, market data)

The repository is an ecosystem building block for **responsible agentic logistics research**: a shared reference for HITL controls, provenance-friendly summaries, and maintenance-friendly FastAPI + React structure.

## Table of contents

- [Current status](#current-status)
- [Core capabilities](#core-capabilities)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Current status

Globot is actively maintained as a public research / demonstration project.

| Area | Status |
| --- | --- |
| Stars / forks | Tracked on GitHub; community PRs welcome |
| License | [MIT](LICENSE) |
| CI | Backend syntax + frontend production build on `main` and PRs |
| Default data | Mock / synthetic — **not** live trading, sanctions, or execution |
| Production readiness | **Not** production-ready without deployers adding auth, secrets, data licenses, and review controls |

## Core capabilities

1. **Scenario-driven demo** — reproducible disruption walkthrough with route selection and approval steps
2. **Multi-perspective review** — market signals, route risk, compliance document experiments, hedging calculations
3. **Map-centric visualisation** — Deck.gl-based logistics map for ports, routes, and risk highlighting
4. **Human approval gate** — Approve / details / override path before a recommendation is treated as an action
5. **Optional model providers** — Ollama by default; OpenAI and other providers remain opt-in via server-side env vars

## Quick start

### Prerequisites

- Python 3.11
- Node.js 20+
- [pnpm](https://pnpm.io/) (lockfile: `frontend/pnpm-lock.yaml`)

### Backend

```bash
cd backend
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
# macOS/Linux
# source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # Windows: copy .env.example .env
python start_server.py
```

API: `http://localhost:8000`

### Frontend

```bash
cd frontend
pnpm install --frozen-lockfile
cp .env.example .env   # Windows: copy .env.example .env
pnpm dev
```

UI: `http://localhost:5173`

### Demo path

1. Open `http://localhost:5173/pay`
2. Choose **Watch Demo** → route selection (`/port`)
3. Confirm a route (default Shanghai → Rotterdam) → **Start Simulation** (`/demo`)
4. Follow the activity feed and use **Approve & Execute** only after human review

## Configuration

Copy example env files before local edits. Never commit API keys, Clerk credentials, personal allowlists, uploads, or production data. Defaults contain no credentials and enable no administrator.

| File | Purpose |
| --- | --- |
| `backend/.env.example` | API, optional LLM providers, Clerk issuer, allowlist |
| `frontend/.env.example` | Vite public Clerk key stub and API base URL |

`backend/data/` holds demonstration assets. Treat all outputs as illustrative unless you replace those sources with licensed, verified data and add operational controls.

## Architecture

```text
React / Vite frontend (review UI + map)
              |
              v
FastAPI backend
   |        |         |
 demo   risk/route   documents & hedging experiments
   |
 mock scenarios + local knowledge assets
```

Longer-term maintainer automation and opt-in OpenAI usage: [docs/OPENAI_API_PLAN.md](docs/OPENAI_API_PLAN.md).

## Project health

| Signal | Detail |
| --- | --- |
| License | OSI-approved MIT |
| Community files | CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, GOVERNANCE, SUPPORT |
| Automation | GitHub Actions CI + Dependabot |
| Maintainer | Primary maintainer [@Vector897](https://github.com/Vector897) with write access |
| Codex plan | [docs/OPENAI_API_PLAN.md](docs/OPENAI_API_PLAN.md) |

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md). Near-term priorities:

- Repeatable API and scenario tests in CI
- Explicit, opt-in provider integrations with evaluation fixtures
- Provenance and review records for every UI recommendation
- Maintainer automation for issue triage, PR review summaries, release notes, and dependency hygiene

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening an issue or PR.

| Doc | Purpose |
| --- | --- |
| [SECURITY.md](SECURITY.md) | Vulnerability reporting |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Community standards |
| [GOVERNANCE.md](GOVERNANCE.md) | Maintainer decision-making |
| [SUPPORT.md](SUPPORT.md) | How to get help |
| [CHANGELOG.md](CHANGELOG.md) | Notable changes |
| [AGENTS.md](AGENTS.md) | Guidance for automated coding agents |

Local checks before review:

```bash
python -m compileall -q backend
cd frontend && pnpm build
```

## License

Globot is released under the [MIT License](LICENSE).

**Primary maintainer:** [Vector897](https://github.com/Vector897)
