/**
 * Integration tests for `lyt park` / `lyt unpark` (ISS-0100).
 *
 * Covers the closed reason taxonomy, the atomic move to the parked/ side-state,
 * the frontmatter metadata, resume via unpark, and the `lyt move → parked` refusal.
 */

import { describe, it, expect, afterEach } from "vitest";
import { resolve } from "path";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import { execSync } from "child_process";
import { createEmptyFixture, type Fixture } from "../helpers/fixtures.js";

const CLI = resolve(__dirname, "../../dist/cli.js");

const REASONS = [
  "ambiguous-spec",
  "missing-dependency",
  "gate-failed",
  "budget-exhausted",
  "human-judgment-required",
  "external-blocker",
];

function run(args: string, cwd: string): { stdout: string; stderr: string; exitCode: number } {
  const { spawnSync } = require("child_process");
  const result = spawnSync("node", [CLI, ...args.split(" ")], { cwd, encoding: "utf-8" });
  return { stdout: result.stdout || "", stderr: result.stderr || "", exitCode: result.status ?? 0 };
}

function createParkFixture(cwd: string): void {
  const lyt = (p: string) => resolve(cwd, ".lytos", p);
  for (const dir of [
    "issue-board/0-icebox", "issue-board/1-backlog", "issue-board/2-sprint",
    "issue-board/3-in-progress", "issue-board/4-review", "issue-board/5-done",
  ]) {
    mkdirSync(lyt(dir), { recursive: true });
  }
  writeFileSync(
    lyt("issue-board/2-sprint/ISS-0001-sprint-task.md"),
    `---\nid: ISS-0001\ntitle: "Sprint task"\ntype: feat\npriority: P2-normal\neffort: S\nstatus: 2-sprint\ndepends: []\ncreated: 2026-08-01\nupdated: 2026-08-01\n---\n\n# ISS-0001 — Sprint task\n`
  );
  execSync("git init -b main", { cwd, stdio: "pipe" });
  execSync("git config user.email 'test@test.com'", { cwd, stdio: "pipe" });
  execSync("git config user.name 'Test'", { cwd, stdio: "pipe" });
  execSync("git add -A && git commit -m init --no-gpg-sign", { cwd, stdio: "pipe" });
}

const parkedFile = (cwd: string) => resolve(cwd, ".lytos/issue-board/parked/ISS-0001-sprint-task.md");
const sprintFile = (cwd: string) => resolve(cwd, ".lytos/issue-board/2-sprint/ISS-0001-sprint-task.md");

let fixture: Fixture;
afterEach(() => { if (fixture) fixture.cleanup(); });

describe("lyt park", () => {
  it("exits 2 when no .lytos/ exists", () => {
    fixture = createEmptyFixture();
    const r = run("park ISS-0001 --reason ambiguous-spec", fixture.cwd);
    expect(r.exitCode).toBe(2);
  });

  it("parks an issue: moves to parked/ and writes reason + date", () => {
    fixture = createEmptyFixture();
    createParkFixture(fixture.cwd);
    const r = run("park ISS-0001 --reason ambiguous-spec", fixture.cwd);
    expect(r.exitCode).toBe(0);
    expect(existsSync(parkedFile(fixture.cwd))).toBe(true);
    expect(existsSync(sprintFile(fixture.cwd))).toBe(false);
    const content = readFileSync(parkedFile(fixture.cwd), "utf-8");
    expect(content).toContain("status: parked");
    expect(content).toContain("park_reason: ambiguous-spec");
    expect(content).toContain("parked_at:");
  });

  it("accepts every reason in the closed taxonomy", () => {
    for (const reason of REASONS) {
      fixture = createEmptyFixture();
      createParkFixture(fixture.cwd);
      const r = run(`park ISS-0001 --reason ${reason}`, fixture.cwd);
      expect(r.exitCode, `reason ${reason}`).toBe(0);
      expect(readFileSync(parkedFile(fixture.cwd), "utf-8")).toContain(`park_reason: ${reason}`);
      fixture.cleanup();
    }
    fixture = undefined as unknown as Fixture;
  });

  it("refuses an unknown reason", () => {
    fixture = createEmptyFixture();
    createParkFixture(fixture.cwd);
    const r = run("park ISS-0001 --reason nope", fixture.cwd);
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("Unknown reason");
    expect(existsSync(sprintFile(fixture.cwd))).toBe(true); // untouched
  });

  it("refuses when --reason is missing", () => {
    fixture = createEmptyFixture();
    createParkFixture(fixture.cwd);
    const r = run("park ISS-0001", fixture.cwd);
    expect(r.exitCode).toBe(1);
  });

  it("exits 1 for an unknown issue", () => {
    fixture = createEmptyFixture();
    createParkFixture(fixture.cwd);
    const r = run("park ISS-9999 --reason gate-failed", fixture.cwd);
    expect(r.exitCode).toBe(1);
  });

  it("outputs JSON with --json", () => {
    fixture = createEmptyFixture();
    createParkFixture(fixture.cwd);
    const r = run("park ISS-0001 --reason budget-exhausted --json", fixture.cwd);
    const json = JSON.parse(r.stdout);
    expect(json.status).toBe("parked");
    expect(json.reason).toBe("budget-exhausted");
  });
});

describe("lyt unpark", () => {
  it("returns a parked issue to the sprint and clears park metadata", () => {
    fixture = createEmptyFixture();
    createParkFixture(fixture.cwd);
    run("park ISS-0001 --reason ambiguous-spec", fixture.cwd);
    const r = run("unpark ISS-0001", fixture.cwd);
    expect(r.exitCode).toBe(0);
    expect(existsSync(sprintFile(fixture.cwd))).toBe(true);
    expect(existsSync(parkedFile(fixture.cwd))).toBe(false);
    const content = readFileSync(sprintFile(fixture.cwd), "utf-8");
    expect(content).toContain("status: 2-sprint");
    expect(content).not.toContain("park_reason");
    expect(content).not.toContain("parked_at");
  });

  it("refuses to unpark an issue that is not parked", () => {
    fixture = createEmptyFixture();
    createParkFixture(fixture.cwd);
    const r = run("unpark ISS-0001", fixture.cwd);
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("not parked");
  });
});

describe("lyt move → parked", () => {
  it("is refused with a pointer to lyt park", () => {
    fixture = createEmptyFixture();
    createParkFixture(fixture.cwd);
    const r = run("move ISS-0001 parked", fixture.cwd);
    expect(r.exitCode).toBe(1);
    expect(r.stderr + r.stdout).toContain("lyt park");
  });
});
