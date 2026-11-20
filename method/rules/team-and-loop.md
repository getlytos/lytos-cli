# Team and loop

*The roles of a Lytos team, and the loop that runs between two human gates. Read it when you
orchestrate several agents, or when you decide what a person must still look at.*

A role here is **operational, not a persona**: no voice, no character. It is a mission, an input, an
output, a right and a criterion that blocks. One session may play several roles on a small project.
What never bends: the session that implements a card does not review it (see "Implementer and
auditor" in `LYTOS.md`).

## The roles

| Role | Mission | Input | Output | Right | Blocks when |
|------|---------|-------|--------|-------|-------------|
| **Framing** (orchestrator) | Turn the owner's intent into ready cards, route each card to the right roles by `risk`, keep the board true | The owner's intent, the manifest, the board | Cards with Ready, a Definition of Done with `verify:` markers, a `risk` | Writes cards and moves them with the CLI; writes no code | A card has no machine-verifiable item or no out-of-scope: it is not ready |
| **Designer** | Produce or update the mock-up the build follows | Intent, design system, existing screens | Mock-up and its entry in the design register (`design/registry.md`, if the project uses one) | Writes in the design tool; reads the code | The mock-up contradicts the product's data or rules: the gap goes back as a prompt, never fixed silently |
| **UX expert** | Judge the journey | Card, preview captures | Review per `rubrics/ux.md` | Read-only | A high finding: missing state, raw error, a primary button on a read-only screen |
| **Design-system keeper** | Keep tokens and components the single source | Diff, design system | Review per `rubrics/design-fidelity.md` | Read-only | A raw value where a token exists, or a component redrawn instead of reused |
| **Code-quality lead** | Keep the code small, layered and tested | Diff, ADRs, `quality/stack.md` | Reviews per `over-engineering`, `architecture`, `tests-negative` | Read-only | A high finding: a second path for one gesture, a dependency with no decision record, a refusal rule with no forbidden-case test |
| **Developers** | Build the card, nothing more | One ready card, rules, skills | Code, tests, docs, a card moved to `4-review` | Write, inside the card's scope | Ambiguity: they park the card (`lyt park`), they never guess |
| **End-to-end tester** | Prove the behavior in a real browser | Card, the running preview | A replayed journey with captures or a run log | Writes tests and evidence, never product code | The journey fails or cannot be replayed. Nothing is "checked" without proof attached |
| **Cyber defender** | Find what is exploitable | Diff, running preview | Review per `rubrics/security.md` | Read-only | Any exploitable finding at confidence 0.8 or more |
| **Red team** | Try to break the delivery | Diff, running preview | Review per `rubrics/red-team.md`; probes that prove a defect archived under `.lytos/review/<date>/` | Read-only on the code | A probe that proves a defect |
| **Solutioner** (cost) | Find the cheapest robust way, before and after the code | Card, constraints | The solution study in "Proposed solution"; at review, a conformance report per `rubrics/cost-review.md` | Writes the study in the card; read-only on the code | A cheaper option that fails the robustness floor is discarded; a cost class that grows with the number of units, absent from the study, blocks |
| **Release** | Put it in production without surprise | Accepted delivery, the owner's go | Deployed version, post-deploy check, rollback ready | Writes to production, only after the go | No owner's go, no way back, or a failing post-deploy check: roll back |

**Every role hands back a structured report, never prose alone:** what was done, the evidence (file
and line, command, capture), the result, and what could not be verified. Reviews follow
`quality/rubrics/FORMAT.md`: read-only, a severity, a confidence of at least 0.7, a scenario, a
one-sentence fix. A review never ticks a `verify: human` item.

## The loop

**The owner frames at the entrance and accepts at the exit, on a packet of evidence. Between the
two, the loop turns by itself.**

1. **Frame.** The owner states the intent. The orchestrator writes ready cards; the solutioner
   writes each solution study. When the intent covers several cards it becomes an epic in
   `phase: discovery`: the owner, the designer and the solutioner settle the thin slice and the
   feasibility matrix, and the owner freezes the epic. Its leaves enter the sprint only after the
   freeze, and `npx lyt next` skips them until then (`rules/default-rules.md`, "Three Levels").
2. **Build.** `npx lyt next` picks a card; developers `npx lyt start` it, build, and
   `npx lyt move … 4-review`.
3. **Prove.** The machine gates run. `npx lyt gates ISS-XXXX` lists what the card's `risk` makes
   mandatory: the reviews above, the end-to-end tester's replay.
4. **Loop back.** A high finding sends the card back to `3-in-progress` with a fix list. A finding
   that comes back twice becomes an automated test.
5. **Pack.** `npx lyt report ISS-XXXX` assembles the packet: doubt first, then the green evidence.
6. **Release, then accept.** Release acts only after the owner's go on irreversible gestures. The
   owner accepts or rejects on the packet; `npx lyt close` stays theirs. The loop never closes its
   own work. An epic is accepted on its scenarios and the packet, not because its leaves are done.

**The owner does not replay what the machine has proved.** What stays theirs is what no run can
rule on: intent (`human:product-intent`), a real screen reader (`human:screen-reader`), a legal or
accounting opinion (`human:legal-accounting`), a gesture with real money or real customers
(`human:real-money`). Walking a screen is the tester's work.

## When the loop stops and calls the human

The loop halts, and says why, in exactly five cases:

1. **An irreversible gesture to authorize** — real money, real customers, production data; or an action only a person may take, such as a flag that overrides a refusal of the CLI (`--countersign`, `--discovery-override`).
2. **A contradiction the contract does not settle** — two rules or two cards say opposite things
   and the Ready, the rules and the ADRs do not decide. The card is parked as `ambiguous-spec`.
3. **A serious finding not lifted** — a high finding still open, with no deviation the owner has
   accepted in writing.
4. **The budget is exceeded** — `npx lyt budget`, or the project's own ceiling on cost, minutes or
   iterations.
5. **Two failures in a row** — the same card fails twice in a row. A third attempt is a guess.

Outside these five, the loop does not interrupt the owner.

The reference wrapper that runs this loop, with the contract any wrapper must honor, is the skill `skills/reference-loop/SKILL.md`.
