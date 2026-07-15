# Changelog

All notable changes to Globot will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project aims to follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- MIT `LICENSE` and community health files (Contributing, Security, Code of Conduct, Governance, Support).
- CI workflow (backend syntax + frontend production build) and Dependabot updates.
- Maintainer-oriented OpenAI/Codex plan and public roadmap under `docs/`.
- Backend / frontend `.env.example` files with safe defaults.
- Typed decision-record schemas for human-reviewed recommendations.

### Changed

- Rewrote the README as an OSS decision-support project (badges, architecture, clear mock-data boundaries).
- Removed personal administrator defaults; debug mode is off by default.
- Frontend package renamed to `globot-frontend`; Docker base image aligned to Python 3.11.
