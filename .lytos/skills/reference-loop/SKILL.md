---
name: reference-loop
description: Run the Lytos loop on the sprint — pick the next eligible card with the CLI, build it, prove it with the gates, and hand a review packet to a human — stopping to call the human in five cases. Use when the owner asks to work through the sprint without a turn between cards, or to take one card from start to review.
---

# Skill — Reference loop

*The reference wrapper of the Lytos loop. The CLI provides the primitives; it never calls an AI and never runs the loop. This skill is the text an agent follows to chain them. Part 1 is the contract any wrapper must honor, whatever the agent. Part 2 applies it in Claude Code.*

---

## When to invoke this skill

- The owner asks the agent to work through the sprint, or to take the next card, with no human turn between cards
- A scheduled or scripted session runs the loop on its own
- Never for a card the CLI refuses (a Definition of done with no `verify: auto` item, a card that is not ready): that card is for a person

---

## Part 1 — The wrapper contract (any agent)

**The owner frames at the entrance (the sprint) and accepts at the exit (`npx lyt close`, on a packet of evidence). The loop runs between those two gates and never past the second one.**

For each card, in this order:

1. **Select.** Run `npx lyt show` first: a card of yours already in `3-in-progress` (sent back from review with a fix list) is finished before a new one is taken. Then run `npx lyt next --json`. Take the `pick`; never choose another card and never pull one in from the backlog. With no `pick`, stop and tell the owner why, from the `reason` of each `blocked` card (`deps-pending`, `no-dod`, `all-human-dod`, `no-machine-dod`, `not-ready`, `epic-in-discovery`).
2. **Check the budget.** Run `npx lyt budget`. A non-zero exit means a ceiling is breached: stop (case 4). With no ceiling set, say in the first message of the run that it is uncapped; that is the owner's choice, not the wrapper's.
3. **Take and start.** Run `npx lyt start ISS-XXXX`: it assigns the card to the git identity, moves it to `3-in-progress` and creates the branch the card names. `npx lyt claim ISS-XXXX` is the same gesture for a card taken by hand; use one of the two, never both. When the CLI refuses (an origin that is ahead, a card claimed by someone else), do not pass `--force`: the card is not yours, so skip it for the rest of the run and list it in the final report.
4. **Brief.** Work from the card, never from the conversation, which does not survive a session: the card itself (`npx lyt show ISS-XXXX --json` gives its `body` and its `dod`), including the Ready section (scope, constraints, out of scope), `manifest.md`, `rules/default-rules.md`, `quality/stack.md` and the task skills that apply: those the card names and those whose `description` matches the task (`skills/session-start.md`, "Task skills"). What the card puts out of scope stays out.
5. **Build and tick as you go.** Build inside the Ready scope and commit with `Refs: ISS-XXXX`. Tick a `verify: auto` item only once its test or command has passed. Never tick a `verify: reviewer` or a `verify: human` item.
6. **Prove.** Run `npx lyt gates ISS-XXXX --json`: `required` lists the gates the card's `risk` makes mandatory, each with a `kind` and a `tool`. Run every `gate` whose `tool` is a command and record its exit code; a `tool` that is a convention ("lockfile committed") is checked by reading, and said so. A `reviewer` or `human` line is not run by the loop: it goes to the packet. A red gate is fixed and the whole set is run again.
7. **Hand over.** Run `npx lyt move ISS-XXXX 4-review`, then `npx lyt report ISS-XXXX`: the review packet, doubt first, is what the loop delivers. The review is not the loop's: `npx lyt review ISS-XXXX` prints the audit prompt for a fresh session, ideally of another model or vendor. The wrapper never writes a verdict on its own work (`npx lyt review --verdict`, `npx lyt review --accept`) and never rules on a `verify: reviewer` item. Then go back to step 1.
8. **Park, never guess.** When the card cannot go on, run `npx lyt park ISS-XXXX --reason <reason>` with one reason of the closed taxonomy below, then go back to step 1. Parking is a first-class exit, not a failure. Returning a card to the sprint (`npx lyt unpark`) is the owner's call.

| Reason | Park the card when |
|--------|--------------------|
| `ambiguous-spec` | The card, the rules or the decision records leave two readings, or contradict each other |
| `missing-dependency` | Something the card needs (a file, a decision, another card) does not exist yet |
| `gate-failed` | A gate stays red after a fix, twice in a row |
| `budget-exhausted` | A ceiling is breached while the card is in flight |
| `human-judgment-required` | The card needs a decision only a person can take, or a gesture to authorize |
| `external-blocker` | Something outside the repository blocks it: a service, a credential, someone else's work |

### When the loop stops and calls the human

The loop halts, and says why, in exactly five cases:

1. **An irreversible gesture to authorize** — real money, real customers, production data; pushing, tagging, publishing, deploying or deleting anything outside the working copy; or an action only a person may take, such as a flag that overrides a refusal of the CLI (`--countersign`, `--discovery-override`). Stop before the gesture, say what it is and why, and wait for an explicit go. If the card cannot go on without it, park it as `human-judgment-required`.
2. **A contradiction the contract does not settle** — two rules or two cards say opposite things and the Ready, the rules and the decision records do not decide. Park the card as `ambiguous-spec`. Never pick a reading.
3. **A serious finding not lifted** — a high finding from a review, a security pass or a red-team pass is still open, with no deviation the owner has accepted in writing. Hand the finding to the owner; do not take another card meanwhile.
4. **The budget is exceeded** — `npx lyt budget` exits non-zero, or the project's own ceiling on cost, minutes or iterations is reached. Park the card in flight as `budget-exhausted`; between two cards, just stop.
5. **Two failures in a row** — the same card fails twice in a row. A third attempt is a guess. Park it as `gate-failed`.

Outside these five, the loop does not interrupt the owner.

### The lines that do not bend

- **The loop never closes a card.** `npx lyt close` is a human act: the last transition the loop makes is `4-review`. It never edits a `status:` by hand, never moves a card by hand, and never adds a card to the sprint.
- **It never ticks a `verify: human` item**, never writes a verdict on its own work and never reviews it.
- **It never guesses**: ambiguity parks, it is never resolved by a reading of the wrapper's own.
- **It never forces**: `npx lyt start --force` and `npx lyt claim --force` are a person's decision.
- **It never passes `--countersign`**: `npx lyt review --countersign` records the owner's countersignature of a review whose independence is below the minimum for the card's risk. It is a person's decision: a wrapper that passed it would record its own as the owner's.
- **It never passes `--discovery-override`**: `npx lyt move --discovery-override` and `npx lyt start --discovery-override` let a leaf of an epic still in discovery enter the sprint, on a reason recorded as the accountable human's. It is a person's decision.
- **A refusal that suggests a bypass is a stop.** When the CLI refuses and suggests one of these flags, the wrapper does not run it: it stops and calls the human (case 1, an action only a person may take), naming the refused command, the card and the flag it suggests. If the card cannot go on without it, park it as `human-judgment-required`.

---

## Part 2 — Running it in Claude Code

- **Call the CLI as `npx lyt`**: the bare `lyt` binary is usually not on the PATH, and "command not found" does not mean the tool is absent.
- **The session is the loop.** After a card is handed over or parked, go back to step 1 in the same session. One card per iteration: do not start a second before the first is at `4-review` or parked.
- **Delegate the building, keep the steps.** Build each card in a sub-agent (the `Agent` tool) whose prompt is the brief of step 4, plus the exact files to touch, the report format it owes (what was done, the evidence, the result, what could not be verified) and what it must not do. Choose its `model` from the card's `complexity` and the manifest table, and inherit the session model when in doubt (`skills/session-start.md`). Selecting, starting, proving, handing over and parking stay with the session. Run the gates yourself: a sub-agent's "tests pass" is a claim, not evidence.
- **Review in a fresh context.** Run the audit prompt of `npx lyt review ISS-XXXX` in a sub-agent that has not seen the build, on a different model when you can. The same model on a fresh context is a weak review: say so in the packet.
- **Call the human by ending the turn.** Name the case (one to five), the card, what was done and the one decision needed. A Claude Code session has no one to answer mid-turn; do not start another card to fill the wait.
- **Keep the permission prompts.** Do not switch on a skip-permissions mode to speed the loop up: a prompt on a push, a publish, a deploy or a delete is case 1 working as intended.
