/**
 * Four writers cut a card's body with a regex that stopped at the first `---`
 * followed by a line end, wherever it was (ISS-0175, F1): a frontmatter line that
 * ENDS in `---` (a reason, a title, a note) was taken for the closing delimiter,
 * the rest of the frontmatter leaked into the body, and every later write added
 * another copy. They all go through `bodyOf` now. One regression test per writer.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { join, resolve } from "path";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { execSync, spawnSync } from "child_process";
import { createEmptyFixture, type Fixture } from "../helpers/fixtures.js";
import { bodyOf, parseFrontmatter } from "../../src/lib/frontmatter.js";
import { locateIssue, moveIssue } from "../../src/lib/issue-ops.js";
import { applyVerdict, recordAiReviewer } from "../../src/lib/review.js";

const CLI = resolve(__dirname, "../../dist/cli.js");

// Several tests start a handful of processes; a loaded machine must not turn that into a failure.
vi.setConfig({ testTimeout: 30_000 });

let fixture: Fixture;

afterEach(() => {
  if (fixture) fixture.cleanup();
});

/** A card whose frontmatter has lines that END in `---`, as a hand or a tool may write them. */
const CARD = [
  "---",
  "id: ISS-0011",
  "title: A leaf ---",
  "type: feat",
  "priority: P2-normal",
  "effort: S",
  "status: 4-review",
  "depends: []",
  "created: 2026-11-20",
  "schema_version: 2",
  "risk: low",
  "note: see below ---",
  "discovery_override:",
  "  reason: agreed ---",
  "  date: 2026-11-20",
  "  epic: ISS-0010",
  "  by: Someone",
  "---",
  "",
  "# ISS-0011",
  "",
  "Body text.",
  "",
  "---",
  "",
  "A rule in the body, kept.",
  "",
].join("\n");

const BODY = "# ISS-0011\n\nBody text.\n\n---\n\nA rule in the body, kept.\n";

function project(dir = "4-review"): { lytos: string; path: string; board: string } {
  fixture = createEmptyFixture();
  const board = join(fixture.cwd, ".lytos", "issue-board");
  for (const d of ["0-icebox", "1-backlog", "2-sprint", "3-in-progress", "4-review", "5-done"]) {
    mkdirSync(join(board, d), { recursive: true });
  }
  const path = join(board, dir, "ISS-0011-leaf.md");
  writeFileSync(path, CARD.replace("status: 4-review", `status: ${dir}`));
  return { lytos: join(fixture.cwd, ".lytos"), path, board };
}

/** What a writer must never do: lose a field, duplicate a line, or touch the body. */
function expectWhole(path: string, changed: string[] = []): void {
  const text = readFileSync(path, "utf-8");
  expect(text.match(/^---$/gm), "delimiters (open, close, one rule in the body)").toHaveLength(3);
  expect((text.match(/^  by: Someone$/gm) ?? []).length, "the record is written once").toBe(1);
  expect(bodyOf(text)).toBe(BODY);
  const fm = parseFrontmatter(text)!;
  const original = parseFrontmatter(CARD)!;
  for (const key of Object.keys(original)) {
    if (changed.includes(key)) continue;
    expect(fm[key], key).toEqual(original[key]);
  }
}

describe("moveIssue (lyt move, lyt start, lyt close, lyt park)", () => {
  it("keeps a card whose frontmatter has lines ending in --- whole, however often it is written", () => {
    const { lytos, path } = project("1-backlog");
    let issue = locateIssue(lytos, "ISS-0011")!;
    for (const target of ["2-sprint", "4-review", "2-sprint", "1-backlog"]) {
      moveIssue(lytos, issue, target, { updated: "2026-11-21" });
      issue = locateIssue(lytos, "ISS-0011")!;
      expectWhole(issue.filePath, ["status", "updated"]);
    }
    expect(existsSync(path)).toBe(true);
  });
});

describe("applyVerdict (lyt review --verdict)", () => {
  it("keeps the card whole when it writes a verdict, twice", () => {
    const { path, board } = project();
    for (const verdict of ["pending", "go"] as const) {
      applyVerdict({ boardDir: board, issueFilePath: path, verdict, reviewer: "alice" });
      expectWhole(path, ["review", "review_at", "reviewer", "updated", "review_independence"]);
    }
  });

  it("keeps the card whole when a no-go moves it", () => {
    const { path, board } = project();
    const r = applyVerdict({ boardDir: board, issueFilePath: path, verdict: "no-go", reviewer: "alice" });
    expectWhole(r.newPath, ["status", "review", "review_at", "reviewer", "updated"]);
  });
});

describe("recordAiReviewer (lyt review --accept --ai-model)", () => {
  it("keeps the card whole when it records the AI reviewer, twice", () => {
    const { path } = project();
    expect(recordAiReviewer(path, { model: "model-a", session: "s1" })).toBe(true);
    expectWhole(path, ["ai_reviewer", "updated"]);
    expect(recordAiReviewer(path, { model: "model-b" })).toBe(true);
    expectWhole(path, ["ai_reviewer", "updated"]);
  });
});

describe("lyt claim", () => {
  it("keeps the card whole when it claims it, and when it releases it", () => {
    const { path } = project("2-sprint");
    const cwd = fixture.cwd;
    execSync("git init -q -b main && git config user.email t@t.io && git config user.name Tester && git add -A && git commit -qm i --no-gpg-sign", { cwd, stdio: "pipe" });
    const run = (...args: string[]) => spawnSync("node", [CLI, ...args], { cwd, encoding: "utf-8" });
    expect(run("claim", "ISS-0011").status).toBe(0);
    const claimed = join(cwd, ".lytos/issue-board/3-in-progress/ISS-0011-leaf.md");
    expectWhole(claimed, ["status", "assignee", "updated"]);
    expect(run("unclaim", "ISS-0011").status).toBe(0);
    expectWhole(join(cwd, ".lytos/issue-board/2-sprint/ISS-0011-leaf.md"), ["status", "assignee", "updated"]);
    expect(existsSync(path)).toBe(true);
  });
});

describe("lyt show", () => {
  it("shows the body of such a card, not the tail of its frontmatter", () => {
    const { path } = project("2-sprint");
    expect(path).toBeTruthy();
    const r = spawnSync("node", [CLI, "show", "ISS-0011", "--json"], { cwd: fixture.cwd, encoding: "utf-8" });
    const detail = JSON.parse(r.stdout) as { body: string };
    expect(detail.body).toBe("Body text.\n\n---\n\nA rule in the body, kept.");
    expect(detail.body).not.toContain("by: Someone");
  });
});
