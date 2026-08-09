# ADR-0005 — Executable standards (the quality kit)

Date: 2026-08-09

Status: Proposed

---

## Context

ADR-0004 established that an autonomous loop must **gate** quality, not instruct it —
a rule written in prose is worth zero because an LLM does not obey it. But ADR-0004 did
not say *what fills the gates*. This ADR answers the practical questions that decide
whether agents actually work well:

- How do we ensure agents use the **real, current stack** (pinned versions, real APIs)
  and do not invent a stack or reach for deprecated / hallucinated APIs?
- How do we ensure agents **conform to the project's declared design system** (whatever
  it is — Tailwind, Material, a custom token set…) instead of an ever-growing pile of
  ad-hoc CSS on every addition?
- How do we keep agents **accessibility-aware** by construction?
- How do we hold the line on **SOLID / KISS** and prevent over-engineering?

The honest answer is a **ladder of enforcement mechanisms**, from hard to soft. Every
requirement is pushed as high (as hard) as it can go; the irreducible residual falls to
the adversarial reviewer, then to the human. **Nothing rests on the agent's memory.**

| # | Mechanism | Hardness |
|---|-----------|----------|
| 0 | Upstream framing (rules / skills) | soft — reduces, never guarantees |
| 1 | **Ground-truth injection** (Context7-style: inject the real docs of the pinned version, require citation) | context, not memory |
| 2 | **Deterministic gates** (lint / type / format / deprecation) | hard — the machine says NO |
| 3 | **Fitness functions** (architecture tests) | hard |
| 4 | Adversarial cross-model reviewer (rubric-driven) | judgment |
| 5 | Human checklist | judgment — the residual |

Because Lytos App is multi-project, "which lint config / which tokens / which a11y
budget" cannot be remembered. Like the review checklist (ADR-0004 §6), the standards
must be **versioned and live in the repo**, travelling with the project.

## Decision

### 1. Pillar 3 (Standards) becomes *executable*

Today `rules/` holds prose quality criteria. This ADR binds **each rule to a checker**.
A rule that says "prefer KISS" does nothing; a rule where "design" points to a Stylelint
config that *fails* on raw values governs. Prose rules that cannot (yet) be bound to a
checker are explicitly marked as *reviewer-judged* or *human-checked*, never as silently
enforced.

### 2. The quality kit — a versioned per-project artifact

A per-project kit, living in the repo (e.g. `.lytos/quality/`), holds:

- **Stack contract** — pinned versions (the lockfile is truth), the allow-list of
  dependencies, a `no-new-dependency-without-ADR` rule, and the source of current docs
  for injection.
- **Design system** — the project's *declared* DS (Tailwind, Material, a custom token
  set, …) and its guideline source. The kit does not prescribe a DS; it records which one
  the project uses so the gate can enforce conformance to *that* DS. (A custom token set
  might be an oklch ramp + spacing/type scales — that is one example, not the rule.)
- **Gate configs** — lint / type / format / a11y / architecture / complexity configs.
- **Reviewer rubric** — the versioned prompt the adversarial reviewer applies.

The `verify: auto` DoD items (ADR-0004 §4) **reference the kit**. This is what makes
ADR-0004's gates real rather than theoretical.

### 3. Ground-truth injection, paired with verification

A skill injects the real docs of the pinned versions into the agent's context at work
time and **requires citation** of the API used. Injection alone guarantees nothing — the
agent can ignore or misuse the docs — so it is always paired: injection **+**
typecheck/tests (which catch an invented API) **+** the reviewer checking citations.
Doc sources are **allow-listed and version-pinned**: pulling live docs into an autonomous
loop is a prompt-injection surface, and a poisoned page is a real vector.

### 4. Accessibility contrast is a deterministic gate

Contrast ratio is computable from any color representation (oklch makes it convenient, but
is not required), so a gate can **reject a color pair** that fails WCAG/APCA —
accessibility contrast becomes a deterministic gate, not a hope. The irreducible part of
a11y (real screen-reader behavior, logical order) stays on the human checklist.

### 5. Design sprawl is a structural, not a moral, problem — enforce the *declared* DS

"Endless CSS on every addition" is prevented by construction: adding UI must **conform to
the project's declared design system** instead of writing ad-hoc CSS. The gate is
parameterized by that DS — Tailwind → tokens-only, no arbitrary values (`[...]`), single
theme config; Material/MUI → theme tokens and the component API, no hardcoded values; a
custom token set → `var(--token)` only. **The method never prescribes a DS** (oklch, a
particular scale…); those are examples. It enforces conformance to whichever the project
declared — and injects that DS's guidelines the same way it injects code-API docs (§3).

## Invariants & limits (the honest lines)

1. Every requirement lives at the highest hardness it can reach; the residual is
   explicitly routed to reviewer (4) or human (5), never left implicit.
2. **Over-engineering is the hardest to gate** — it is the *absence* of something, and
   *more code passes more gates*. Useful signals: diff size vs the issue's `effort`,
   cyclomatic complexity, count of new abstractions/deps introduced for a one-off. But it
   is irreducibly judgment → reviewer + human. The best structural defense is **small,
   tightly-scoped issues** — over-engineering thrives in vague scope; a tight DoD is
   itself an anti-over-engineering mechanism.
3. Injection reduces hallucination, it does not eliminate it — always pair with a gate.
4. Live-doc injection widens the trust surface — allow-list and pin.

## Consequences

**Issues** (`lytos-cli`): the versioned quality kit + executable rules (ISS-0107), the
ground-truth injection skill (ISS-0108), the declared-DS conformance gate + computed-
contrast gate (ISS-0109).

**Relationship to ADR-0004**: the loop *consumes* these gates; it does not define them.
The kit is what the loop's `verify: auto` items point at.

**Propagation**: method decision → must land in `lytos-method` (tracked with the ADR-0004
propagation, ISS-0106).

**Both surfaces**: the CLI ships and validates the kit; the App surfaces its state (which
gates are green) in the review packet and cockpit.

## Non-goals

- Not a fixed, one-size list of tools — the *ladder* and the *kit contract* are fixed;
  the concrete linters/tokens are per-project.
- Does not replace human taste or intent review — it maximizes what is gated so the human
  spends judgment only on the residual.
