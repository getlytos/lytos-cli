/**
 * Integration tests for `lyt gates` — the risk → gate matrix (ISS-0114).
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

const KIT = `# Kit
| id | kind | tiers | tool |
|----|------|-------|------|
| tests-unit | gate | low,medium,high | npm test |
| deps-audit | gate | medium,high | npm audit |
| security-review | reviewer | high | rubric:sec |
`;

function createFixture(cwd: string): void {
  const lyt = (p: string) => resolve(cwd, ".lytos", p);
  for (const dir of ["quality", "issue-board/2-sprint"]) mkdirSync(lyt(dir), { recursive: true });
  writeFileSync(lyt("quality/kit.md"), KIT);
  const issue = (id: string, risk?: string) =>
    `---\nid: ${id}\ntitle: "${id}"\nstatus: 2-sprint\n${risk ? `risk: ${risk}\n` : ""}created: 2026-08-01\n---\n\n# ${id}\n`;
  writeFileSync(lyt("issue-board/2-sprint/ISS-0001-low.md"), issue("ISS-0001", "low"));
  writeFileSync(lyt("issue-board/2-sprint/ISS-0002-high.md"), issue("ISS-0002", "high"));
  writeFileSync(lyt("issue-board/2-sprint/ISS-0003-norisk.md"), issue("ISS-0003"));
}

let fixture: Fixture;
afterEach(() => { if (fixture) fixture.cleanup(); });

describe("lyt gates", () => {
  it("exits 2 without .lytos/", () => {
    fixture = createEmptyFixture();
    expect(run("gates", fixture.cwd).exitCode).toBe(2);
  });

  it("errors when there is no kit", () => {
    fixture = createEmptyFixture();
    mkdirSync(resolve(fixture.cwd, ".lytos/issue-board/2-sprint"), { recursive: true });
    const r = run("gates", fixture.cwd);
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("No quality kit");
  });

  it("resolves the cheap set at risk low", () => {
    fixture = createEmptyFixture();
    createFixture(fixture.cwd);
    const json = JSON.parse(run("gates ISS-0001 --json", fixture.cwd).stdout);
    expect(json.risk).toBe("low");
    expect(json.required.map((g: { id: string }) => g.id)).toEqual(["tests-unit"]);
  });

  it("resolves the full set at risk high, grouped by kind", () => {
    fixture = createEmptyFixture();
    createFixture(fixture.cwd);
    const json = JSON.parse(run("gates ISS-0002 --json", fixture.cwd).stdout);
    expect(json.risk).toBe("high");
    expect(json.counts).toEqual({ auto: 2, reviewer: 1, human: 0 });
  });

  it("defaults a missing risk field to medium", () => {
    fixture = createEmptyFixture();
    createFixture(fixture.cwd);
    const json = JSON.parse(run("gates ISS-0003 --json", fixture.cwd).stdout);
    expect(json.risk).toBe("medium");
    expect(json.required.map((g: { id: string }) => g.id)).toEqual(["tests-unit", "deps-audit"]);
  });

  it("prints the whole matrix with no issue", () => {
    fixture = createEmptyFixture();
    createFixture(fixture.cwd);
    const json = JSON.parse(run("gates --json", fixture.cwd).stdout);
    expect(json.matrix.map((m: { risk: string }) => m.risk)).toEqual(["low", "medium", "high"]);
  });
});
