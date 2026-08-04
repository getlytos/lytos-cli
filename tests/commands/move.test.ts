/**
 * Integration tests for `lyt move` — the generic atomic transition.
 *
 * Covers free transitions between stages without a dedicated verb,
 * the documented refusals (3-in-progress → lyt start, 5-done → lyt close),
 * and the --json output.
 */

import { describe, it, expect, afterEach } from "vitest";
import { resolve, join } from "path";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import { execSync } from "child_process";
import { createEmptyFixture, type Fixture } from "../helpers/fixtures.js";

const CLI = resolve(__dirname, "../../dist/cli.js");

function run(args: string, cwd: string): { stdout: string; stderr: string; exitCode: number } {
  const { spawnSync } = require("child_process");
  const result = spawnSync("node", [CLI, ...args.split(" ")], {
    cwd,
    encoding: "utf-8",
  });
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    exitCode: result.status ?? 0,
  };
}

function createMoveFixture(cwd: string): void {
  const lyt = (p: string) => resolve(cwd, ".lytos", p);

  for (const dir of [
    "issue-board/0-icebox", "issue-board/1-backlog",
    "issue-board/2-sprint", "issue-board/3-in-progress",
    "issue-board/4-review", "issue-board/5-done",
  ]) {
    mkdirSync(lyt(dir), { recursive: true });
  }

  const issue = (id: string, status: string, title: string) => `---
id: ${id}
title: "${title}"
type: feat
priority: P2-normal
effort: S
status: ${status}
depends: []
created: 2026-08-01
updated: 2026-08-01
---

# ${id} — ${title}
`;

  writeFileSync(
    lyt("issue-board/1-backlog/ISS-0001-in-backlog.md"),
    issue("ISS-0001", "1-backlog", "In backlog")
  );
  writeFileSync(
    lyt("issue-board/3-in-progress/ISS-0002-in-progress.md"),
    issue("ISS-0002", "3-in-progress", "In progress")
  );
  writeFileSync(
    lyt("issue-board/2-sprint/ISS-0003-in-sprint.md"),
    issue("ISS-0003", "2-sprint", "In sprint")
  );

  // Git repo — no origin, so the origin check is silently skipped.
  execSync("git init -b main", { cwd, stdio: "pipe" });
  execSync("git config user.email 'test@test.com'", { cwd, stdio: "pipe" });
  execSync("git config user.name 'Test'", { cwd, stdio: "pipe" });
  execSync("git add -A && git commit -m 'init' --no-gpg-sign", { cwd, stdio: "pipe" });
}

let fixture: Fixture;

afterEach(() => {
  if (fixture) fixture.cleanup();
});

describe("lyt move", () => {
  it("exits 2 when no .lytos/ exists", () => {
    fixture = createEmptyFixture();
    const result = run("move ISS-0001 4-review", fixture.cwd);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("No .lytos/");
  });

  it("moves an in-progress issue to 4-review and regenerates the board", () => {
    fixture = createEmptyFixture();
    createMoveFixture(fixture.cwd);

    const result = run("move ISS-0002 4-review", fixture.cwd);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("ISS-0002");
    expect(result.stderr).toContain("moved");

    // File moved
    expect(existsSync(join(fixture.cwd, ".lytos/issue-board/4-review/ISS-0002-in-progress.md"))).toBe(true);
    expect(existsSync(join(fixture.cwd, ".lytos/issue-board/3-in-progress/ISS-0002-in-progress.md"))).toBe(false);

    // Frontmatter updated
    const content = readFileSync(
      join(fixture.cwd, ".lytos/issue-board/4-review/ISS-0002-in-progress.md"),
      "utf-8"
    );
    expect(content).toContain("status: 4-review");
    expect(content).toMatch(/updated: \d{4}-\d{2}-\d{2}/);

    // Board regenerated
    const board = readFileSync(join(fixture.cwd, ".lytos/issue-board/BOARD.md"), "utf-8");
    expect(board).toContain("ISS-0002");
  });

  it("moves a backlog issue to 2-sprint", () => {
    fixture = createEmptyFixture();
    createMoveFixture(fixture.cwd);

    const result = run("move ISS-0001 2-sprint", fixture.cwd);

    expect(result.exitCode).toBe(0);
    expect(existsSync(join(fixture.cwd, ".lytos/issue-board/2-sprint/ISS-0001-in-backlog.md"))).toBe(true);
  });

  it("moves a sprint issue back to 1-backlog", () => {
    fixture = createEmptyFixture();
    createMoveFixture(fixture.cwd);

    const result = run("move ISS-0003 1-backlog", fixture.cwd);

    expect(result.exitCode).toBe(0);
    expect(existsSync(join(fixture.cwd, ".lytos/issue-board/1-backlog/ISS-0003-in-sprint.md"))).toBe(true);
  });

  it("moves an issue to 0-icebox", () => {
    fixture = createEmptyFixture();
    createMoveFixture(fixture.cwd);

    const result = run("move ISS-0001 0-icebox", fixture.cwd);

    expect(result.exitCode).toBe(0);
    expect(existsSync(join(fixture.cwd, ".lytos/issue-board/0-icebox/ISS-0001-in-backlog.md"))).toBe(true);
  });

  it("refuses 3-in-progress and points to lyt start", () => {
    fixture = createEmptyFixture();
    createMoveFixture(fixture.cwd);

    const result = run("move ISS-0001 3-in-progress", fixture.cwd);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("lyt start");
    // Nothing moved
    expect(existsSync(join(fixture.cwd, ".lytos/issue-board/1-backlog/ISS-0001-in-backlog.md"))).toBe(true);
  });

  it("refuses 5-done and points to lyt close", () => {
    fixture = createEmptyFixture();
    createMoveFixture(fixture.cwd);

    const result = run("move ISS-0002 5-done", fixture.cwd);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("lyt close");
    expect(existsSync(join(fixture.cwd, ".lytos/issue-board/3-in-progress/ISS-0002-in-progress.md"))).toBe(true);
  });

  it("rejects an unknown stage and lists the valid ones", () => {
    fixture = createEmptyFixture();
    createMoveFixture(fixture.cwd);

    const result = run("move ISS-0001 7-nowhere", fixture.cwd);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Unknown stage");
    expect(result.stderr).toContain("4-review");
  });

  it("errors when the issue does not exist", () => {
    fixture = createEmptyFixture();
    createMoveFixture(fixture.cwd);

    const result = run("move ISS-9999 4-review", fixture.cwd);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("not found");
  });

  it("is a warning no-op when the issue is already in the target stage", () => {
    fixture = createEmptyFixture();
    createMoveFixture(fixture.cwd);

    const result = run("move ISS-0001 1-backlog", fixture.cwd);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("already");
  });

  it("outputs JSON with --json", () => {
    fixture = createEmptyFixture();
    createMoveFixture(fixture.cwd);

    const result = run("move ISS-0002 4-review --json", fixture.cwd);

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.status).toBe("moved");
    expect(parsed.id).toBe("ISS-0002");
    expect(parsed.from).toBe("3-in-progress");
    expect(parsed.to).toBe("4-review");
  });

  it("outputs a JSON refusal for reserved stages with --json", () => {
    fixture = createEmptyFixture();
    createMoveFixture(fixture.cwd);

    const result = run("move ISS-0001 5-done --json", fixture.cwd);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.status).toBe("error");
    expect(parsed.reason).toBe("reserved-stage");
    expect(parsed.use).toBe("lyt close");
  });
});
