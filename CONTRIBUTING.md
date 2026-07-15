# Contributing to Globot

Thanks for helping improve Globot. Contributions are welcome in code, documentation, tests, demo scenarios, and design review.

## Before you begin

1. Search existing issues and pull requests to avoid duplicate work.
2. For a material change, open an issue first and describe the user problem, proposed approach, and validation plan.
3. Do not include credentials, personal data, confidential shipping records, or licensed data that cannot be redistributed.

## Development workflow

1. Fork the repository and create a focused branch from `main`.
2. Keep the change small and explain the behaviour it changes.
3. Update relevant documentation and examples in the same pull request.
4. Run the checks below before requesting review:

   ```bash
   python -m compileall -q backend
   cd frontend && pnpm build
   ```

5. In the pull request, state the motivation, how you tested it, and any follow-up work.

## Pull-request expectations

- Use clear, descriptive commit and pull-request titles.
- Include tests when changing behaviour; explain why when tests are not practical.
- Keep generated files, local databases, uploads, and secrets out of commits.
- Preserve the human-review boundary for recommendations that could affect logistics, compliance, or financial decisions.
- Be patient and respectful during review. Maintainers may request revisions, defer work, or close changes that do not fit the roadmap.

## Reporting bugs and proposing features

Use the GitHub issue templates. A good report includes reproduction steps, expected and actual behaviour, environment details, and a minimal example where possible. Please do not use public issues for security vulnerabilities; follow [SECURITY.md](SECURITY.md) instead.

By contributing, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
