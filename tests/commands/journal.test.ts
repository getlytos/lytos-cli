/**
 * Integration tests for `lyt journal` — the derived logbook (ISS-0124).
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

function createFixture(cwd: string): void {
  const lyt = (p: string) => resolve(cwd, ".lytos", p);
  for (const dir of ["issue-board/5-done", "issue-board/archive/2026-Q2"]) {
    mkdirSync(lyt(dir), { recursive: true });
  }
  writeFileSync(
    lyt("issue-board/5-done/ISS-0050.md"),
    `---\nid: ISS-0050\ntitle: "Add parking"\nstatus: 5-done\nreview: go\ncompleted_at: 2026-08-05\n---\n\n# ISS-0050 — Add parking\n\n## Context\n\nThe loop must halt, not guess, on ambiguity.\n`
  );
  writeFileSync(
    lyt("issue-board/archive/2026-Q2/ISS-0009.md"),
    `---\nid: ISS-0009\ntitle: "Doctor command"\nstatus: 5-done\nreview: go\ncompleted_at: 2026-04-15\n---\n\n# ISS-0009\n\n## Context\n\nDeep diagnostics beyond lint.\n`
  );
}

let fixture: Fixture;
afterEach(() => { if (fixture) fixture.cleanup(); });

describe("lyt journal", () => {
  it("exits 2 without .lytos/", () => {
    fixture = createEmptyFixture();
    expect(run("journal", fixture.cwd).exitCode).toBe(2);
  });

  it("derives entries from 5-done + archive, newest group first", () => {
    fixture = createEmptyFixture();
    createFixture(fixture.cwd);
    const groups = JSON.parse(run("journal --json", fixture.cwd).stdout);
    expect(groups.map((g: { key: string }) => g.key)).toEqual(["2026-08", "2026-04"]);
    const aug = groups[0].entries[0];
    expect(aug.id).toBe("ISS-0050");
    expect(aug.verdict).toBe("go");
    expect(aug.why).toContain("halt, not guess");
    expect(aug.link).toBe("issue-board/5-done/ISS-0050.md");
  });

  it("renders a readable markdown logbook with links", () => {
    fixture = createEmptyFixture();
    createFixture(fixture.cwd);
    const md = run("journal", fixture.cwd).stdout;
    expect(md).toContain("# Journal de bord");
    expect(md).toContain("**ISS-0050** Add parking");
    expect(md).toContain("[détail](issue-board/5-done/ISS-0050.md)");
  });

  it("handles an empty board", () => {
    fixture = createEmptyFixture();
    mkdirSync(resolve(fixture.cwd, ".lytos/issue-board/5-done"), { recursive: true });
    expect(JSON.parse(run("journal --json", fixture.cwd).stdout)).toEqual([]);
  });
});
