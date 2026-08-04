/**
 * Unit tests for the lytos-issue merge driver logic (ISS-0093).
 *
 * The three fiche scenarios are the contract:
 *   1. append // append          → auto-merge, union of both sections
 *   2. same frontmatter field    → conflict maintained
 *   3. same section rewritten    → conflict maintained (a rewrite is not
 *      an append)
 *
 * Plus the integration proof: a real `git merge` with the driver
 * configured resolves an append//append without human intervention.
 */

import { describe, it, expect, afterEach } from "vitest";
import { resolve, join } from "path";
import { mkdirSync, writeFileSync, readFileSync } from "fs";
import { execSync, spawnSync } from "child_process";
import { mergeIssue, splitSections } from "../../src/lib/merge-issue.js";
import { createEmptyFixture, type Fixture } from "../helpers/fixtures.js";

const CLI = resolve(__dirname, "../../dist/cli.js");

const BASE = `---
id: ISS-0100
title: "Sample fiche"
type: feat
priority: P1-high
status: 3-in-progress
updated: 2026-08-01
---

# ISS-0100 — Sample fiche

Intro paragraph.

## Contexte

Le contexte initial.

## Definition of done

- [ ] Item one
- [ ] Item two
`;

describe("splitSections", () => {
  it("splits preamble and ## sections", () => {
    const body = "# Title\n\nIntro.\n\n## One\n\ncontent one\n\n## Two\n\ncontent two\n";
    const split = splitSections(body);
    expect(split.preamble).toContain("# Title");
    expect(split.sections.map((s) => s.key)).toEqual(["## One", "## Two"]);
  });

  it("does not split on ## lines inside code fences", () => {
    const body = "# Title\n\n## Real\n\n```markdown\n## Fake heading in fence\n```\n\n## Other\n";
    const split = splitSections(body);
    expect(split.sections.map((s) => s.key)).toEqual(["## Real", "## Other"]);
    expect(split.sections[0].content).toContain("## Fake heading in fence");
  });
});

describe("mergeIssue — scenario 1: append // append auto-merges", () => {
  it("unions sections appended on both sides, ours first", () => {
    const ours = BASE + `
## Audit — 2026-08-03

**Verdict:** GO
`;
    const theirs = BASE + `
## Tranche livrée — 2026-08-04

La tranche 2 est en production.
`;

    const result = mergeIssue(BASE, ours, theirs);

    expect(result.conflicts).toEqual([]);
    expect(result.content).toContain("## Audit — 2026-08-03");
    expect(result.content).toContain("## Tranche livrée — 2026-08-04");
    // Base sections survive untouched
    expect(result.content).toContain("## Contexte");
    expect(result.content).toContain("## Definition of done");
    // No markers anywhere
    expect(result.content).not.toContain("<<<<<<<");
  });

  it("merges frontmatter changes on DIFFERENT fields", () => {
    const ours = BASE.replace("status: 3-in-progress", "status: 4-review");
    const theirs = BASE.replace("updated: 2026-08-01", "updated: 2026-08-04");

    const result = mergeIssue(BASE, ours, theirs);

    expect(result.conflicts).toEqual([]);
    expect(result.content).toContain("status: 4-review");
    expect(result.content).toContain("updated: 2026-08-04");
  });

  it("keeps a checklist ticked on one side while the other appends a section", () => {
    const ours = BASE.replace("- [ ] Item one", "- [x] Item one");
    const theirs = BASE + `
## Note mobile

Vue depuis le terrain.
`;

    const result = mergeIssue(BASE, ours, theirs);

    expect(result.conflicts).toEqual([]);
    expect(result.content).toContain("- [x] Item one");
    expect(result.content).toContain("## Note mobile");
  });

  it("takes a field added by one side only", () => {
    const ours = BASE.replace("updated: 2026-08-01", 'updated: 2026-08-01\nbranch: "feat/ISS-0100-x"');
    const result = mergeIssue(BASE, ours, BASE);
    expect(result.conflicts).toEqual([]);
    expect(result.content).toContain("branch: feat/ISS-0100-x");
  });
});

describe("mergeIssue — scenario 2: same frontmatter field diverging conflicts", () => {
  it("keeps a conflict when the SAME field changed differently on both sides", () => {
    const ours = BASE.replace("status: 3-in-progress", "status: 4-review");
    const theirs = BASE.replace("status: 3-in-progress", "status: 1-backlog");

    const result = mergeIssue(BASE, ours, theirs);

    expect(result.conflicts.length).toBe(1);
    expect(result.conflicts[0]).toContain("status");
    expect(result.content).toContain("<<<<<<< ours");
    expect(result.content).toContain("status: 4-review");
    expect(result.content).toContain("status: 1-backlog");
    expect(result.content).toContain(">>>>>>> theirs");
  });

  it("does not conflict when both sides made the SAME change", () => {
    const ours = BASE.replace("status: 3-in-progress", "status: 4-review");
    const theirs = BASE.replace("status: 3-in-progress", "status: 4-review");
    const result = mergeIssue(BASE, ours, theirs);
    expect(result.conflicts).toEqual([]);
    expect(result.content).toContain("status: 4-review");
  });
});

describe("mergeIssue — scenario 3: same section rewritten on both sides conflicts", () => {
  it("keeps a conflict when both sides modified the same section differently", () => {
    const ours = BASE.replace("Le contexte initial.", "Le contexte réécrit par ours.");
    const theirs = BASE.replace("Le contexte initial.", "Le contexte réécrit par theirs.");

    const result = mergeIssue(BASE, ours, theirs);

    expect(result.conflicts.length).toBe(1);
    expect(result.conflicts[0]).toContain("Contexte");
    expect(result.content).toContain("<<<<<<< ours");
    expect(result.content).toContain("réécrit par ours");
    expect(result.content).toContain("réécrit par theirs");
  });

  it("takes the modification when only ONE side rewrote the section", () => {
    const theirs = BASE.replace("Le contexte initial.", "Le contexte précisé.");
    const result = mergeIssue(BASE, BASE, theirs);
    expect(result.conflicts).toEqual([]);
    expect(result.content).toContain("Le contexte précisé.");
    expect(result.content).not.toContain("<<<<<<<");
  });

  it("conflicts when both sides ADD a section with the same heading but different content", () => {
    const ours = BASE + "\n## Audit — 2026-08-04\n\n**Verdict:** GO\n";
    const theirs = BASE + "\n## Audit — 2026-08-04\n\n**Verdict:** NO_GO\n";

    const result = mergeIssue(BASE, ours, theirs);

    expect(result.conflicts.length).toBe(1);
    expect(result.content).toContain("<<<<<<< ours");
  });
});

describe("mergeIssue — real git merge through the driver", () => {
  let fixture: Fixture;

  afterEach(() => {
    if (fixture) fixture.cleanup();
  });

  it("append//append merges without human intervention when the driver is configured", () => {
    fixture = createEmptyFixture();
    const cwd = fixture.cwd;
    const sh = (cmd: string) => execSync(cmd, { cwd, encoding: "utf-8", stdio: "pipe" });

    const fichePath = join(cwd, ".lytos", "issue-board", "4-review");
    mkdirSync(fichePath, { recursive: true });
    const fiche = join(fichePath, "ISS-0100-sample.md");
    writeFileSync(fiche, BASE);
    writeFileSync(join(cwd, ".gitattributes"), ".lytos/issue-board/**/*.md merge=lytos-issue\n");

    sh("git init -b main");
    sh("git config user.email 'test@test.com'");
    sh("git config user.name 'Test'");
    // Point the driver at the built CLI (npx lyt is not on PATH in tests).
    const driver = spawnSync("git", [
      "config", "merge.lytos-issue.driver", `node ${CLI} _merge-issue %O %A %B`,
    ], { cwd });
    expect(driver.status).toBe(0);
    sh("git add -A && git commit -m 'base' --no-gpg-sign");

    // Branch A appends an audit.
    sh("git checkout -b branch-a");
    writeFileSync(fiche, BASE + "\n## Audit — 2026-08-03\n\n**Verdict:** GO\n");
    sh("git add -A && git commit -m 'audit' --no-gpg-sign");

    // Branch B (from main) appends a delivery note.
    sh("git checkout main");
    sh("git checkout -b branch-b");
    writeFileSync(fiche, BASE + "\n## Tranche livrée — 2026-08-04\n\nEn production.\n");
    sh("git add -A && git commit -m 'tranche' --no-gpg-sign");

    // Merge A into B — line-based merge would conflict; the driver must not.
    sh("git merge branch-a --no-gpg-sign -m 'merge a into b'");

    const merged = readFileSync(fiche, "utf-8");
    expect(merged).toContain("## Audit — 2026-08-03");
    expect(merged).toContain("## Tranche livrée — 2026-08-04");
    expect(merged).not.toContain("<<<<<<<");
  });

  it("leaves the file in conflict when the same field diverges", () => {
    fixture = createEmptyFixture();
    const cwd = fixture.cwd;
    const sh = (cmd: string) => execSync(cmd, { cwd, encoding: "utf-8", stdio: "pipe" });

    const ficheDir = join(cwd, ".lytos", "issue-board", "4-review");
    mkdirSync(ficheDir, { recursive: true });
    const fiche = join(ficheDir, "ISS-0100-sample.md");
    writeFileSync(fiche, BASE);
    writeFileSync(join(cwd, ".gitattributes"), ".lytos/issue-board/**/*.md merge=lytos-issue\n");

    sh("git init -b main");
    sh("git config user.email 'test@test.com'");
    sh("git config user.name 'Test'");
    spawnSync("git", ["config", "merge.lytos-issue.driver", `node ${CLI} _merge-issue %O %A %B`], { cwd });
    sh("git add -A && git commit -m 'base' --no-gpg-sign");

    sh("git checkout -b branch-a");
    writeFileSync(fiche, BASE.replace("priority: P1-high", "priority: P0-critical"));
    sh("git add -A && git commit -m 'a' --no-gpg-sign");

    sh("git checkout main");
    sh("git checkout -b branch-b");
    writeFileSync(fiche, BASE.replace("priority: P1-high", "priority: P3-low"));
    sh("git add -A && git commit -m 'b' --no-gpg-sign");

    const merge = spawnSync("git", ["merge", "branch-a", "--no-gpg-sign", "-m", "merge"], {
      cwd, encoding: "utf-8",
    });
    expect(merge.status).not.toBe(0); // conflict maintained

    const conflicted = readFileSync(fiche, "utf-8");
    expect(conflicted).toContain("<<<<<<< ours");
    expect(conflicted).toContain("priority: P0-critical");
    expect(conflicted).toContain("priority: P3-low");
  });
});
