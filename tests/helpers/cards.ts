/**
 * Test helpers — write cards and milestones into a temporary project.
 *
 * Used by the intent-layer tests (ISS-0163, ISS-0164, ISS-0165): they need
 * epics, leaves and milestones with exactly the frontmatter under test, and
 * nothing else.
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { join } from "path";
import { createEmptyFixture, type Fixture } from "./fixtures.js";

const STAGES = [
  "0-icebox",
  "1-backlog",
  "2-sprint",
  "3-in-progress",
  "4-review",
  "5-done",
  "parked",
];

export interface CardOptions {
  /** Folder under `issue-board/` (default `1-backlog`). */
  dir?: string;
  title?: string;
  /** Card type (default `feat`). */
  type?: string;
  /** Frontmatter `status` (default: the folder name). */
  status?: string;
  /** Extra frontmatter lines, written verbatim as `key: value`. */
  fields?: Record<string, string>;
  /** Everything after the frontmatter (default: a one-line heading). */
  body?: string;
}

/** An empty project: the board folders, nothing else. */
export function createIntentFixture(): Fixture {
  const fixture = createEmptyFixture();
  for (const stage of STAGES) {
    mkdirSync(join(fixture.cwd, ".lytos", "issue-board", stage), {
      recursive: true,
    });
  }
  return fixture;
}

/** Write one card; returns its path. The frontmatter `status` mirrors the folder. */
export function writeCard(
  cwd: string,
  id: string,
  options: CardOptions = {}
): string {
  const dir = options.dir ?? "1-backlog";
  const lines = [
    "---",
    `id: ${id}`,
    `title: "${options.title ?? `${id} title`}"`,
    `type: ${options.type ?? "feat"}`,
    "priority: P2-normal",
    "effort: S",
    `status: ${options.status ?? dir}`,
    "depends: []",
    "created: 2026-11-20",
    "schema_version: 2",
    "risk: low",
  ];
  for (const [key, value] of Object.entries(options.fields ?? {})) {
    lines.push(`${key}: ${value}`);
  }
  lines.push("---", "", options.body ?? `# ${id}`, "");

  const folder = join(cwd, ".lytos", "issue-board", dir);
  mkdirSync(folder, { recursive: true });
  const path = join(folder, `${id}-card.md`);
  writeFileSync(path, lines.join("\n"));
  return path;
}

/** Move a card between folders the way `lyt move` does: the file and its `status`. */
export function moveCard(cwd: string, id: string, from: string, to: string): void {
  const board = join(cwd, ".lytos", "issue-board");
  const source = join(board, from, `${id}-card.md`);
  const target = join(board, to, `${id}-card.md`);
  mkdirSync(join(board, to), { recursive: true });
  renameSync(source, target);
  writeFileSync(
    target,
    readFileSync(target, "utf-8").replace(`status: ${from}`, `status: ${to}`)
  );
}

export interface MilestoneOptions {
  title?: string;
  /** `open` (default) or `closed`. */
  status?: string;
  /** Exit criteria, written as `- [ ]` / `- [x]` items; `true` means ticked. */
  criteria?: Array<[string, boolean]>;
  /** Raw file content, written as is (to test a malformed milestone). */
  raw?: string;
}

/** Write `.lytos/milestones/<id>.md`; returns its path. */
export function writeMilestone(
  cwd: string,
  id: string,
  options: MilestoneOptions = {}
): string {
  const lines = [
    "---",
    `id: ${id}`,
    `title: "${options.title ?? `${id} milestone`}"`,
    `status: ${options.status ?? "open"}`,
    "---",
    "",
    `# ${id}`,
    "",
  ];
  if (options.criteria) {
    lines.push("## Exit criteria", "");
    for (const [text, done] of options.criteria) {
      lines.push(`- [${done ? "x" : " "}] ${text}`);
    }
    lines.push("");
  }

  const folder = join(cwd, ".lytos", "milestones");
  mkdirSync(folder, { recursive: true });
  const path = join(folder, `${id}.md`);
  writeFileSync(path, options.raw ?? lines.join("\n"));
  return path;
}
