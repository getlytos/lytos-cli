---
id: ISS-0129
title: "Every defence against over-engineering is detective — write the ladder, and the rubric it makes decidable"
type: feat
priority: P2-normal
effort: S
complexity: standard
domain: [method, cli]
skill: ""
skills_aux: []
status: 1-backlog
branch: "feat/ISS-0129-write-time-ladder-and-rubric"
depends: [ISS-0107]
created: 2026-08-12
updated: 2026-08-12
schema_version: 2
risk: low
---

# ISS-0129 — The one gate we point at over-engineering resolves to nothing

## Context — a dangling pointer, and a missing half

The quality kit carries the row:

```
| over-engineering | reviewer | medium,high | rubric:over-engineering |
```

The kit documents what that means: *"`reviewer` and `human` entries carry a `tool` too — a
pointer, not a command: `rubric:<name>` for a reviewer prompt … That is what makes the
classification auditable."*

**No rubric exists.** `.lytos/quality/` holds `kit.md` and `stack.md`, nothing else; `grep -rn
"rubric" src/` returns zero hits. The pointer resolves to nothing, and nothing detects that it
resolves to nothing — which is precisely the failure the kit's own three-kinds table says the
`reviewer` kind exists to prevent: *"a rule that sounds enforceable but silently isn't."*
`rubric:security`, `checklist:a11y` and `checklist:intent` are dangling the same way.

The second gap is structural, and larger. ADR-0005 conceded over-engineering is *"the hardest to
gate — it is the absence of something, and more code passes more gates"*, then routed it to a
reviewer and named the best structural defence as small, tightly-scoped issues. Both defences are
**detective**: a reviewer reads a finished diff, a tight DoD bounds the damage after the fact.

Nothing in the method runs **before the code is written**. There is no ordered procedure an agent
executes to decide *not* to write something. The gap shows in what we had to write by hand:
`cli-rules.md` carries a project-specific "Dependencies — minimal runtime deps / no dependency for
YAML / no dependency for colours" section. That is one project rediscovering, locally, a rung of a
procedure the method never stated.

## Ready

- **Scope** — one ordered pre-write decision procedure in the rules, and one rubric file
  (`over-engineering`) that lets the reviewer judge a diff against those same rungs. Plus the
  minimum wiring that makes a dangling `rubric:` / `checklist:` pointer visible.
- **Constraints** — the procedure must be short enough to sit in context before every task
  (rungs, not an essay), and it must carry its own non-negotiables explicitly, or it becomes a
  licence to skip validation. The rubric and the rules state the *same* rungs — one source of
  judgment, read from two ends.
- **Out of scope** — the *content* of the other dangling pointers: `rubric:security`, and
  `checklist:a11y` / `checklist:intent` (**ISS-0104** owns the human checklist library). Only
  their *resolution* is checked here. No intensity modes — `risk:` is already the method's dial
  and a second orthogonal one would be the very thing this issue guards against. No debt ledger —
  `// TODO(ISS-XXXX)` already points at a real issue, which is strictly better than a floating
  marker.
- `risk: low` — additive. Nothing existing changes behaviour; a new rubric file, a rules section,
  and one pointer-resolution check.

## The gesture

1. **The ladder, in `rules/default-rules.md`** — an ordered procedure run *after* understanding
   the problem, never instead of it: does this need to exist at all → is it already in this
   codebase → does the stdlib do it → is it a native platform feature → is it an already-installed
   dependency → can it be one line → only then, the minimum that works.

2. **Its non-negotiables, stated in the same breath.** Minimal is not negligent: validation at
   trust boundaries, anything that can lose data, security, accessibility, and understanding the
   problem first are never on the chopping block. Without this line the ladder is a hazard; with
   it, it is a senior's default. The list is not new — it is the `low` tier of our own matrix, said
   at write time instead of at review time.

3. **`quality/rubrics/over-engineering.md`** — the reviewer reads the diff against the same rungs,
   plus the signals ADR-0005 already named but never wrote down: diff size against the issue's
   declared `effort`, new abstractions or indirection introduced for a single caller, a new
   dependency for a one-off. Establishes the convention `rubric:<name>` →
   `quality/rubrics/<name>.md`. One file, not a library.

4. **Make the pointers honest.** `lyt doctor` resolves each `rubric:<name>` / `checklist:<name>` in
   the kit to a file and warns when it does not exist. Roughly ten lines, and it converts four
   silent lies into four visible warnings.

## Definition of done

- [ ] The ladder is stated in `rules/default-rules.md` as an ordered pre-write procedure, with its non-negotiables in the same section — verify: auto
- [ ] `quality/rubrics/over-engineering.md` exists and names decidable signals (diff vs declared `effort`, abstraction or indirection for a single caller, new dependency for a one-off) — verify: auto
- [ ] The rungs in the rubric and the rungs in the rules are the same list — verify: auto
- [ ] `lyt doctor` warns on a `rubric:` / `checklist:` pointer in the kit that resolves to no file — verify: auto
- [ ] Tests: pointer resolution on a resolving case and a dangling case — verify: auto
- [ ] The bundled `method/` copies and the dogfood `.lytos/` copies stay identical; `lyt init` ships both new files — verify: auto
- [ ] Measured on this repo: the rubric run against one recent merged diff, and what it flagged — or that it flagged nothing — recorded in this issue — verify: human
- [ ] Does the ladder change what an agent actually writes here, or is it decoration — verify: human

## Notes

- **Source, and the honest limits of it.** The ladder is adapted from **Ponytail**
  (github.com/dietrichgebert/ponytail, MIT) — *"the best code is the code you never wrote"* — and
  its "lazy, not negligent" guarantee. Its published benchmark (−54 % lines, −20 % cost, −27 %
  time) is self-run on **one** FastAPI + React repo, 12 tasks, n=4, on Haiku 4.5; lines of code is
  a proxy, not a quality metric, and a small model over-engineers more than a large one, so the
  gain on a frontier model is very likely smaller. The project itself retracted an earlier
  −80/94 % claim as an unfair baseline, which is a point in its favour. **We take the idea, not
  the number** — hence the measured DoD item above: the claim is validated on our own repo or it
  does not count.
- **We vendor the ladder; we do not install the plugin.** Ponytail ships as a marketplace plugin
  with Node lifecycle hooks that inject a third party's instructions into every session. Lytos's
  premise is that what enters context is deliberate, versioned, and reviewable. An unpinned
  external prompt in every session is the opposite of that, whatever its content.
- **The Out of scope list above was produced by the ladder itself.** Intensity modes were rejected
  at rung 1 (does this need to exist — we already have `risk:` as the dial), the debt ledger at
  rung 2 (already in this codebase — `// TODO(ISS-XXXX)`, which points at a real issue rather than
  a floating marker). That is the general rule for anything arriving from outside: an external
  idea climbs the same rungs as a line of code, and the method needs no separate intake process to
  evaluate it. Worth keeping in mind when the next external ruleset shows up.
- The companion issue is **ISS-0128** — that one removes mandates nothing backs; this one adds the
  procedure that decides what not to write. Neither depends on the other.
- Watch the failure mode this creates: a ladder in context is a licence to under-build if the
  non-negotiables are ever separated from it. They stay in the same section, never in an appendix.
