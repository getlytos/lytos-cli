/**
 * Integration tests for `lyt start`.
 */

import { describe, it, expect, afterEach } from "vitest";
import { resolve, join } from "path";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import { execSync } from "child_process";
import {
  createEmptyFixture,
  type Fixture,
} from "../helpers/fixtures.js";

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

function createStartFixture(cwd: string): void {
  const lyt = (p: string) => resolve(cwd, ".lytos", p);

  for (const dir of [
    "skills", "rules", "memory/cortex",
    "issue-board/0-icebox", "issue-board/1-backlog",
    "issue-board/2-sprint", "issue-board/3-in-progress",
    "issue-board/4-review", "issue-board/5-done",
  ]) {
    mkdirSync(lyt(dir), { recursive: true });
  }

  // Backlog issue
  writeFileSync(
    lyt("issue-board/1-backlog/ISS-0001-test-feature.md"),
    `---
id: ISS-0001
title: "Test feature"
type: feat
priority: P1-high
effort: M
status: 1-backlog
branch: "feat/ISS-0001-test-feature"
depends: []
created: 2026-04-16
---

# ISS-0001 — Test feature

- [ ] Step one
- [ ] Step two
`
  );

  // Already in-progress issue
  writeFileSync(
    lyt("issue-board/3-in-progress/ISS-0002-in-progress.md"),
    `---
id: ISS-0002
title: "Already started"
type: feat
priority: P1-high
effort: S
status: 3-in-progress
depends: []
created: 2026-04-15
---

# ISS-0002 — Already started
`
  );

  // Done issue
  writeFileSync(
    lyt("issue-board/5-done/ISS-0003-done.md"),
    `---
id: ISS-0003
title: "Already done"
type: feat
priority: P1-high
effort: S
status: 5-done
depends: []
created: 2026-04-14
---

# ISS-0003 — Already done
`
  );

  // Init git repo for branch creation
  execSync("git init -b main", { cwd, stdio: "pipe" });
  execSync("git add -A && git commit -m 'init' --no-gpg-sign", { cwd, stdio: "pipe" });
}

let fixture: Fixture;

afterEach(() => {
  if (fixture) fixture.cleanup();
});

describe("lyt start", () => {
  it("moves issue to in-progress and creates branch", () => {
    fixture = createEmptyFixture();
    createStartFixture(fixture.cwd);

    const result = run("start ISS-0001", fixture.cwd);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("ISS-0001");
    expect(result.stderr).toContain("started");

    // File moved
    expect(existsSync(join(fixture.cwd, ".lytos/issue-board/3-in-progress/ISS-0001-test-feature.md"))).toBe(true);
    expect(existsSync(join(fixture.cwd, ".lytos/issue-board/1-backlog/ISS-0001-test-feature.md"))).toBe(false);

    // Frontmatter updated
    const content = readFileSync(join(fixture.cwd, ".lytos/issue-board/3-in-progress/ISS-0001-test-feature.md"), "utf-8");
    expect(content).toContain("status: 3-in-progress");

    // Board regenerated
    expect(existsSync(join(fixture.cwd, ".lytos/issue-board/BOARD.md"))).toBe(true);
  });

  it("warns when issue is already in-progress", () => {
    fixture = createEmptyFixture();
    createStartFixture(fixture.cwd);

    const result = run("start ISS-0002", fixture.cwd);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("already in progress");
  });

  it("errors when trying to start a done issue", () => {
    fixture = createEmptyFixture();
    createStartFixture(fixture.cwd);

    const result = run("start ISS-0003", fixture.cwd);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("already done");
  });

  it("errors for non-existent issue", () => {
    fixture = createEmptyFixture();
    createStartFixture(fixture.cwd);

    const result = run("start ISS-9999", fixture.cwd);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("not found");
  });

  it("outputs valid JSON with --json", () => {
    fixture = createEmptyFixture();
    createStartFixture(fixture.cwd);

    const result = run("start ISS-0001 --json", fixture.cwd);

    expect(result.exitCode).toBe(0);
    const data = JSON.parse(result.stdout);
    expect(data.status).toBe("started");
    expect(data.branch).toBe("feat/ISS-0001-test-feature");
  });
});
