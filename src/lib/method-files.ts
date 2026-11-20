/**
 * Method files that `lyt init` ships and `lyt upgrade` can add (ISS-0155).
 *
 * The quality library — the rubrics a reviewer reads and the checklists a
 * person works through — is what the kit's `rubric:<name>` and
 * `checklist:<name>` pointers resolve to. It lives under `method/quality/` and
 * is copied into the project's `.lytos/quality/`.
 *
 * It is a LIST, not a directory walk, on purpose: `dist/method/` is a build
 * artifact and a stray file in it must not become a shipped file. A test pins
 * this list against the folders on disk, so a rubric added without being
 * listed fails the build instead of silently never reaching a project.
 *
 * Zero dependencies.
 */

/** Rubrics: read-only reviews against a written grid (`rubric:<name>`). */
export const RUBRIC_NAMES = [
  "FORMAT",
  "security",
  "architecture",
  "ux",
  "design-fidelity",
  "red-team",
  "over-engineering",
  "tests-negative",
  "cost-review",
] as const;

/** Checklists: what a person works through (`checklist:<name>`). */
export const CHECKLIST_NAMES = [
  "intent",
  "a11y",
  "legal-accounting",
  "real-money",
] as const;

/**
 * Paths, relative to `method/` and to `.lytos/`, of every quality-library file.
 * These belong to the project once copied: `lyt upgrade` adds a missing one and
 * never overwrites one the project has edited.
 */
export const QUALITY_LIBRARY_FILES: readonly string[] = [
  ...RUBRIC_NAMES.map((n) => `quality/rubrics/${n}.md`),
  ...CHECKLIST_NAMES.map((n) => `quality/checklists/${n}.md`),
];

/**
 * The guide to the design exchange entries (ISS-0169). Only a project whose
 * `config.yml` says `design: claude-design` gets it: written by `init`, added by
 * `upgrade`, and add-only like the quality library. A project with any other
 * answer never receives it. Paths are relative to `method/` and to `.lytos/`.
 */
export const DESIGN_EXCHANGES_FILES: readonly string[] = [
  "design/exchanges/README.md",
];

/**
 * Method files `lyt upgrade` may REPLACE (paths relative to `method/` and to
 * `.lytos/`): a missing one is added, a different one is replaced only after a
 * `y` or with `--force`. The kit and the stack contract are deliberately not
 * here — they are linked to the project — and the quality library is add-only.
 */
export const UPGRADEABLE_FILES: readonly string[] = [
  // session-start is a Lytos bootstrap protocol, kept flat
  "skills/session-start.md",
  // Task skills follow agentskills.io format: <name>/SKILL.md
  "skills/code-review/SKILL.md",
  "skills/testing/SKILL.md",
  "skills/documentation/SKILL.md",
  "skills/git-workflow/SKILL.md",
  "skills/code-structure/SKILL.md",
  "skills/deployment/SKILL.md",
  "skills/security/SKILL.md",
  "skills/api-design/SKILL.md",
  "skills/reference-loop/SKILL.md",
  "rules/default-rules.md",
  "rules/README.md",
  "rules/team-and-loop.md",
  "LYTOS.md",
  ".gitignore",
  "templates/sprint.md",
  "issue-board/templates/issue-feature.md",
  "issue-board/templates/issue-task.md",
];
