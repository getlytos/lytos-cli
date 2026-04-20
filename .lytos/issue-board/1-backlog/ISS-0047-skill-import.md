---
id: ISS-0047
title: "lyt skill: import agentskills.io skills into a Lytos project"
type: feature
priority: P2-normal
effort: L
complexity: heavy
skill: ""
skills_aux: [api-design, security, documentation]
scope: lytos-cli
status: 1-backlog
branch: "feat/ISS-0047-skill-import"
depends: [ISS-0046]
created: 2026-04-20
---

# ISS-0047 — `lyt skill`: import agentskills.io skills into a Lytos project

## Context

Now that Lytos speaks the [agentskills.io](https://agentskills.io) format (ISS-0046), it can consume skills authored by the wider ecosystem — Anthropic's official example skills, third-party skill libraries, a team's private skills repo, or another Lytos project. The job of this issue is to turn Lytos into a skill **manager** for the project, comparable to what `npm` does for packages — but built around the specifics of markdown-and-git, not a package registry.

The value proposition is simple: a Lytos user should be able to add a high-quality skill authored by someone else in a single command, without writing it from scratch, and without shell-trickery around `git clone` or file copying.

### Why UX matters more than engineering here

Import of third-party content is where tooling either earns trust or loses it. Three things determine whether users adopt the command or go back to `git clone + cp -r`:

1. **Zero-friction discovery** — "what skills are available?" must be answerable without leaving the terminal.
2. **Single-argument install** — `lyt skill add testing` should Just Work for well-known skills, without the user having to remember URLs.
3. **Visible safety** — skills can ship executable code in `scripts/`. The user must be able to see what they're installing before anything runs.

These are the lodestars for the design below.

## Proposed solution

### New command surface

```
lyt skill add [source]      # install a skill
lyt skill list              # show installed skills, with source and version
lyt skill info <name>       # show details about one installed skill
lyt skill update [name]     # pull latest from source (all, or one)
lyt skill remove <name>     # delete an installed skill
lyt skill search <keyword>  # search the default registry
```

All commands operate on the current project's `.lytos/skills/`.

### The heart of the UX: `lyt skill add`

The command accepts a `source` in several shapes, and runs an interactive picker when called with no argument. Every shape resolves to a single skill folder that gets copied into `.lytos/skills/<name>/`.

#### Supported source shapes

| Shape | Example | Behavior |
|-------|---------|----------|
| **(none)** | `lyt skill add` | Interactive picker listing featured skills from the default registry, with arrow keys + enter to install |
| **Short name** | `lyt skill add pdf-processing` | Look up in the default registry (Anthropic's `anthropics/skills` repo), install if found |
| **Org/repo** | `lyt skill add my-org/my-skills` | Clone the repo; if it contains one skill at the root, install it; if it contains several, present a picker |
| **Org/repo@name** | `lyt skill add my-org/my-skills@pdf-processing` | Install a specific skill from a multi-skill repo |
| **Full git URL** | `lyt skill add https://github.com/user/skill.git` | Install from an arbitrary git URL |
| **Local path** | `lyt skill add ./path/to/skill` | Install from a local folder (useful for testing) |

All shapes resolve at fetch time via `git clone --depth=1` into a temp dir, then copy the matching folder. The source + commit SHA are recorded for provenance (see below).

#### The interactive picker (zero-argument form)

```
$ lyt skill add

Featured skills from agentskills.io:

  ▸ pdf-processing       Extract text, fill forms, merge files. Use when handling PDFs.
    code-review          Structured code review — what to check and in what order.
    data-analysis        Analyze CSVs and datasets with pandas.
    ...

  (↑↓ navigate · enter install · s search · q quit)
```

Pressing enter on a skill shows a confirmation card:

```
Install "pdf-processing"?

Source       : github.com/anthropics/skills/pdf-processing
Commit       : 8f3c9a1 (2026-04-12)
Description  : Extract PDF text, fill forms, merge files. Use when handling PDFs.
Files        : SKILL.md (4.2 KB), scripts/extract.py, scripts/fill_form.py
Scripts      : ⚠ 2 executable scripts — see below before approving

  [SKILL.md preview]
  ...first 20 lines...

  [scripts/extract.py] 142 lines, Python
  [scripts/fill_form.py] 88 lines, Python

(y to install · s to view a script · n to cancel)
```

This is the key UX moment. The user sees exactly what they are adding, the SHA is pinned, and the presence of executable code is flagged with a visible warning. No surprises.

#### Safety: executable scripts

Skills may include a `scripts/` folder with code the agent can run. Lytos installs them to disk but **does not trust them by default**. The rules:

1. On install, a `.lytos.yml` in the skill folder records `trusted: false` if `scripts/` is present.
2. The agent (via tool config) is instructed not to execute scripts from untrusted skills without human approval.
3. `lyt skill info <name>` shows the trust state and lists the scripts.
4. `lyt skill trust <name>` flips the flag after the user has reviewed.
5. `--trust` flag on `lyt skill add` skips this for known-good sources (e.g. when scripting the install).

This mirrors npm's trust model for install scripts and is the minimum viable provenance story.

### Provenance tracking

Each installed skill gains a small `.lytos.yml` sidecar file next to its `SKILL.md`:

```yaml
# .lytos/skills/pdf-processing/.lytos.yml
source:
  type: github
  repo: anthropics/skills
  path: pdf-processing
  commit: 8f3c9a1
  installed_at: 2026-04-22
trusted: false    # flipped to true by `lyt skill trust`
```

This file is:
- Never read by AI tools (not a SKILL.md sidecar they care about)
- The single source of truth for `lyt skill update` and `lyt skill info`
- Committed to the project's git — teammates see the provenance

If the user edits the skill locally after install, `lyt skill update` detects drift (file diff vs. upstream) and asks before overwriting.

### The default registry

For v1, the default registry is Anthropic's [anthropics/skills](https://github.com/anthropics/skills) repo. The CLI fetches the list of top-level folders + their `SKILL.md` descriptions and caches it locally (TTL 24 h).

Later (out of scope here) we may add:
- A curated Lytos community skills repo
- Support for multiple registries in `.lytos/config.yml`

### `lyt skill list`

```
$ lyt skill list

.lytos/skills/ (3 installed)

  session-start          (built-in protocol)
  testing                (built-in, agentskills.io format)
  pdf-processing         github.com/anthropics/skills@8f3c9a1 · not trusted

```

Built-in skills are shown plainly. Imported skills show source + SHA + trust state.

### `lyt skill update`

```
$ lyt skill update pdf-processing

Checking github.com/anthropics/skills/pdf-processing...
New commit available: 8f3c9a1 → b2d41c7

Changes:
  SKILL.md              +14 -3 lines
  scripts/extract.py    +28 -12 lines (new dependency on pdfplumber≥0.11)

(y to update · d to diff · n to skip)
```

Updates are explicit and diff-visible. Nothing happens silently.

## Definition of done

- [ ] `lyt skill add <source>` installs from all six source shapes (none / name / org/repo / org/repo@name / git URL / local path)
- [ ] Zero-argument `lyt skill add` shows an interactive picker of featured skills from the default registry
- [ ] Install confirmation shows source, commit, description, file list, script warning if applicable — before copying
- [ ] `.lytos.yml` sidecar written per skill with source + commit + trust state
- [ ] `lyt skill list` / `info` / `update` / `remove` / `search` / `trust` work
- [ ] `skills-ref validate` is run on every imported skill before it lands; failures block the install
- [ ] Name conflicts are detected and the user is asked (overwrite / rename via `--as` / cancel)
- [ ] Built-in skills (session-start + the 8 task skills) are never listed as installable (they're already in `method/skills/` and shipped by `lyt init`)
- [ ] `--dry-run` available on `add`, `update`, `remove`
- [ ] `--trust` flag on `add` for scripted installs; interactive flow otherwise gates trust
- [ ] Full test coverage: unit tests for source parsing, integration tests for the full install flow (with a local fixture as the "registry")
- [ ] Documentation: README section, `/method/skills` page on the website, long-tail SEO sub-page on skill import
- [ ] `lyt --help` and `lyt skill --help` show the new command tree clearly

## Implementation sketch

### Phasing

This is a large issue. Recommend splitting the implementation into three reviewable PRs, but keep them under the single ISS-0047 umbrella:

- **Phase A — mechanics** (`lyt skill add <source>`, `lyt skill list`, `lyt skill remove`): supports only the explicit source shapes (not the interactive picker or the registry). Lands the sidecar, validation, conflict handling, provenance. The keystone that everything else rides on.
- **Phase B — registry and search** (`lyt skill search`, `lyt skill add <short-name>`): introduces the default registry cache, resolves short names, enables `lyt skill add` without an org/repo prefix.
- **Phase C — interactive picker + update** (`lyt skill add` with no args, `lyt skill update`): adds the TUI picker and the diff-visible update flow.

Each phase is shippable on its own; the CLI is more useful at each step without requiring the next.

### Files and modules

- `src/commands/skill.ts` — top-level `skill` subcommand dispatcher
- `src/commands/skill/add.ts`, `list.ts`, `info.ts`, `update.ts`, `remove.ts`, `search.ts`, `trust.ts`
- `src/lib/skill-source.ts` — parse and resolve the six source shapes into `{ repo, path, commit }`
- `src/lib/skill-registry.ts` — fetch and cache the default registry index
- `src/lib/skill-install.ts` — copy + validate + write sidecar + conflict check
- `src/lib/skill-tui.ts` — interactive picker (reuse the existing `src/components/` TUI primitives if present)
- `src/lib/skill-sidecar.ts` — read/write `.lytos.yml` provenance sidecars
- `tests/commands/skill-*.test.ts` — one test file per subcommand
- `tests/fixtures/skill-registry/` — a local fake registry for integration tests

### Dependencies

- `simple-git` or equivalent for the clone/fetch steps (already commonly-pulled Node lib; worth checking if any existing transitive dep provides this)
- A small TUI helper — the existing CLI already uses terminal-first output; reuse the same primitives for the picker to avoid pulling a heavy TUI dep

### Out of scope

- Private/authenticated registries — public git only for v1
- Skill publishing (`lyt skill publish`) — consumption only
- Multiple concurrent registries — one default registry, power users can use full URLs
- A dedicated Lytos community skills repo — handled as a follow-up once patterns emerge

## Relevant files

- `src/commands/` — new `skill.ts` + subcommand files
- `src/lib/` — `skill-source.ts`, `skill-registry.ts`, `skill-install.ts`, `skill-sidecar.ts`, `skill-tui.ts`
- `.lytos/skills/<name>/.lytos.yml` — per-skill provenance sidecar (new convention)
- `README.md` — new `lyt skill` section
- `method/LYTOS.md`, `.lytos/LYTOS.md` — describe the import model
- Website: new long-tail SEO page `/method/skills/installing-third-party-skills`

## Notes

- The `.lytos.yml` sidecar name is chosen to be distinctive and unlikely to clash with any existing tool's metadata. Alternative candidates considered: `lytos.json`, `.provenance.yml`, `meta.yml`. Keeping the Lytos prefix makes it grep-able across any skill repo.
- Registry index: Anthropic's `anthropics/skills` repo does not (yet) publish a machine-readable index file. The v1 implementation walks the top-level folder list via the GitHub API and parses each `SKILL.md`'s frontmatter. If a `.agentskills-index.json` convention emerges on agentskills.io, adopt it.
- Security: **we do not execute scripts at install time**. Skills only describe procedures; when the agent later decides to run a script, it's the tool's responsibility to ask the user. Lytos only stores the scripts on disk and flags untrusted ones.
- Naming: the command is `lyt skill` (singular), mirroring `git branch`, not `lyt skills`. Each invocation acts on one skill.
- The interactive picker should gracefully degrade: if stdout is not a TTY, the zero-argument form prints a list and exits 2 with "pass a source or run in a TTY".
