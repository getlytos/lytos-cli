---
id: ISS-0173
title: "English as the working language: the rule, an automated check and a sweep of the Lytos repositories"
type: chore
priority: P1-high
effort: M
complexity: standard
skill: documentation
skills_aux: [testing]
status: 1-backlog
branch: "chore/ISS-0173-english-as-the-working-language"
depends: []
related: [ISS-0161, ISS-0171]
created: 2026-11-20
schema_version: 2
risk: low
---

# ISS-0173 — English as the working language: the rule, an automated check and a sweep

## Context

Lytos is public and meant to be read by developers worldwide. Its working language must be English everywhere: code, comments, commit messages, pull requests, cards, ADRs, the prompts and templates the method ships, and the repository documents. Localization is a feature, not leakage, and lives only in designated places.

A first audit (a stopword heuristic, so approximate) on 2026-11-20 found: `lytos-cli` is almost entirely English (commits and pull request titles included), with a French section in `CLAUDE.md`, French parts of two archived cards, and the French locale strings and templates of `lyt init` (intentional); `lytos-method` has about thirty files with French content, some of them under `docs/en/` (adapters) and the example manifests; `lytos-website` has a French card (`ISS-0001`); the private `lytos-app` has about 170 files in French (cards and ADRs).

## Proposed solution

State the rule once, check it mechanically, then sweep what the check finds.

| Option for the check | Build cost | Maintenance | Robustness |
|---|---|---|---|
| A. A stopword-ratio heuristic over Markdown and source, with an allow-list of localized paths | low, no dependency | low | cheap; false positives on quotations, handled by the allow-list |
| B. A language-detection library | medium | medium: a dependency in a project that avoids them | better detection, higher cost |
| C. Review by a person | none | high, and it drifts | not enforced |

Decision: **A**.

Localized paths (the allow-list): `docs/fr/`, the French locale strings and templates of `lyt init`, `lytos-method/docs/fr`, the website's `/fr` content and its translated string tables, and private notes (git-ignored).

## Ready

- **Scope** — the rule in `cli-rules.md` (and the manifests of the other repositories), a test in `lytos-cli` that fails on French-dominant files outside the allow-list, the sweep of `lytos-cli`, `lytos-method` and `lytos-website`.
- **Out of scope** — the private `lytos-app` (translate before it goes public, or earlier if wanted), the content of the French locale itself.
- **Solution** — a heuristic check with an explicit allow-list.
- `risk: low`.

## Definition of done

- [ ] `cli-rules.md` states that English is the working language and lists the localized paths — verify: auto
- [ ] A test fails on a French-dominant file outside the allow-list, and passes on the allow-listed ones — verify: auto
- [ ] `lytos-cli` has no French outside the allow-list, `CLAUDE.md` included — verify: auto
- [ ] `lytos-method` has no French under `docs/en/` or in the example manifests, and `lytos-website` has no French card — verify: auto
- [ ] The translations read naturally and keep the meaning — verify: reviewer:over-engineering
