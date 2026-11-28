# Contributing to lytos-cli

Thanks for looking. Lytos is a small, opinionated project maintained by one person, so this page says plainly how contributions work.

## The short version

- **Issues and discussions are welcome from everyone.** Bug reports, questions, ideas, and feedback on the method are the most useful thing you can send.
- **For code, open an issue first.** A pull request is welcome once a maintainer has labelled the issue `help wanted`. A pull request with no prior discussion may be closed, without any judgement on its quality: it is a question of keeping the project coherent.
- **Nothing is merged without the maintainer.** Only the maintainer merges, tags and publishes.

## How this repository is governed

- `main` is protected: changes arrive by pull request, with the CI green, squash-merged (one commit per card). Nobody pushes to `main` directly, including the maintainer.
- Release tags (`v*`) are created by the maintainer only. A tag triggers the release workflow, which re-runs every check and publishes to npm with a signed provenance; there is no token to steal.
- CI runs for first-time and outside contributors only after the maintainer approves it.
- Secret scanning and push protection are on; vulnerability reports are private (see [SECURITY.md](SECURITY.md)).

## Working on a change

Lytos is built with Lytos: the work is tracked as cards under `.lytos/issue-board/`. One card, one branch, one pull request.

1. Branch from an up-to-date `main`: `<type>/ISS-XXXX-<slug>` (`feat`, `fix`, `docs`, `chore`).
2. Commit with a conventional title that carries the card, and the trailer: `feat(ISS-0123): what changed` then `Refs: ISS-0123`.
3. Run what CI runs: `npm ci`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run secrets:scan`, `npm run build`, `npm test`. The build tool needs Node 22.18 or later on the 22 line, 24.11 or later on the 24 line, or Node 26 and later.
4. Tests come first: a bug fix starts with a failing test; a behavior change says so in the pull request.
5. Open the pull request with the template. Keep it to one card.

## Pull requests written with an AI tool

Welcome, with two conditions: you understand the change and can explain it, and you say in the pull request that an AI tool helped. Large generated changes with no prior discussion will be closed.

## Never include

Real names of clients or projects, absolute paths of your machine, tokens or private URLs. A generic check in the test suite looks for the common cases; it is not a substitute for care.

## Conduct

Be kind and be specific. Disagree with the idea, not the person. The maintainer may close or lock any thread that stops being useful.

## Response times

This is maintained alongside other work. Expect days, not hours. A quiet issue is not a rejected one.
