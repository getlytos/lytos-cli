/**
 * Integration tests for `lyt budget` — the loop's budget guard (ISS-0102).
 */

import { describe, it, expect, afterEach } from "vitest";
import { resolve } from "path";
import { mkdirSync, writeFileSync } from "fs";
import { createEmptyFixture, type Fixture } from "../helpers/fixtures.js";

const CLI = resolve(__dirname, "../../dist/cli.js");

function run(args: string, cwd: string): { stdout: string; stderr: string; exitCode: number } {
  const { spawnSync } = require("child_process");
  const result = spawnSync("node", [CLI, ...args.split(" ")], { cwd, encoding: "utf-8" });
  return { stdout: result.stdout || "", stderr: result.stderr || "", exitCode: result.status ?? 0 };
}

function issue(id: string, status: string, cost: number): string {
  return `---\nid: ${id}\ntitle: "${id}"\ntype: feat\npriority: P2-normal\nstatus: ${status}\ncost_usd: ${cost}\ncreated: 2026-08-01\n---\n\n# ${id}\n`;
}

function createFixture(cwd: string, sprintMd?: string): void {
  const lyt = (p: string) => resolve(cwd, ".lytos", p);
  for (const dir of [
    "issue-board/1-backlog", "issue-board/2-sprint",
    "issue-board/3-in-progress", "issue-board/4-review", "issue-board/5-done",
  ]) {
    mkdirSync(lyt(dir), { recursive: true });
  }
  // Pipeline cost: 10 + 15 + 5 = 30 over 3 issues.
  writeFileSync(lyt("issue-board/2-sprint/ISS-0001.md"), issue("ISS-0001", "2-sprint", 10));
  writeFileSync(lyt("issue-board/2-sprint/ISS-0002.md"), issue("ISS-0002", "2-sprint", 15));
  writeFileSync(lyt("issue-board/3-in-progress/ISS-0003.md"), issue("ISS-0003", "3-in-progress", 5));
  // Not in the pipeline scope by default:
  writeFileSync(lyt("issue-board/1-backlog/ISS-0004.md"), issue("ISS-0004", "1-backlog", 99));
  if (sprintMd !== undefined) writeFileSync(lyt("sprint.md"), sprintMd);
}

let fixture: Fixture;
afterEach(() => { if (fixture) fixture.cleanup(); });

describe("lyt budget", () => {
  it("exits 2 when no .lytos/ exists", () => {
    fixture = createEmptyFixture();
    expect(run("budget --max-usd 10", fixture.cwd).exitCode).toBe(2);
  });

  it("sums the in-flight pipeline cost, excluding backlog", () => {
    fixture = createEmptyFixture();
    createFixture(fixture.cwd);
    const json = JSON.parse(run("budget --json", fixture.cwd).stdout);
    expect(json.costUsd).toBe(30);
    expect(json.issues).toBe(3);
  });

  it("stays within budget under the ceiling (exit 0)", () => {
    fixture = createEmptyFixture();
    createFixture(fixture.cwd);
    const r = run("budget --max-usd 50", fixture.cwd);
    expect(r.exitCode).toBe(0);
    expect(JSON.parse(run("budget --max-usd 50 --json", fixture.cwd).stdout).overBudget).toBe(false);
  });

  it("breaches the cost ceiling (exit 1)", () => {
    fixture = createEmptyFixture();
    createFixture(fixture.cwd);
    const r = run("budget --max-usd 20", fixture.cwd);
    expect(r.exitCode).toBe(1);
  });

  it("breaches the issue-count ceiling (exit 1)", () => {
    fixture = createEmptyFixture();
    createFixture(fixture.cwd);
    expect(run("budget --max-issues 2", fixture.cwd).exitCode).toBe(1);
    expect(run("budget --max-issues 5", fixture.cwd).exitCode).toBe(0);
  });

  it("exits 0 with a warning when no ceiling is set", () => {
    fixture = createEmptyFixture();
    createFixture(fixture.cwd);
    const r = run("budget", fixture.cwd);
    expect(r.exitCode).toBe(0);
    expect(JSON.parse(run("budget --json", fixture.cwd).stdout).hasCeiling).toBe(false);
  });

  it("reads the ceiling from sprint.md", () => {
    fixture = createEmptyFixture();
    createFixture(fixture.cwd, "# Sprint\n\nbudget_usd: 25\n");
    expect(run("budget", fixture.cwd).exitCode).toBe(1); // 30 > 25
  });

  it("lets a flag override the sprint.md ceiling", () => {
    fixture = createEmptyFixture();
    createFixture(fixture.cwd, "# Sprint\n\nbudget_usd: 25\n");
    expect(run("budget --max-usd 100", fixture.cwd).exitCode).toBe(0); // flag wins
  });
});
