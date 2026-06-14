/**
 * Frontmatter migration logic — backfill schema v2 fields on existing issues
 * (phase 5 of the schema v2 rollout, ADR-0001).
 *
 * Pure and dependency-free: all git access goes through an injected
 * `GitDateResolver`, so the planning logic is unit-testable without a real
 * repo and without creating commits. The command wires the real git-backed
 * resolver; tests inject a fake one.
 */

import { existsSync, readFileSync, writeFileSync, readdirSync } from "fs";
import { join, relative } from "path";
import { parseFrontmatter, type Frontmatter } from "./frontmatter.js";

export const SCHEMA_VERSION = "2";

const ACTIVE_STATUS_DIRS = [
  "0-icebox",
  "1-backlog",
  "2-sprint",
  "3-in-progress",
  "4-review",
  "5-done",
];

// Folders whose issues have genuinely been started — only these get a
// `started_at` backfill. Backfilling it for a never-started backlog/icebox
// issue would fake a lifecycle event that never happened.
const STARTED_DIRS = new Set(["3-in-progress", "4-review", "5-done"]);

/**
 * Resolves lifecycle dates from version-control history. Both methods take an
 * absolute file path and return a `YYYY-MM-DD` string, or `null` when the
 * history can't answer (not a repo, no commits, squash-merged, etc.).
 */
export interface GitDateResolver {
  /** Date the file first existed (oldest add). Maps to `started_at`. */
  firstAdded(absPath: string): string | null;
  /** Date of the most recent commit touching the file. Maps to `completed_at`. */
  lastTouched(absPath: string): string | null;
}

export interface AddedField {
  field: string;
  value: string;
}

export interface SkippedField {
  field: string;
  reason: string;
}

export interface IssueMigration {
  /** Path relative to the .lytos/ directory, e.g. `issue-board/5-done/ISS-0003-x.md`. */
  file: string;
  id: string;
  added: AddedField[];
  skipped: SkippedField[];
  /** True when at least one field would be written. */
  changed: boolean;
}

export interface MigrationPlan {
  scanned: number;
  toMigrate: number;
  alreadyCurrent: number;
  migrations: IssueMigration[];
}

interface IssueTarget {
  absPath: string;
  relToLytos: string;
  dir: string;
  isDone: boolean;
  isStarted: boolean;
  content: string;
  frontmatter: Frontmatter;
  id: string;
}

function hasValue(v: Frontmatter[string] | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function collectIssueFiles(boardDir: string, includeArchive: boolean): IssueTarget[] {
  const targets: IssueTarget[] = [];
  const lytosDir = join(boardDir, "..");

  const dirs = [...ACTIVE_STATUS_DIRS];
  for (const dir of dirs) {
    pushIssuesFrom(join(boardDir, dir), dir, lytosDir, targets);
  }

  if (includeArchive) {
    const archiveDir = join(boardDir, "archive");
    if (existsSync(archiveDir)) {
      for (const entry of readdirSync(archiveDir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          pushIssuesFrom(
            join(archiveDir, entry.name),
            `archive/${entry.name}`,
            lytosDir,
            targets
          );
        }
      }
    }
  }

  return targets;
}

function pushIssuesFrom(
  dirPath: string,
  dir: string,
  lytosDir: string,
  targets: IssueTarget[]
): void {
  if (!existsSync(dirPath)) return;

  const files = readdirSync(dirPath).filter(
    (f) => f.startsWith("ISS-") && f.endsWith(".md")
  );

  for (const file of files) {
    const absPath = join(dirPath, file);
    const content = readFileSync(absPath, "utf-8");
    const frontmatter = parseFrontmatter(content);
    if (!frontmatter) continue;

    const isArchive = dir.startsWith("archive");
    const id = typeof frontmatter.id === "string" ? frontmatter.id : file.replace(/\.md$/, "");

    targets.push({
      absPath,
      relToLytos: relative(lytosDir, absPath),
      dir,
      isDone: dir === "5-done" || isArchive,
      isStarted: STARTED_DIRS.has(dir) || isArchive,
      content,
      frontmatter,
      id,
    });
  }
}

function computeDelta(target: IssueTarget, resolver: GitDateResolver): IssueMigration {
  const added: AddedField[] = [];
  const skipped: SkippedField[] = [];
  const fm = target.frontmatter;

  if (fm.schema_version !== SCHEMA_VERSION) {
    added.push({ field: "schema_version", value: SCHEMA_VERSION });
  }

  if (target.isStarted && !hasValue(fm.started_at)) {
    const date = resolver.firstAdded(target.absPath);
    if (date) added.push({ field: "started_at", value: date });
    else skipped.push({ field: "started_at", reason: "no git history" });
  }

  if (target.isDone && !hasValue(fm.completed_at)) {
    const date = resolver.lastTouched(target.absPath);
    if (date) added.push({ field: "completed_at", value: date });
    else skipped.push({ field: "completed_at", reason: "no git history" });
  }

  return {
    file: target.relToLytos,
    id: target.id,
    added,
    skipped,
    changed: added.length > 0,
  };
}

/**
 * Compute, without touching any file, what each issue's frontmatter would gain.
 * Existing values are never overwritten. Idempotent: a fully-migrated repo
 * yields a plan with `toMigrate === 0`.
 */
export function planMigration(
  lytosDir: string,
  opts: { includeArchive?: boolean },
  resolver: GitDateResolver
): MigrationPlan {
  const boardDir = join(lytosDir, "issue-board");
  const migrations: IssueMigration[] = [];

  if (existsSync(boardDir)) {
    for (const target of collectIssueFiles(boardDir, opts.includeArchive ?? false)) {
      migrations.push(computeDelta(target, resolver));
    }
  }

  const toMigrate = migrations.filter((m) => m.changed).length;
  return {
    scanned: migrations.length,
    toMigrate,
    alreadyCurrent: migrations.length - toMigrate,
    migrations,
  };
}

/**
 * Apply a plan to disk. Inserts only the resolved fields textually, just before
 * the closing `---`, leaving every existing line (quoting, key order, blank
 * lines, body) byte-for-byte untouched — a migration tool should produce the
 * smallest possible diff. Never re-runs git, never overwrites existing values.
 * Returns the number of files written.
 */
export function applyMigration(lytosDir: string, plan: MigrationPlan): number {
  let written = 0;

  for (const migration of plan.migrations) {
    if (!migration.changed) continue;

    const absPath = join(lytosDir, migration.file);
    const content = readFileSync(absPath, "utf-8");
    const updated = insertFields(content, migration.added);
    if (updated === null) continue;

    writeFileSync(absPath, updated);
    written++;
  }

  return written;
}

/**
 * Insert `key: value` lines just before the frontmatter's closing fence.
 * Returns null when the content has no parseable frontmatter block or when
 * every field is already present (idempotency guard).
 */
function insertFields(content: string, added: AddedField[]): string | null {
  const match = content.match(/^(---\r?\n[\s\S]*?\r?\n)(---\r?\n?)([\s\S]*)$/);
  if (!match) return null;

  const [, head, fence, body] = match;
  const lines = added
    .filter((a) => !new RegExp(`^${a.field}:`, "m").test(head))
    .map((a) => `${a.field}: ${a.value}`);

  if (lines.length === 0) return null;

  return head + lines.join("\n") + "\n" + fence + body;
}
