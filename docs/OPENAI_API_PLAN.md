# OpenAI / Codex maintenance plan

## Purpose

Globot is a maintained open-source decision-support prototype for supply-chain disruption review. If granted Codex for Open Source API credits (and ChatGPT Pro with Codex), the primary maintainer will use them for **real repository maintenance** first, and for **opt-in product experiments** second.

This plan is intentionally concrete: credits should reduce review load and raise code quality without removing human accountability.

## How API credits will be used

### 1. Pull-request review automation (primary)

- Summarise diffs for large frontend map / backend agent changes
- Flag missing tests, secret leaks, and HITL-control regressions
- Draft structured review checklists; a human maintainer must approve or request changes

### 2. Issue triage and contributor onboarding

- Classify bugs vs questions vs features
- Detect incomplete reproduction steps and draft respectful follow-ups for maintainer edit
- Propose “good first issue” labels for safer entry points into the codebase

### 3. Release and documentation workflows

- Draft changelog entries and migration notes from merged PRs
- Keep README / ROADMAP / SECURITY wording aligned with behaviour changes
- Generate dependency-update risk notes when Dependabot opens PRs

### 4. Opt-in product assistance (secondary, server-side only)

- Environment-configured assistance for summarising **fixture documents** and explaining scenario evidence in the demo path
- No OpenAI key in the client bundle; no model output may execute operational, compliance, or financial actions
- All such UI content labelled as model-assisted and reviewable

### 5. Security-oriented review (Codex Security interest)

- Prioritise auth surfaces, CORS, env handling, upload paths, and dependency CVEs when access is granted
- Coordinate fixes privately per [SECURITY.md](../SECURITY.md) when needed

## Guardrails and evaluation

| Guardrail | Rule |
| --- | --- |
| Credentials | Server-side only; never committed |
| Data | Representative, non-sensitive fixtures for development and evaluation |
| Accountability | Humans remain responsible for merges, security disclosure, and consequential recommendations |
| Labelling | Model-assisted content is labelled; sources/provenance retained where available |
| Metrics | Track triage accuracy, review usefulness, latency, and maintainer acceptance before expanding scope |

## Success criteria

Credits are successful if, within two release cycles, Globot shows:

1. Faster, more consistent PR review notes with no increase in merge regressions
2. Clearer issue responses and fewer stalled “needs info” tickets
3. Documented evaluation results for any opt-in product experiment, including known failure modes

Integration configuration, evaluation results, limitations, and breaking changes will be recorded in public pull requests and release notes.
