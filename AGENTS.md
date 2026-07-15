# Agent contribution guidance

Automated coding agents working in this repository must follow the same standards as human contributors.

## Scope and safety

- Prefer small, reviewable changes with tests or a documented validation step.
- Do not add credentials, tokens, personal data, private URLs, local paths, or generated databases to commits.
- Treat model outputs, financial calculations, compliance assessments, and route recommendations as advisory. Do not remove human review or approval controls.
- Do not claim that mock data is live, verified, or production-ready.

## Required checks

Run the checks that cover your change before proposing it:

```bash
python -m compileall -q backend
cd frontend && pnpm build
```

Update `README.md` and the relevant documentation whenever setup, configuration, data assumptions, or user-visible behaviour changes.
