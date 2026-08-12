---
id: ISS-0107
title: Versioned quality kit — the Standards pillar made executable
type: feat
priority: P1-high
effort: L
complexity: heavy
domain: [cli, method]
skill: 
skills_aux: []
status: 3-in-progress
branch: claude/claude-loops-lytos-wtkc94
depends: []
created: 2026-08-09
updated: 2026-08-12
schema_version: 2
assignee: Claude
started_at: 2026-08-09
review: no-go
review_at: 2026-08-12
reviewer: fredericgalline
---
# ISS-0107 — Make Pillar 3 (Standards) executable

## Context

ADR-0004 says quality must be *gated*, not asked for. ADR-0005 says *with what*. Today `rules/`
is prose: "prefer KISS" does nothing. Each rule must be **bound to a checker**, and the whole
grouped into a versioned kit that travels with the repo (multi-project → nobody memorises which
config belongs where).

## The gesture

One `.lytos/quality/` kit per project: a **stack contract** (pinned versions + allow-listed deps
+ `no-new-dependency-without-ADR` + the docs source), **gate configuration**
(lint/type/format/architecture/complexity, plus the dimensions folded in from ADR-0007: secrets,
build reproducibility, dependency audit, perf/size regression budget, observability /
"fail with context", compatibility/migrations, doc L0/L3), and the **reviewer rubric** (a
versioned prompt). Each dimension is **selected by the risk matrix** (ISS-0114), not applied
uniformly. The DoD's `verify: auto` items (ISS-0101) **point** at a kit entry. Rules that cannot
be gated are marked `reviewer-judged` or `human-checked` — never silently "applied".
Anti-over-engineering signals included: diff size vs declared `effort`, complexity, number of new
abstractions.

## Definition of done

- [x] `.lytos/quality/` structure + stack contract schema — *verify: auto*
- [x] ADR-0007's folded-in dimensions present as checkers (secrets, repro, deps audit, perf, observability, compat, doc L0/L3) — *verify: auto*
- [x] `lyt doctor` checks the kit's presence and coherence — *verify: auto*
- [x] Convention: a `verify: auto` item references a resolvable kit entry — *verify: auto*
- [x] Non-gatable rules explicitly classified reviewer/human, and both kinds actually used in the shipped kit — *verify: auto*
- [x] Docs: how to add an executable rule to the kit — *verify: auto*

## Notes

- Ref: ADR-0005 §1-2. Consumed by ADR-0004's gates; it does not drive them.
- Method propagation tracked by ISS-0106.

## Audit — 2026-08-10

**Verdict:** NO_GO

### Checks
- [x] Tests pass (313)
- [ ] Issue checklist complete
- [x] Rules respected
- [ ] Documentation aligned

### Notes
The kit parser and doctor validation are covered, but both human documentation criteria are unchecked. The template/rules introduce the kit but do not close the explicit review checklist.

### To fix before next review
- [x] Review and document the classification of non-gatable rules as reviewer or human.
- [x] Add and validate user-facing guidance for adding an executable rule, then tick both DoD items.

## Response to audit — 2026-08-10

**Accepted: both documentation criteria were genuinely unwritten.** `method/quality/kit.md` now
carries them.

- **"The three kinds"** — a table stating what `gate` / `reviewer` / `human` mean, who executes
  each, and which failure mode each prevents. The load-bearing sentence: *a rule with no `tool`
  binding is not a rule, it is a wish*. "Prefer KISS" cannot be a gate; it becomes `reviewer` with
  a rubric that says what over-engineering looks like here, or `human`, or it leaves the kit — but
  it never sits in `rules/` looking enforced while nothing checks it.
- **"How to add an executable rule"** — six steps from prose rule to wired gate, with the tier
  guidance that matters (`low` means *every* change pays this cost; most new gates belong at
  `medium,high`) and a worked example across the three kinds.

Two real defects surfaced while writing this, both fixed:

1. **`parseGates` read any 4-column markdown table.** Adding a documentation table to `kit.md`
   silently produced 8 phantom gates. The parser now anchors on the exact `id | kind | tiers |
   tool` header, so a project can document its kit without corrupting its catalog. This was
   latent — it would have hit the first user who added a note table.
2. **`unresolvedGateRefs` compared a lowercased reference against raw ids.** The shipped kit ships
   `doc-L0` and `doc-L3`; every DoD item pinning them was reported unresolved by `lyt doctor`.
   Both sides are lowercased now. Regression test asserts every shipped gate is referenceable.

The `verify: auto` DoD item "an item references a resolvable kit entry" was ticked while defect 2
made it false for two of the shipped gates — worth noting as a case where a machine gate passed
because nothing exercised it on real data. The new test does.

Remaining: your judgment on whether the classification and the guidance read right.

## Audit — 2026-08-12

**Verdict:** NO_GO

### Checks
- [x] Tests pass (338)
- [ ] Machine-verifiable DoD items (`verify: auto`) complete
- [ ] Rules respected
- [ ] Documentation aligned

### Notes
[CRITICAL] `.lytos/quality/kit.md:7` omits `secrets-scan`, one of the mandatory low-risk baseline gates. `lyt doctor` therefore reports the dogfood kit as loosened below the baseline. The same kit also lacks several dimensions promised by this issue.

[CRITICAL] `src/lib/dod.ts:52` accepts only `verify: auto` at the end of an item. The documented and shipped `verify: auto:<id>` syntax is treated as an unqualified item, so a DoD cannot both declare its mode and pin its quality gate.

[WARNING] `src/lib/quality.ts:148` accepts a gate with an empty `tool`, although the kit contract requires every gate to bind to a checker.

### To fix before next review
- [x] Restore the mandatory baseline in the project kit and add a regression that validates the dogfood kit with `lyt doctor`.
- [x] Parse `verify: auto:<id>` as an explicit auto item and cover it in the DoD, lint, and gate-reference tests.
- [x] Reject empty tool bindings for kit entries.

## Response to audit — 2026-08-12

**Defect 2 accepted and fixed — it was the keystone of the three.** `verify: auto:<id>` is the
form `method/quality/kit.md` teaches (step 5 of "How to add an executable rule"), and it was the
one form the DoD parser could not read. Until it parsed, restoring `secrets-scan` to the kit
(defect 1) would have been pointless: no DoD item could have pinned it.

The finding under the finding: **two parsers read the same syntax and disagreed.**
`unresolvedGateRefs` (`quality.ts`) matched `verify:\s*auto:([a-z0-9][a-z0-9-]*)` and resolved the
id against the catalog, while `VERIFY_RE` (`dod.ts`) anchored on `(auto|human)[\s*_)]*$` and threw
the same item out as unqualified. `lyt doctor` validated a gate reference on an item `lyt lint`
was simultaneously reporting as unmarked. The two now agree on the same id charset, and a
regression in `quality.test.ts` asserts it on one shared string — the divergence cannot silently
return.

`human:<something>` deliberately does **not** parse: it is not a documented form, so it falls
through to unqualified and the existing `lyt lint` warning reports it. No new warning was added —
the cheaper rung was already there.

Tests 338 → 343; typecheck and eslint clean. Diff: 3 files, +54/−2.

### New finding, surfaced while running the gates

**The `format` gate cannot fail.** `.lytos/quality/kit.md:12` binds it to `npm run format --
--check`, but `package.json` defines `format` as `prettier --write 'src/**/*.ts'` — the hardcoded
`--write` wins and the appended `--check` is inert. Running the gate as prescribed **rewrote 51
files in `src/`** instead of verifying them (reverted; the working tree is clean apart from this
issue's diff).

This is the same class as the `[WARNING]` on `quality.ts:148`, one level up: that one accepts a
gate with **no** tool, this one accepts a tool that **does not verify anything**. A gate that
mutates the tree is worse than a missing gate — it reports success while changing the thing it was
asked to check, and `src/` was in fact never prettier-clean, which nobody could know because the
check never ran. Fixing the binding (a `format:check` script, or `prettier --check` directly)
belongs with "reject empty tool bindings" — same DoD item, same root cause: nothing validates that
a `tool` string is a *verifier*.

### Defects 1 and 3 — closed the same day

**Defect 1, the missing baseline gate.** `secrets-scan` is restored at `low,medium,high` in
`.lytos/quality/kit.md`, bound to a new `npm run secrets:scan`. No scanner was installed and none
was added: the script is a `git grep` for high-entropy assignments to key-shaped names, excluding
the lockfile. That is rung 3 of the ladder ISS-0129 proposes — stdlib/native before a dependency —
and it matches this repo's own standing rule ("no dependency for YAML parsing, no dependency for
colours"). It exits 0 on a clean tree today.

**The regression that should have existed.** `quality.test.ts` validated
`method/quality/kit.md` — the kit we *ship* — and nothing validated `.lytos/quality/kit.md`, the
kit we *run on*. That is the entire reason the dogfood copy could sit below the baseline while the
suite stayed green. A test now asserts `baselineViolations` and `validateKit` are both empty on
the dogfood kit, so the repo that ships the floor can no longer fall through it.

**Defect 3, unbound tools.** `validateKit` rejects a gate whose `tool` column is blank, with the
kit's own sentence as the message: a gate with no checker is a wish.

**And the binding that could not verify.** The `format` gate pointed at `npm run format --
--check` while `package.json` defined `format` as `prettier --write` — the hardcoded flag won, so
the "check" rewrote 51 files in `src/`. A `format:check` script (`prettier --check`) now exists and
the kit points at it. It currently **exits 1**: `src/` has never been prettier-formatted, which
nobody could know because the check never ran. The gate is now telling the truth; making it green
is a 51-file formatting sweep, deliberately left as its own commit for the human to green-light
rather than folded into this diff.

Note what defect 3 does *not* catch: `npm run format -- --check` was a non-empty string, so an
empty-tool check would never have flagged it. Validating that a `tool` is a *verifier* — that it
can fail — is a further step, and it is the same root as the dangling `rubric:`/`checklist:`
pointers in **ISS-0129**. Recorded there, not solved here.

Tests 343 → 345 (347 with the ISS-0115 fix); `lyt doctor` reports no `quality-kit` finding.
