---
id: ISS-0161
title: "Public launch: a Show HN once the product is proven by use, not before"
type: chore
priority: P2-normal
effort: L
complexity: standard
skill: documentation
skills_aux: []
status: 1-backlog
branch: "docs/ISS-0161-public-launch-show-hn"
depends: []
created: 2026-11-20
schema_version: 2
risk: low
---

# ISS-0161 — Public launch: a Show HN once the product is proven by use, not before

## Context

Lytos is a public project. The goal of a launch is **feedback from practitioners, first outside users and contributors**; GitHub stars are a by-product, not the target. A Hacker News post is a one-shot moment: most Show HN posts go unnoticed, and the audience is technical and sceptical. It will ask "why not Spec Kit, or a Ralph loop?" in the first ten minutes, so the answer has to be ready and true.

What Lytos can honestly claim, and can show: a human gate at the entry and the exit of the loop, Definition-of-Done items that a machine can check, gates that scale with risk, an independent review (with a ladder of independence when only one AI is available), everything as plain files in git, and a CLI that never calls an AI, so it works with any agent. A claim without evidence from real use is not a claim.

The private notes already hold an earlier Show HN draft (positioning: persistent project context instead of personas). The product has moved on to governed loops; the draft, the title and the first comment must be rewritten for the new story.

## Intent

A stranger lands on the repository, understands in ten seconds what Lytos does that the other spec-driven or loop frameworks do not, installs it, and has a working project in three minutes. The author is available for hours to answer.

## Readiness gate (nothing is posted before every item is green)

- **The product is proven by use**: Lytos 1.7 is released and has run on a real project for at least two to three weeks, with measured results (cards closed, what the reviews caught, cost per card), and on a second project.
- **The first run works everywhere**: `npm i -g lytos-cli && lyt init` verified on macOS, Linux and Windows (a CI matrix and one manual pass each).
- **A three-minute demo** exists (recording plus a short written quickstart).
- **The repository is exemplary**: one branch and one PR per card, protected `main`, squash merges, `CONTRIBUTING.md`, `SECURITY.md`, PR and issue templates, release notes, no private names in the tree or in the history, a clean first impression.
- **The site is up to date**: lytos.org describes the governed loop (verify modes, risk-tiered gates, review independence, discovery, epics and milestones) and has an honest comparison page.
- **A soft launch happened**: three to five outside developers tried it and their friction was fixed.
- **The inbound load is planned**: who triages issues and PRs, response times, what is out of scope.

## Out of scope

Paid promotion, star campaigns, asking anyone for upvotes or stars, bots, and any claim the repository cannot back up.

## Child cards (to create)

Site refresh after 1.7 · blog series (three articles) · repository hygiene (CONTRIBUTING, SECURITY, templates, branch protection) · Windows and Linux verification · three-minute demo · comparison page · soft launch with outside developers · Show HN text and author's first comment (kept private until the day) · post-launch review.

## Definition of done

- [ ] Lytos 1.7 is released and its use on a real project is documented with measured results — verify: auto
- [ ] A CI matrix runs the install and `lyt init` on macOS, Linux and Windows — verify: auto
- [ ] The repository checklist (templates, protected `main`, no private names in the history) is green — verify: auto
- [ ] The soft launch took place and its feedback is addressed — verify: auto
- [ ] The maintainer decided to post, on the evidence above — verify: human:product-intent
