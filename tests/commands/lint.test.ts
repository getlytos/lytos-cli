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

/**
 * `lyt init --lang fr` writes a French manifest, so the linter has to look for the
 * headings it actually generated. Before this, every French project failed lint with
 * three phantom "Missing section" errors — and its placeholder warnings never fired.
 */
describe("lyt lint — French projects", () => {
  function createFrenchLytos(cwd: string, manifest: string): void {
    createValidLytos(cwd);
    const lyt = (p: string) => resolve(cwd, ".lytos", p);
    writeFileSync(lyt("config.yml"), "# Lytos configuration\nlanguage: fr\nprofile: solo\n");
    writeFileSync(lyt("manifest.md"), manifest);
  }

  const MANIFESTE_REMPLI = `# Manifest — test

## Identité

| Champ | Valeur |
|-------|--------|
| Nom | test |
| Description | Un projet de test |
| Propriétaire | testeur |

## Pourquoi ce projet existe

Projet de test pour valider lyt lint.

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Langage | TypeScript |
`;

  it("passes on a French manifest when config.yml declares language: fr", () => {
    fixture = createEmptyFixture();
    createFrenchLytos(fixture.cwd, MANIFESTE_REMPLI);

    const result = run("lint", fixture.cwd);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("All checks passed");
    expect(result.stderr).not.toContain("Missing section");
  });

  it("still reports the French sections when they are genuinely missing", () => {
    fixture = createEmptyFixture();
    createFrenchLytos(fixture.cwd, "# Manifest — test\n\nAucune section.\n");

    const result = run("lint", fixture.cwd);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Missing section: Identité");
    expect(result.stderr).toContain("Missing section: Pourquoi ce projet existe");
    expect(result.stderr).toContain("Missing section: Stack technique");
  });

  it("catches French template placeholders that the English patterns missed", () => {
    fixture = createEmptyFixture();
    createFrenchLytos(
      fixture.cwd,
      `# Manifest — test

## Identité

| Champ | Valeur |
|-------|--------|
| Nom | test |
| Description | |
| Propriétaire | |

## Pourquoi ce projet existe

*3-5 phrases. Le "pourquoi" de ce projet.*

## Stack technique

| Composant | Technologie |
|-----------|-------------|
`
    );

    const result = run("lint", fixture.cwd);

    expect(result.stderr).toContain("Empty description");
    expect(result.stderr).toContain("Empty owner");
    expect(result.stderr).toContain("placeholder");
  });

  it("falls back to English when config.yml names an unknown language", () => {
    fixture = createEmptyFixture();
    createValidLytos(fixture.cwd);
    writeFileSync(
      resolve(fixture.cwd, ".lytos", "config.yml"),
      "# Lytos configuration\nlanguage: klingon\nprofile: solo\n"
    );

    const result = run("lint", fixture.cwd);

    // The manifest written by createValidLytos is English — it must still pass.
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("All checks passed");
  });
});
