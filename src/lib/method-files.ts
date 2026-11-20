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
