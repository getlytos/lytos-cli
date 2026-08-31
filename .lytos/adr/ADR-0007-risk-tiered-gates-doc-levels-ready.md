# ADR-0007 — Risk-tiered quality gates (proportionality, documentation levels, Definition of Ready)

Date: 2026-08-09

Status: Proposed

---

## Context

ADR-0005 made the standards *executable*, but applied uniformly they invite the
exact failure they were meant to prevent: **over-engineering**. Running a security
audit, a perf budget, and an architecture review on a README typo is waste; *not*
running them on a payment change is an incident. A senior lead's correction is not
"add more gates" — it is: **rigor must scale with blast radius, not be constant.**

We already hold the field for this — `risk: low | medium | high` (ADR-0001) — and
have been ignoring it. Two further omissions surfaced while reviewing the design:

- **Documentation has levels**, not a single "update docs" item. The right level is
  decided by the change.
- **There is no Definition of Ready.** Park-on-ambiguity (ADR-0004 §3) is *reactive* —
  it halts *after* tokens are spent hitting ambiguity. A readiness gate shifts that
  left: catch under-specified work before the loop starts.

And a catalog of stack-agnostic dimensions a senior would flag as missing:
observability / error handling (the manifest's own "Fail with context"), a security
baseline (secrets, dependency audit, input validation), perf/size **regression**
budgets, backward-compatibility / migrations, negative-path testing (cli-rules already
says "test the error paths"), and build reproducibility (lockfile, CI == local).

## Decision

> **Guiding principle — rigor is proportional to risk.** Nothing is "always on".
> The `risk` field selects which gates are mandatory. This is how the executable
> standards (ADR-0005) add coverage without becoming over-engineering.

### 1. The risk → gate matrix

Each dimension is stack-agnostic; the kit binds it to a per-stack tool (as with DS
conformance, ADR-0005). The matrix says *when* a dimension is mandatory. Default
tiering (conservative — a project may tighten it, never loosen below `low`):

| Dimension | `low` | `medium` | `high` |
|---|:---:|:---:|:---:|
| Tests (unit) + typecheck + lint + format | ✅ | ✅ | ✅ |
| Secrets scan + build reproducibility | ✅ | ✅ | ✅ |
| Documentation **L0** (in-code / API) | ✅ | ✅ | ✅ |
| Dependency audit + negative-path tests | | ✅ | ✅ |
| Perf / size **regression** budget | | ✅ | ✅ |
| DS conformance + a11y (UI changes) | | ✅ | ✅ |
| Documentation **L1/L3** (module / contract) | | ✅ | ✅ |
| E2E + backward-compat / migration check | | | ✅ |
| Full security review + architecture review | | | ✅ |
| Documentation **L2** (ADR / diagrams) | | | ✅ |

`risk` absent → treated as `medium` (safe default). The matrix lives in the quality
kit (ISS-0107); this ADR fixes its *shape* and defaults, not the per-stack tools.

### 2. Documentation levels

Docs are not one item. A DoD doc item names the level it requires (`verify: doc <L>`):

| Level | What | Verified |
|---|---|---|
| **L0** in-code | docstrings, types, names | auto (public API documented, examples compile) |
| **L1** module | subsystem README: what / how / gotchas | semi (required on non-trivial change to the module) |
| **L2** architecture | ADR, system / data / sequence diagrams, the "why" | human (staleness detectable) |
| **L3** contract | API schema / OpenAPI, public interface, changelog | auto (schema ↔ implementation) |
| **L4** operational | runbook: run / deploy / debug | overlaps `skills/` |

Proportional to the change: typo → L0; new endpoint → L0 + L3 + changelog; architecture
shift → L2. Never a blanket "document everything".

### 3. Definition of Ready (the entry twin of DoD)

An issue is loop-eligible (ADR-0004 §1) only when it is **ready**: clear scope, stated
constraints, explicit out-of-scope, a testable DoD (ADR-0004 §4), and a set `risk`.
This shifts ambiguity left — it turns "40% of parks = ambiguous-spec" (the park metric)
from a post-mortem into prevention. `lyt next` refuses un-ready issues; `lyt lint`
flags them; the issue template carries a Ready section.

## Anti-over-engineering invariants

1. **Nothing is always-on.** Every dimension enters through the risk matrix; adding one
   as unconditional is forbidden.
2. **The matrix defaults conservative** and a project may only *tighten* it.
3. **The DoD is still the contract** — a dimension applies only via a DoD item.
4. **Small, ready, well-scoped issues** remain the first-line defense; the matrix is the
   second.

## Consequences

**Issues** (`lytos-cli`): the risk→gate matrix (ISS-0114), the Definition of Ready
(ISS-0115), the documentation-levels convention (ISS-0116). The remaining dimensions
(observability / error handling, security baseline, perf budget, compat/migrations,
reproducibility) **fold into the quality kit (ISS-0107)** as checkers the matrix
selects — not eight separate issues (that would be the very over-engineering this ADR
guards against).

**Refines ADR-0005**: proportionality is *how* the executable standards stay honest.
**Propagation**: method decision → folds into ISS-0106.

## Non-goals

- Not a fixed universal checklist — the matrix *shape* is fixed, the per-stack tools are not.
- Not micro-optimization — perf gates fail on **regression against a budget**, nothing more.
- Does not remove human judgment — it **routes** it by risk (reviewer/human on high, cheap gates on low).
