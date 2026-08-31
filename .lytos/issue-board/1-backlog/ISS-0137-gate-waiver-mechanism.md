---
id: ISS-0137
title: "A red gate an issue does not own — the waiver, or the deadlock"
type: feat
priority: P1-high
effort: M
complexity: standard
domain: [cli, method]
skill: ""
skills_aux: []
status: 1-backlog
branch: ""
depends: [ISS-0107, ISS-0114]
created: 2026-08-31
updated: 2026-08-31
schema_version: 2
risk: medium
---

# ISS-0137 — "It is tracked in another issue" is not a passing gate, and not a defect either

## Context — measured, twice on the same fiche

ISS-0133 was returned NO_GO on 2026-08-31, twice, and the second audit named the problem exactly:

> Tracking them in ISS-0132 explains the sequencing but does not make the mandatory gates pass or
> waive them for this issue.

That is correct. It is also unliveable as stated. The `format` gate is red on **51 files** that
have never been prettier-formatted, because the check had never once run (ISS-0107's field
report). ISS-0132 owns the sweep and is **blocked by its own constraint** — "after PR #29 has
landed, never before" — and #29 is a 72-file PR still open. So every issue at `risk: medium` or
above is currently unpassable, for a reason none of them caused and none of them can fix.

Two failure modes, and the method currently has no defence against either:

1. **No waiver.** The board deadlocks behind one piece of unrelated debt. In practice nobody
   deadlocks: the auditor's finding gets argued away in prose, the issue closes anyway, and the
   gate quietly stops meaning anything. This is ISS-0132's lesson arriving through the back door —
   *a gate that is permanently red teaches that red is survivable*.
2. **A waiver with no teeth.** A field anyone can set, on any gate, with no expiry and no owner,
   is a rubber stamp. It converts "the gate is red" into "the gate is off", permanently, and the
   kit becomes decoration.

The distance between those two is the whole issue. ISS-0136 is deliberately **not** this: it fixes
a gate that was asking the wrong question, which is a different act from excusing a gate that is
asking the right one.

## Ready

- **Scope** — a declared, auditable way for an issue to pass while a mandatory gate is red for a
  cause it does not own: the data shape, what `lyt lint` / `lyt doctor` enforce about it, and how
  it reaches the auditor inside the review packet.
- **Constraints** — a waiver must name **who** granted it, **which** gate, **why**, and **which
  issue** will make it green, and it must **expire**. An auditor must see active waivers in the
  prompt rather than discovering the red gate cold, so they can rule on the waiver itself. It must
  never be settable by the implementing agent alone — that is the rubber stamp.
- **Out of scope** — waiving any gate in the ADR-0007 low-risk floor (`tests-unit`, `typecheck`,
  `lint`, `secrets-scan`, `build-reproducible`, `doc-L0`): if those can be waived the floor is not
  a floor. Retro-active waivers on closed issues. Changing which gates are mandatory — that is
  ISS-0114's matrix, and reaching for a waiver when the *tiering* is wrong is treating the symptom.
- `risk: medium` — it changes the meaning of a passing audit across every future issue. A waiver
  that is too easy to grant makes the whole kit advisory, which is worse than having no kit, because
  it looks like one.

## The gesture — a sketch, not a decision

The shape to argue about, not to implement as written:

- A `waivers:` list in the issue frontmatter, each entry naming `gate`, `reason`, `until` (a date,
  not "when ISS-XXXX lands" — a date is checkable), `blocked_by` (the issue that makes it green),
  and `granted_by` (a human, verified against `currentGitUser()` the way `reviewer` already is).
- `lyt lint` rejects a waiver on a floor gate, one with no `blocked_by`, or one past `until`.
- `lyt review` renders active waivers in the audit prompt as their own section, with the standing
  instruction: *a waived gate is not a defect, but an expired or floor-gate waiver is.*
- `lyt doctor` reports the whole board's active waivers, so the debt is visible in one place rather
  than scattered across fiches — the count is the metric that should embarrass us into paying it.

**The alternative that must be argued before building any of this:** waivers may be the wrong
answer entirely. If a gate is red for months, the honest fix is to pay the debt or drop the gate —
which is exactly what ISS-0132 says about `format` and ISS-0136 says about `deps-audit`. A waiver
mechanism could simply be a comfortable way to never do either. Whoever picks this up should first
try to answer: *would we have needed a waiver if we had paid ISS-0132 the week it was opened?*

## Definition of done

- [ ] The alternative above is argued in writing and rejected or accepted, in this fiche — verify: human
- [ ] Waiver schema defined in the frontmatter spec and in `method/quality/kit.md` — verify: auto
- [ ] `lyt lint` rejects floor-gate, unowned, undated and expired waivers, with regressions for each — verify: auto
- [ ] `lyt review` renders active waivers as a prompt section with the standing instruction — verify: auto
- [ ] `lyt doctor` reports the board's active waivers — verify: auto
- [ ] Applied to the case that produced this issue, and the audit round that follows is clean — verify: auto
- [ ] Is the granting friction right — high enough to hurt, low enough to use — verify: human

## Notes

- Field origin: 2026-08-31, ISS-0133's second audit, third to-fix item. Raised there and refused
  there on purpose: a change to the quality-kit contract does not belong inside a `fix:` on the
  review command.
- Related: **ISS-0132** (the `format` gate that produced the deadlock), **ISS-0136** (the
  `deps-audit` gate that was asking the wrong question), **ISS-0128** (prose that does not run).

## Second field instance — 2026-08-31 (ISS-0139)

The release of 1.5.0 hit the same wall from the other side, and turned up a defect in the escape
hatch this issue is meant to replace.

**The instance.** ISS-0139's DoD carried `the release workflow succeeds and npm reports 1.5.0 as
latest`. Half of it came true; the other half **cannot ever** — the release run failed on an
expired credential, and npm refuses to republish an existing version, so no re-tag and no re-run
can reach it. The replacement proof exists and is complete (ISS-0142 published 1.5.1 through the
workflow with SLSA v1 provenance), but the board has no way to say *"this criterion is dead, here
is what discharges it"*. The issue was parked `gate-failed` — the only mechanism that records a
reason in the frontmatter — while everyone knows the park is terminal and will never resume.

**The defect, measured.** `lyt close --force` was the obvious alternative and does not survive
inspection. `buildCloseExtras()` in `src/commands/close.ts:52-72` writes `updated`,
`completed_at` and `commits` — and **nothing that records that the close was forced, or that an
item was left red**. A forced close produces a `5-done` fiche byte-for-byte indistinguishable from
a complete one, in the exact field the manifest calls the project's audit journal. The unchecked
box survives only in the body, where nothing aggregates it: `lyt report --sprint` and `lyt journal`
both read the frontmatter.

So the board currently offers two ways out of a red gate it does not own, and both lie: a park that
says "later" when it means "never", and a close that says "done" when it means "done except this".
That is the deadlock this issue names, with a number attached.

**What it adds to the scope.** Whatever the waiver looks like, it must leave a frontmatter trace
that survives into the derived views — a `waived:` block naming the criterion, the reason, the
discharging issue, and who granted it. And `--force` should either write that trace or stop
existing.
