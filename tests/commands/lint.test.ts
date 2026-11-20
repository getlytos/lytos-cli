/**
 * Integration tests for `lyt lint`.
 *
 * Tests the linter against various .lytos/ configurations.
 */

import { describe, it, expect, afterEach } from "vitest";
import { resolve } from "path";
import { mkdirSync, writeFileSync } from "fs";
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

function createValidLytos(cwd: string): void {
  const lyt = (p: string) => resolve(cwd, ".lytos", p);

  // Create directories
  for (const dir of [
    "skills", "rules", "memory/cortex", "scripts",
    "issue-board/0-icebox", "issue-board/1-backlog",
    "issue-board/2-sprint", "issue-board/3-in-progress",
    "issue-board/4-review", "issue-board/5-done",
  ]) {
    mkdirSync(lyt(dir), { recursive: true });
  }

  // Required files
  writeFileSync(lyt("manifest.md"), `# Manifest — test

## Identity

| Field | Value |
|-------|-------|
| Name | test |
| Description | A test project |
| Owner | tester |

## Why this project exists

This is a test project for validating lyt lint.

## Tech stack

| Component | Technology |
|-----------|------------|
| Language | TypeScript |
`);

  writeFileSync(lyt("LYTOS.md"), "# LYTOS\nMethod reference.");
  writeFileSync(lyt("memory/MEMORY.md"), "# Memory\nIndex.");
  writeFileSync(lyt("rules/default-rules.md"), "# Rules\nDefault rules.");
  writeFileSync(lyt("issue-board/BOARD.md"), "# Board\nEmpty.");
  writeFileSync(lyt("skills/session-start.md"), "# Session Start\nSkill.");
}

let fixture: Fixture;

afterEach(() => {
  if (fixture) fixture.cleanup();
});

describe("lyt lint", () => {
  it("passes on a valid .lytos/ structure", () => {
    fixture = createEmptyFixture();
    createValidLytos(fixture.cwd);

    const result = run("lint", fixture.cwd);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("All checks passed");
  });

  it("fails when .lytos/ does not exist", () => {
    fixture = createEmptyFixture();

    const result = run("lint", fixture.cwd);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("No .lytos/ directory found");
  });

  it("detects missing required files", () => {
    fixture = createEmptyFixture();
    mkdirSync(resolve(fixture.cwd, ".lytos"), { recursive: true });

    const result = run("lint", fixture.cwd);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("manifest.md");
    expect(result.stderr).toContain("LYTOS.md");
    expect(result.stderr).toContain("MEMORY.md");
  });

  it("detects empty manifest fields", () => {
    fixture = createEmptyFixture();
    createValidLytos(fixture.cwd);

    // Overwrite manifest with empty fields
    writeFileSync(resolve(fixture.cwd, ".lytos", "manifest.md"), `# Manifest

## Identity

| Field | Value |
|-------|-------|
| Name | test |
| Description | |
| Owner | |

## Why this project exists

*3-5 sentences. The "why" of this project.*

## Tech stack

| Component | Technology |
|-----------|------------|
`);

    const result = run("lint", fixture.cwd);

    expect(result.stderr).toContain("Empty description");
    expect(result.stderr).toContain("Empty owner");
    expect(result.stderr).toContain("placeholder");
  });

  it("detects invalid issue frontmatter", () => {
    fixture = createEmptyFixture();
    createValidLytos(fixture.cwd);

    // Create an issue with missing required fields
    writeFileSync(
      resolve(fixture.cwd, ".lytos", "issue-board", "1-backlog", "ISS-0001-test.md"),
      `---
id: ISS-0001
title: "Test issue"
---

# Test
`
    );

    const result = run("lint", fixture.cwd);

    expect(result.stderr).toContain("Missing required field: status");
    expect(result.stderr).toContain("Missing required field: priority");
  });

  it("detects folder/frontmatter status mismatch", () => {
    fixture = createEmptyFixture();
    createValidLytos(fixture.cwd);

    writeFileSync(
      resolve(fixture.cwd, ".lytos", "issue-board", "1-backlog", "ISS-0001-test.md"),
      `---
id: ISS-0001
title: "Mismatched"
status: 3-in-progress
priority: P1-high
---

# Test
`
    );

    const result = run("lint", fixture.cwd);

    expect(result.stderr).toContain("1-backlog");
    expect(result.stderr).toContain("3-in-progress");
  });

  it("outputs valid JSON with --json", () => {
    fixture = createEmptyFixture();
    createValidLytos(fixture.cwd);

    const result = run("lint --json", fixture.cwd);

    expect(result.exitCode).toBe(0);
    const data = JSON.parse(result.stdout);
    expect(data.errors).toBe(0);
    expect(data.warnings).toBe(0);
    expect(data.filesChecked).toBeGreaterThan(0);
  });

  it("accepts v2 frontmatter fields with valid values", () => {
    fixture = createEmptyFixture();
    createValidLytos(fixture.cwd);

    writeFileSync(
      resolve(fixture.cwd, ".lytos", "issue-board", "4-review", "ISS-0001-v2-ok.md"),
      `---
id: ISS-0001
title: "v2 issue"
status: 4-review
priority: P2-normal
schema_version: 2
review: go
risk: medium
confidence: 80
validation:
  tests: pass
  build: pass
  lint: skip
---

# Test
`
    );

    const result = run("lint", fixture.cwd);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).not.toContain("Invalid");
  });

  it("rejects invalid v2 review verdict", () => {
    fixture = createEmptyFixture();
    createValidLytos(fixture.cwd);

    writeFileSync(
      resolve(fixture.cwd, ".lytos", "issue-board", "4-review", "ISS-0001-bad-review.md"),
      `---
id: ISS-0001
title: "Bad review"
status: 4-review
priority: P2-normal
review: maybe
---

# Test
`
    );

    const result = run("lint", fixture.cwd);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Invalid 'review' value: maybe");
  });

  it("rejects invalid v2 risk, confidence, and validation values", () => {
    fixture = createEmptyFixture();
    createValidLytos(fixture.cwd);

    writeFileSync(
      resolve(fixture.cwd, ".lytos", "issue-board", "1-backlog", "ISS-0001-bad-v2.md"),
      `---
id: ISS-0001
title: "Bad v2"
status: 1-backlog
priority: P2-normal
risk: catastrophic
confidence: 200
validation:
  tests: ok
  build: pass
  lint: skip
---

# Test
`
    );

    const result = run("lint", fixture.cwd);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Invalid 'risk' value");
    expect(result.stderr).toContain("Invalid 'confidence' value");
    expect(result.stderr).toContain("Invalid 'validation.tests' value");
  });

  it("accepts v1 issues without any v2 fields (no v2 false positives)", () => {
    fixture = createEmptyFixture();
    createValidLytos(fixture.cwd);

    writeFileSync(
      resolve(fixture.cwd, ".lytos", "issue-board", "1-backlog", "ISS-0001-pure-v1.md"),
      `---
id: ISS-0001
title: "Pure v1"
status: 1-backlog
priority: P2-normal
type: feat
effort: S
---

# Test
`
    );

    const result = run("lint", fixture.cwd);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).not.toContain("Invalid");
  });

  it("returns exit code 1 on errors, 0 on warnings only", () => {
    fixture = createEmptyFixture();
    createValidLytos(fixture.cwd);

    // Add a warning-only issue (empty description in manifest)
    writeFileSync(resolve(fixture.cwd, ".lytos", "manifest.md"), `# Manifest

## Identity

| Field | Value |
|-------|-------|
| Name | test |
| Description | |
| Owner | tester |

## Why this project exists

This project exists for real reasons.

## Tech stack

| Component | Technology |
|-----------|------------|
| Language | TypeScript |
`);

    const result = run("lint", fixture.cwd);

    // Warnings only — should still exit 0
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("Empty description");
  });
});

describe("lyt lint — DoD verify markers (ISS-0153)", () => {
  function writeV2Issue(cwd: string, dod: string): void {
    writeFileSync(
      resolve(cwd, ".lytos", "issue-board", "4-review", "ISS-0001-markers.md"),
      `---
id: ISS-0001
title: "Markers"
status: 4-review
priority: P2-normal
schema_version: 2
---

# ISS-0001

## Definition of done

${dod}
`
    );
  }

  function markerWarnings(cwd: string): string[] {
    const data = JSON.parse(run("lint --json", cwd).stdout);
    return data.findings
      .filter((f: { message: string }) => f.message.includes("without a verify: marker"))
      .map((f: { message: string }) => f.message);
  }

  it("accepts every documented marker form, pinned or not", () => {
    fixture = createEmptyFixture();
    createValidLytos(fixture.cwd);
    writeV2Issue(
      fixture.cwd,
      [
        "- [ ] a — verify: auto",
        "- [ ] b — verify: auto:tests-unit",
        "- [ ] c — verify: reviewer",
        "- [ ] d — verify: reviewer:over-engineering",
        "- [ ] e — verify: human",
        "- [ ] f — verify: human:product-intent",
        "- [ ] g — *verify: human:screen-reader*",
        "- [ ] h – (verify: Reviewer:Architecture-Review)",
        "- [ ] i - _verify: auto:doc-L0_",
      ].join("\n")
    );
    expect(markerWarnings(fixture.cwd)).toEqual([]);
  });

  it("still reports an unmarked item and a malformed pin", () => {
    fixture = createEmptyFixture();
    createValidLytos(fixture.cwd);
    writeV2Issue(
      fixture.cwd,
      "- [ ] ok — verify: auto\n- [ ] no marker at all\n- [ ] empty pin — verify: human:\n- [ ] unknown mode — verify: maybe"
    );
    expect(markerWarnings(fixture.cwd)).toEqual([
      "3 Definition-of-Done item(s) without a verify: marker",
    ]);
  });

  it("names all three modes in its fix suggestion", () => {
    fixture = createEmptyFixture();
    createValidLytos(fixture.cwd);
    writeV2Issue(fixture.cwd, "- [ ] no marker at all");
    const data = JSON.parse(run("lint --json", fixture.cwd).stdout);
    const finding = data.findings.find((f: { message: string }) => f.message.includes("verify: marker"));
    expect(finding.severity).toBe("warning");
    for (const mode of ["auto", "reviewer", "human"]) expect(finding.fix).toContain(mode);
    expect(run("lint", fixture.cwd).exitCode).toBe(0); // a warning never fails the run
  });
});

describe("lyt lint — the human rule (ISS-0154)", () => {
  const KIT = `# Quality kit

| id | kind | tiers | tool |
|----|------|-------|------|
| tests-unit | gate | low,medium,high | npm test |
| e2e | gate | high | npx playwright test |
| over-engineering | reviewer | medium,high | rubric:over-engineering |
| product-intent | human | high | checklist:intent |
| screen-reader | human | high | checklist:a11y |
`;

  function setup(cwd: string): void {
    createValidLytos(cwd);
    mkdirSync(resolve(cwd, ".lytos", "quality"), { recursive: true });
    writeFileSync(resolve(cwd, ".lytos", "quality", "kit.md"), KIT);
  }

  function writeIssue(cwd: string, dir: string, dod: string, schema = "schema_version: 2\n"): void {
    mkdirSync(resolve(cwd, ".lytos", "issue-board", dir), { recursive: true });
    writeFileSync(
      resolve(cwd, ".lytos", "issue-board", dir, "ISS-0001-human.md"),
      `---\nid: ISS-0001\ntitle: "Human"\nstatus: ${dir}\npriority: P2-normal\n${schema}---\n\n# ISS-0001\n\n## Definition of done\n\n${dod}\n`
    );
  }

  function humanFindings(cwd: string): Array<{ severity: string; message: string; fix: string }> {
    const data = JSON.parse(run("lint --json", cwd).stdout);
    return data.findings.filter((f: { message: string }) => /verify: human/.test(f.message));
  }

  it("warns on an unpinned human item and offers both remedies", () => {
    fixture = createEmptyFixture();
    setup(fixture.cwd);
    writeIssue(fixture.cwd, "2-sprint", "- [ ] Walk the checkout — verify: human\n- [ ] Intent — verify: human:product-intent");
    const findings = humanFindings(fixture.cwd);
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("warning");
    expect(findings[0].message).toContain("1 verify: human item(s) without a kit pin");
    // Remedy 1: pin a human line of the kit (the kit's own ids are listed).
    expect(findings[0].fix).toContain("verify: human:<id>");
    expect(findings[0].fix).toContain("product-intent");
    expect(findings[0].fix).toContain("screen-reader");
    // Remedy 2: a browser can check it → auto:e2e.
    expect(findings[0].fix).toContain("verify: auto:e2e");
    // A warning never fails the run.
    expect(run("lint", fixture.cwd).exitCode).toBe(0);
  });

  it("warns when a human pin names a line of another kind", () => {
    fixture = createEmptyFixture();
    setup(fixture.cwd);
    writeIssue(fixture.cwd, "2-sprint", "- [ ] A — verify: human:tests-unit\n- [ ] B — verify: human:over-engineering");
    const findings = humanFindings(fixture.cwd);
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("warning");
    expect(findings[0].message).toContain("tests-unit (gate)");
    expect(findings[0].message).toContain("over-engineering (reviewer)");
    expect(run("lint", fixture.cwd).exitCode).toBe(0);
  });

  it("stays silent on a pin to a human line, and on a pin the kit does not know (doctor's job)", () => {
    fixture = createEmptyFixture();
    setup(fixture.cwd);
    writeIssue(fixture.cwd, "2-sprint", "- [ ] A — verify: human:product-intent\n- [ ] B — verify: human:screen-reader\n- [ ] C — verify: human:ghost-list");
    expect(humanFindings(fixture.cwd)).toEqual([]);
  });

  it("skips closed issues and schema v1 issues — no existing project starts complaining about its history", () => {
    fixture = createEmptyFixture();
    setup(fixture.cwd);
    writeIssue(fixture.cwd, "5-done", "- [x] Old call — verify: human");
    expect(humanFindings(fixture.cwd)).toEqual([]);
    writeIssue(fixture.cwd, "2-sprint", "- [ ] Legacy — verify: human", "");
    expect(humanFindings(fixture.cwd)).toEqual([]);
  });

  it("still flags an unpinned human item when the project has no kit at all", () => {
    fixture = createEmptyFixture();
    createValidLytos(fixture.cwd);
    writeIssue(fixture.cwd, "2-sprint", "- [ ] Walk the checkout — verify: human");
    const findings = humanFindings(fixture.cwd);
    expect(findings).toHaveLength(1);
    expect(findings[0].fix).toContain("verify: auto:e2e");
    expect(findings[0].fix).not.toContain("undefined");
  });

  it("does not touch the existing marker check", () => {
    fixture = createEmptyFixture();
    setup(fixture.cwd);
    writeIssue(fixture.cwd, "2-sprint", "- [ ] no marker at all");
    const data = JSON.parse(run("lint --json", fixture.cwd).stdout);
    expect(data.findings.some((f: { message: string }) => f.message.includes("without a verify: marker"))).toBe(true);
    expect(humanFindings(fixture.cwd)).toEqual([]);
  });
});
