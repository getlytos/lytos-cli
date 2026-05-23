# ADR-0001 — Frontmatter schema v2

Date: 2026-05-23

Status: Accepted

---

## Context

The current issue frontmatter (`id`, `title`, `type`, `priority`, `effort`, `complexity`, `domain`, `skill`, `skills_aux`, `status`, `branch`, `depends`, `created`, `updated`) was scoped for a hand-written MVP workflow. It is now blocking the next set of features because **Lytos's core differentiation is durable auditability of every AI-assisted action**, and the current schema cannot answer the questions that matter two years later:

- Which AI model produced this code?
- Which session, which prompts, which cost?
- Which AI reviewed it, with which verdict?
- Who validated it? Who reviewed it on the human side?
- What tests / build / lint state did it land in?
- What is the actual blast radius (risk) vs the cognitive load (complexity)?

These questions are the line between Lytos and vibecoding. Vibecoding optimizes for *speed of generation*; Lytos optimizes for *durability of decision*. If the frontmatter cannot hold the trace, the differentiation collapses.

---

## Decision

We extend the frontmatter to **schema v2**, organized in five categories. Every new field is **optional and additive**; a v1 issue continues to parse correctly without modification.

A new top-level field `schema_version: 2` is added to issues written by tooling that knows about v2. Its absence implies v1.

### 1. Human accountability

```yaml
assignee: "@fredericgalline"        # the human implementer (Git host handle)
reviewer: "@some-other-handle"      # the human reviewer (Git host handle, can equal assignee)
```

### 2. AI traceability

```yaml
ai_implementer:
  model: "claude-opus-4-7"          # exact model id at the time of work
  session: "abc123-…-xyz"           # session / conversation id when available
  prompt_ref: "skills/code-structure/SKILL.md"  # the primary skill or prompt used
ai_reviewer:
  model: "gpt-5"                    # different model strongly recommended (cross-review)
  session: "rev-456-…"
  prompt_ref: "skills/code-review/SKILL.md"
```

### 3. Lifecycle (auto-populated by tooling)

```yaml
started_at: 2026-05-23              # set by `lyt start` when moving to 3-in-progress
review_at: 2026-05-24               # set by tooling moving to 4-review
completed_at: 2026-05-25            # set by `lyt close`
```

### 4. Audit & cost (auto-populated by tooling)

```yaml
tokens_in: 124500                   # cumulated input tokens across implementer + reviewer
tokens_out: 32100                   # cumulated output tokens
cost_usd: 1.84                      # cumulated cost in USD
skills_used: ["code-structure", "testing", "git-workflow"]
                                    # runtime trace (≠ declared skill/skills_aux)
validation:
  tests: pass | fail | skip
  build: pass | fail | skip
  lint:  pass | fail | skip
```

### 5. Decision & risk

```yaml
review: go | no-go | pending | none # review verdict (separate from status)
risk: low | medium | high           # blast radius (≠ complexity which is cognitive)
confidence: 0-100                   # self-reported by the AI implementer (audit signal)
```

### 6. Git artifacts (auto-populated by tooling)

```yaml
pr_url: "https://github.com/org/repo/pull/123"
commits: ["abc123", "def456"]       # SHAs on the issue branch
```

### 7. Cross-surface UX hint (already in use on lytos-app)

```yaml
surface: app | cli | both           # which Lytos surface a UI-touching issue targets
```

---

## Backward compatibility

This is non-negotiable. Lytos must keep parsing every v1 issue ever written.

- Every new field is optional.
- Unknown fields in older versions of the CLI are ignored, not rejected.
- Absent fields default to behavior equivalent to v1 (e.g. `review` absent ⇔ `none`).
- `schema_version` itself is optional; absence ⇔ v1.

`lyt doctor` should report v1 issues as a soft warning, not an error, with the suggestion to run `lyt migrate-frontmatter` when introduced.

---

## Auto-population strategy

Most v2 fields **must not be hand-written**. The Lytos value proposition is that the trace appears automatically as a side-effect of using the tooling. Manual entry kills adoption.

| Field | Written by |
|---|---|
| `assignee` | `lyt start` (default: Git config user) |
| `reviewer` | `lyt review` (set when review is requested or recorded) |
| `ai_implementer` | The AI wrapper at the moment of work (Cursor plugin, Claude Code hook, ...) — see [[ISS-0075]] for the integration layer |
| `ai_reviewer` | `lyt review` when the audit is performed |
| `started_at` | `lyt start` |
| `review_at` | `lyt review` |
| `completed_at` | `lyt close` |
| `tokens_in/out`, `cost_usd` | The AI wrapper, accumulated across sessions |
| `skills_used` | The AI wrapper at runtime |
| `validation` | `lyt validate` (or a hook reading test output) |
| `review` | `lyt review --verdict go|no-go|pending` |
| `risk`, `confidence` | The AI implementer (self-reported, auditable signal) |
| `pr_url` | `lyt pr` or the CI/git host webhook |
| `commits` | Auto-computed from `git log <branch>` at close time |

The few fields a human still writes by hand (or via the skeleton template) are: `id`, `title`, `type`, `priority`, `effort`, `complexity`, `domain`, `depends`, optional `skill`, `surface`, `risk`. Everything else is observed, not declared.

---

## Migration path

Phase 1 — Schema spec (this ADR + template + validator changes)
Phase 2 — Read support in `lyt board`, `lyt doctor`, `lyt review` (gracefully handle v2 fields when present)
Phase 3 — Write support in `lyt start`, `lyt close`, `lyt review` (start writing lifecycle + audit fields)
Phase 4 — AI wrapper integration (`ai_implementer`, `ai_reviewer`, tokens, cost) — separate issue per integration target
Phase 5 — `lyt migrate-frontmatter` to backfill v2 fields on existing repos where possible

Each phase ships independently. The product remains usable at every step.

---

## Non-goals

- **Not a Jira clone**: do not add comments, threads, watchers, attachments. Git PRs handle discussion. Issues hold decisions, not chatter.
- **Not a billing system**: `cost_usd` is for self-awareness and future plan gating, not for invoicing.
- **Not a permission system**: there is no `visibility`, `private`, or `restricted` field. The repo's Git permissions ARE the permission model.
- **Not a generic schema**: every field listed here exists to answer a *specific durable question*. Adding "nice-to-have" fields is the path to bloat. Each future addition must justify itself against the auditability test ("does this answer a 2-year question?").

---

## Consequences

- The Lytos App side (`lytos-app` repo) gains a contract it can rely on. Its `LytosIssue` type extends with optional v2 fields and the UI surfaces them progressively (see lytos-app ISS-0018 for the first brick — `review` → dot vert/rouge).
- AI wrappers (Claude Code, Cursor, Codex) need a documented hook to write `ai_implementer`, tokens, cost. This is its own issue, not part of v2 spec.
- The validator must learn the value domains for each enum field (`review`, `risk`, `validation.*`).
- The template gains a comment block explaining what is hand-written vs auto-populated, to set the right expectation for new users.
- This ADR is the single source of truth for the schema. Future schema changes append here or supersede via ADR-XXXX.

---

## Status long terme

Cette ADR est durable. Toute évolution du schéma (v3, v4, ...) repasse par un ADR explicite. Le frontmatter est le **journal de bord auditable** du projet — pas un formulaire qui dérive au gré des envies.
