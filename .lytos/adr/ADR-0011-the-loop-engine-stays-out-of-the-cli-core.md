# ADR-0011 — The loop engine stays out of the CLI core: a reference wrapper as method content

Date: 2026-11-20

Status: Accepted (decided by the owner, 2026-11-20)

---

## Context

ADR-0004 makes the CLI provide primitives (`lyt next`, `start`, `gates`, `report`, `park`, `review`, `budget`) while a wrapper or the App orchestrates; the manifest says Lytos is not an AI tool. Tools that ship a loop runner are easier to adopt. The question is whether Lytos should ship one, and where.

## Options

| Option | Build cost | Maintenance | Robustness |
|---|---|---|---|
| A. No engine | none | none | each user assembles the loop alone |
| B. A reference wrapper as method content (a skill and a contract), no code | low | low: text that cites existing commands | agent-specific but tested for consistency |
| C. A separate package (`lytos-loop`) with adapters per agent | medium | high: adapters churn with each agent CLI | isolated from the core |
| D. An engine in the CLI core that launches the user's agent | high | high | runs model-driven code with the user's rights inside the CLI; breaks the manifest |

## Decision

**B now. C later, only if use shows the need, and only with a budget cap, resume after a failure and stop-on-block built in. Never D.**

The reference wrapper is a skill for Claude Code plus the contract of what any wrapper must do: select with `lyt next`, claim and start the card, brief the agent from the card, run the gates, assemble the review packet, park with a reason from the fixed taxonomy when blocked, stop and call the human in the five cases (an irreversible action to authorize, a contradiction in the specification the contract does not settle, a serious finding not lifted, a budget exceeded, two failures in a row), and never close a card.

## Consequences

A test checks that every command the wrapper cites exists and every park reason it names is in the taxonomy, so the content cannot drift from the CLI. Other agents add their own wrapper from the contract. The App remains the full orchestrator.

## Non-goals

The CLI never calls an AI. No process spawning in the core.
