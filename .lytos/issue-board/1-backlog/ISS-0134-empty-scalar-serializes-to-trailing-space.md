---
id: ISS-0134
title: "An empty scalar serializes to a trailing space — and can swallow the next nested block"
type: fix
priority: P1-high
effort: XS
complexity: light
domain: [lib, frontmatter]
skill: code-structure
skills_aux: [testing]
status: 1-backlog
branch: "fix/ISS-0134-quote-empty-scalars"
depends: []
created: 2026-08-14
updated: 2026-08-14
schema_version: 2
risk: medium
---

# ISS-0134 — An empty scalar serializes to a trailing space

## Context

Reported from the `monmat` project on 2026-08-14, found by a **cross-model audit** — not by `lyt lint`,
which does not check for trailing whitespace.

A fiche written by hand with `skill: ""` comes back from any write-path command as `skill: ` followed by
a space. Corrected by hand, the space returns on the next command. Observed three times, on three
different commands:

| Command | Space reintroduced |
|---|---|
| `lyt move ISS-0011 4-review` | yes |
| `lyt move ISS-0011 3-in-progress` → `4-review` | yes |
| `lyt close ISS-0011` | yes |

So this is not a single command's bug: it is in the shared serializer, and it touches every issue in
every Lytos project at every stage transition.

### Root cause

`src/lib/frontmatter.ts`:

```ts
function quoteIfNeeded(value: string): string {
  const needsQuotes = value.includes(":") || value.includes("#");
  return needsQuotes ? `"${value}"` : value;
}
```

For `value === ""`, neither test matches, so the function returns the empty string. Line 104 then
composes:

```ts
lines.push(`${key}: ${quoteIfNeeded(value)}`);
```

which yields `"skill: "` — key, colon, space, nothing. The same applies to nested sub-values at line 101.

### The part that is not cosmetic

`parseFrontmatter` treats an empty scalar as the opening of a nested object (line 56):

```ts
// Empty value followed by indented lines → nested object (schema v2).
if (rawValue === "" && i + 1 < lines.length && /^\s/.test(lines[i + 1])) {
```

`rawValue` is `line.slice(colonIndex + 1).trim()`, so `skill: ` and `skill:` both produce `""`.

**Therefore an empty scalar immediately followed by an indented block silently absorbs that block's
sub-keys.** Schema v2 has exactly such blocks — `ai_implementer`, `ai_reviewer`, `validation`. Today the
field order happens to keep them apart; nothing enforces it, and the failure would be silent.

Quoting the empty value fixes this too: `rawValue` becomes `"\"\""`, which is not `""`, so the scalar
branch is taken.

## Proposed solution

One condition:

```ts
function quoteIfNeeded(value: string): string {
  const needsQuotes = value === "" || value.includes(":") || value.includes("#");
  return needsQuotes ? `"${value}"` : value;
}
```

Quoting is preferable to trimming the emitted line: it preserves the distinction between *absent* and
*empty string*, which is precisely what the nested-object heuristic depends on. Trimming would fix the
whitespace and leave the misparse in place.

Round-trip is already safe on the read side — `stripQuotes` on `""` returns `""`, the same value the
bare form parses to today. No fiche changes meaning.

## Definition of done

- [ ] `quoteIfNeeded` quotes the empty string
- [ ] Test: serializing `{ skill: "" }` emits `skill: ""` and no line ends with whitespace
- [ ] Test: `parse(serialize(x))` equals `x` for a frontmatter holding an empty scalar **immediately
      followed by** a nested v2 block — the misparse is what this test exists for, and it must be seen
      failing before it is seen passing
- [ ] Test: nested sub-values (line 101) get the same treatment
- [ ] `lyt lint` gains a trailing-whitespace check on fiches, or the omission is recorded as deliberate —
      a cross-model audit found what the linter could not, which is the right outcome, but the linter
      should not stay blind to it by accident

## Notes

Existing fiches across projects carry the defect; it disappears from each one on its next write. No
migration is needed, and `migrate-frontmatter` does not need to be involved.
