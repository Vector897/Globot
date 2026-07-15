# Security policy

## Supported versions

Security fixes are applied to the latest `main` branch. Releases are not yet versioned; users of older forks should update to the latest commit before reporting an issue.

## Reporting a vulnerability

Please do **not** open a public issue for a suspected vulnerability. Report it privately to the repository owner through the contact method in the GitHub profile, with:

- a clear description and affected component;
- steps to reproduce or a minimal proof of concept;
- potential impact; and
- any suggested mitigation.

The maintainer will acknowledge a report within seven days where possible, investigate privately, and coordinate a fix before public disclosure. Please give maintainers reasonable time to remediate before publishing details.

## Security boundaries

Globot is a demonstration and research project. It must not be deployed with wildcard cross-origin access, default credentials, personal allowlists, or unreviewed data sources. Deployers are responsible for authentication, least-privilege access, secret management, input validation, dependency updates, logging controls, and review of any model-assisted output.

Never commit API keys, Clerk credentials, tokens, user uploads, or operational data. If you discover an exposed secret, revoke or rotate it immediately and report it privately.
