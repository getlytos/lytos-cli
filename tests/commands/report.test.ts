/**
 * Integration tests for `lyt report` — the review packet (ISS-0103).
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

const KIT = "# Kit\n| id | kind | tiers | tool |\n|----|------|-------|------|\n| tests-unit | gate | low,medium,high | npm test |\n| security-review | reviewer | high | rubric:sec |\n";

function createFixture(cwd: string): void {
  const lyt = (p: string) => resolve(cwd, ".lytos", p);
  for (const dir of ["quality", "issue-board/4-review"]) mkdirSync(lyt(dir), { recursive: true });
  writeFileSync(lyt("quality/kit.md"), KIT);
  writeFileSync(
    lyt("issue-board/4-review/ISS-0042-x.md"),
    `---
id: ISS-0042
title: "A change"
status: 4-review
risk: high
review: no-go
cost_usd: 1.20
ai_implementer:
  model: claude-opus
---

# ISS-0042 — A change

## Definition of done

- [x] Core done — verify: auto
- [ ] Edge case — verify: auto
- [ ] Looks right — verify: human
`
  );
}

let fixture: Fixture;
afterEach(() => { if (fixture) fixture.cleanup(); });

describe("lyt report", () => {
  it("exits 2 without .lytos/", () => {
    fixture = createEmptyFixture();
    expect(run("report ISS-0042", fixture.cwd).exitCode).toBe(2);
  });

  it("exits 1 for an unknown issue", () => {
    fixture = createEmptyFixture();
    createFixture(fixture.cwd);
    expect(run("report ISS-9999", fixture.cwd).exitCode).toBe(1);
  });

  it("buckets the DoD by verify mode and resolves gates for the risk", () => {
    fixture = createEmptyFixture();
    createFixture(fixture.cwd);
    const p = JSON.parse(run("report ISS-0042 --json", fixture.cwd).stdout);
    expect(p.risk).toBe("high");
    expect(p.verdict).toBe("no-go");
    expect(p.autoDone).toHaveLength(1);
    expect(p.autoPending).toHaveLength(1);
    expect(p.human).toHaveLength(1);
    expect(p.requiredGates.map((g: { id: string }) => g.id)).toEqual(["tests-unit", "security-review"]);
    expect(p.audit.model).toBe("claude-opus");
  });

  it("renders doubt before green evidence", () => {
    fixture = createEmptyFixture();
    createFixture(fixture.cwd);
    const md = run("report ISS-0042", fixture.cwd).stdout;
    expect(md).toContain("## ⚠ À trancher");
    expect(md).toContain("Human checklist");
    expect(md).toContain("Reviewer verdict");
    // doubt-first: the "À trancher" section appears before the green evidence
    expect(md.indexOf("À trancher")).toBeLessThan(md.indexOf("Evidence (green)"));
  });
});

function createSprintFixture(cwd: string): void {
  const lyt = (p: string) => resolve(cwd, ".lytos", p);
  for (const dir of ["issue-board/2-sprint", "issue-board/parked", "issue-board/3-in-progress", "issue-board/4-review"]) {
    mkdirSync(lyt(dir), { recursive: true });
  }
  writeFileSync(lyt("sprint.md"), "# Sprint\n\nbudget_usd: 10\n");
  writeFileSync(
    lyt("issue-board/2-sprint/ISS-0001.md"),
    `---\nid: ISS-0001\nstatus: 2-sprint\ncost_usd: 15\n---\n\n## Definition of done\n\n- [x] a — verify: auto\n- [ ] b — verify: human\n`
  );
  writeFileSync(
    lyt("issue-board/parked/ISS-0002.md"),
    `---\nid: ISS-0002\nstatus: parked\npark_reason: ambiguous-spec\n---\n\n# ISS-0002\n`
  );
}

describe("lyt report --sprint", () => {
  it("aggregates counts, parked reasons, coverage and budget", () => {
    fixture = createEmptyFixture();
    createSprintFixture(fixture.cwd);
    const r = JSON.parse(run("report --sprint --json", fixture.cwd).stdout);
    expect(r.counts["2-sprint"]).toBe(1);
    expect(r.counts.parked).toBe(1);
    expect(r.parkedByReason["ambiguous-spec"]).toBe(1);
    expect(r.pendingHumanChecklists).toBe(1);
    expect(r.coverage).toEqual({ done: 1, total: 1, pct: 100 });
    expect(r.budget.overBudget).toBe(true); // 15 > 10
  });

  it("renders parked/pending before the totals", () => {
    fixture = createEmptyFixture();
    createSprintFixture(fixture.cwd);
    const md = run("report --sprint", fixture.cwd).stdout;
    expect(md.indexOf("À trancher")).toBeLessThan(md.indexOf("Evidence (green)"));
    expect(md).toContain("ambiguous-spec");
  });
});
