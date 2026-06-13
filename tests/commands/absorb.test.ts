/**
 * Integration tests for `lyt absorb` (ISS-0076, ADR-0003).
 *
 * Runs the built CLI against a fixture with a synthetic journal — no real AI
 * wrapper. The fixture is not a git repo, so the active issue resolves from the
 * single issue in 3-in-progress/.
 */

import { describe, it, expect, afterEach } from "vitest";
import { resolve, join } from "path";
import { mkdirSync, writeFileSync, readFileSync } from "fs";
import { createEmptyFixture, type Fixture } from "../helpers/fixtures.js";
import { parseFrontmatter } from "../../src/lib/frontmatter.js";

const CLI = resolve(__dirname, "../../dist/cli.js");

function run(args: string, cwd: string): { stdout: string; stderr: string; exitCode: number } {
  const { spawnSync } = require("child_process");
  const result = spawnSync("node", [CLI, ...args.split(" ")], { cwd, encoding: "utf-8" });
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    exitCode: result.status ?? 0,
  };
}

function seedIssue(cwd: string): string {
  const dir = join(cwd, ".lytos", "issue-board", "3-in-progress");
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, "ISS-0001-task.md");
  writeFileSync(
    filePath,
    `---\nid: ISS-0001\ntitle: "Task"\nstatus: 3-in-progress\nschema_version: 2\n---\n\n# Task\n`
  );
  return filePath;
}

function seedJournal(cwd: string, lines: object[]): void {
  const runtime = join(cwd, ".lytos", ".runtime");
  mkdirSync(runtime, { recursive: true });
  writeFileSync(join(runtime, "session.jsonl"), lines.map((l) => JSON.stringify(l)).join("\n"));
}

let fixture: Fixture;

afterEach(() => {
  if (fixture) fixture.cleanup();
});

describe("lyt absorb", () => {
  it("exits 2 when there is no .lytos/", () => {
    fixture = createEmptyFixture();
    const result = run("absorb", fixture.cwd);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("No .lytos/ directory found");
  });

  it("warns and exits 0 when there is no journal", () => {
    fixture = createEmptyFixture();
    seedIssue(fixture.cwd);
    const result = run("absorb", fixture.cwd);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("No journal");
  });

  it("dry-run shows the delta but writes nothing", () => {
    fixture = createEmptyFixture();
    const filePath = seedIssue(fixture.cwd);
    seedJournal(fixture.cwd, [
      { issue: "ISS-0001", role: "implementer", model: "claude-opus-4-7", tokens_in: 100, tokens_out: 20, cost_usd: 0.01, skills: ["testing"] },
    ]);
    const before = readFileSync(filePath, "utf-8");

    const result = run("absorb --json", fixture.cwd);
    const data = JSON.parse(result.stdout);

    expect(data.applied).toBe(false);
    expect(data.delta.ai_implementer).toEqual({ model: "claude-opus-4-7" });
    expect(data.delta.tokens_in).toBe("100");
    expect(readFileSync(filePath, "utf-8")).toBe(before);
  });

  it("--apply writes the audit fields and is idempotent", () => {
    fixture = createEmptyFixture();
    const filePath = seedIssue(fixture.cwd);
    seedJournal(fixture.cwd, [
      { issue: "ISS-0001", role: "implementer", model: "claude-opus-4-7", session: "s1", tokens_in: 100, tokens_out: 20, cost_usd: 0.01, skills: ["testing"] },
      { issue: "ISS-0001", role: "implementer", model: "claude-opus-4-7", session: "s1", tokens_in: 50, tokens_out: 10, cost_usd: 0.005, skills: ["git-workflow"] },
    ]);

    const first = run("absorb --apply --json", fixture.cwd);
    expect(JSON.parse(first.stdout).applied).toBe(true);

    const fm = parseFrontmatter(readFileSync(filePath, "utf-8"))!;
    expect(fm.ai_implementer).toEqual({ model: "claude-opus-4-7", session: "s1" });
    expect(fm.tokens_in).toBe("150");
    expect(fm.cost_usd).toBe("0.015");
    expect(fm.skills_used).toEqual(["git-workflow", "testing"]);

    // Idempotent: a second apply leaves the frontmatter identical.
    const afterFirst = readFileSync(filePath, "utf-8");
    run("absorb --apply", fixture.cwd);
    expect(readFileSync(filePath, "utf-8")).toBe(afterFirst);
  });

  it("errors when the active issue cannot be resolved", () => {
    fixture = createEmptyFixture();
    // Two issues in-progress → ambiguous, no journal lookup needed.
    const dir = join(fixture.cwd, ".lytos", "issue-board", "3-in-progress");
    mkdirSync(dir, { recursive: true });
    for (const id of ["ISS-0001", "ISS-0002"]) {
      writeFileSync(join(dir, `${id}-x.md`), `---\nid: ${id}\nstatus: 3-in-progress\n---\n\n# x\n`);
    }
    const result = run("absorb", fixture.cwd);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Could not resolve the active issue");
  });
});
