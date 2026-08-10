/**
 * The method must document what it ships (ISS-0127).
 *
 * Six Definition-of-Done items across sprints #04–#06 asked for a convention to
 * be documented, and all six were filed as `verify: human` — so a person had to
 * re-read a file to confirm a string was in it. That is what turned the human
 * gate into a queue: roughly half of what waited on the human was an assertion
 * nobody had written.
 *
 * These are those assertions. They fail when a convention is deleted or gutted,
 * not when its wording is polished — they pin the section that carries the
 * contract and the tokens a reader needs to act on, nothing more.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseGates } from "../../src/lib/quality.js";

const root = process.cwd();
const read = (p: string): string => readFileSync(join(root, p), "utf-8");

const FEATURE_TEMPLATE = "method/issue-board/templates/issue-feature.md";
const TASK_TEMPLATE = "method/issue-board/templates/issue-task.md";
const RULES = "method/rules/default-rules.md";
const KIT = "method/quality/kit.md";
const README = "README.md";

describe("the verify: convention is documented where issues are written (ISS-0101)", () => {
  it.each([FEATURE_TEMPLATE, TASK_TEMPLATE])("%s explains both markers", (path) => {
    const doc = read(path);
    expect(doc).toContain("verify: auto");
    expect(doc).toContain("verify: human");
    // Not just the tokens: the template must say what they mean.
    expect(doc).toMatch(/machine gate/i);
    expect(doc).toMatch(/unmarked items default to auto/i);
  });

  it("the generated rules state who may tick what", () => {
    const rules = read(RULES);
    expect(rules).toMatch(/##\s+An Issue Has Two Gates/);
    expect(rules).toMatch(/only the accountable human/i);
    // The consequence that makes the marker load-bearing in a loop.
    expect(rules).toMatch(/GO_PENDING_HUMAN/);
  });
});

describe("Definition of Ready is defined and documented (ISS-0115)", () => {
  it.each([FEATURE_TEMPLATE, TASK_TEMPLATE])("%s carries a Ready section", (path) => {
    const doc = read(path);
    expect(doc).toMatch(/##\s+Ready/);
    // Out-of-scope is the criterion people skip and the one that prevents parks.
    expect(doc).toMatch(/out of scope/i);
    expect(doc).toContain("risk:");
  });

  it("the generated rules define the criteria and their enforcement", () => {
    const rules = read(RULES);
    expect(rules).toMatch(/###\s+Ready — the entry gate/);
    expect(rules).toMatch(/not-ready/);
    expect(rules).toMatch(/lyt next/);
  });
});

describe("the quality kit documents its own contract (ISS-0107, ISS-0114)", () => {
  const kit = read(KIT);

  it("classifies non-gatable rules as reviewer or human", () => {
    expect(kit).toMatch(/##\s+The three kinds/);
    for (const kind of ["`gate`", "`reviewer`", "`human`"]) expect(kit).toContain(kind);
    // The rule that stops a wish from posing as a gate.
    expect(kit).toMatch(/is not a rule.*it is a wish/i);
  });

  it("every shipped entry declares a kind, and the soft kinds are actually used", () => {
    // Parse it the way the CLI does rather than regexing markdown — this asserts
    // the catalog the tool will actually load, not the shape of the table.
    const kinds = parseGates(kit).map((g) => g.kind);
    expect(kinds.length).toBeGreaterThan(10);
    expect(kinds.every((k) => ["gate", "reviewer", "human"].includes(k))).toBe(true);
    expect(kinds).toContain("reviewer");
    expect(kinds).toContain("human");
  });

  it("explains how to add an executable rule", () => {
    expect(kit).toMatch(/##\s+How to add an executable rule/);
    // A DoD item must be shown pinning a gate by id — that is the wiring step.
    expect(kit).toMatch(/verify: auto:[a-z<]/);
    expect(kit).toMatch(/lyt gates/);
  });

  it("documents the risk floor and the tighten-only contract", () => {
    expect(kit).toMatch(/only tighten/i);
    expect(kit).toMatch(/never loosen below `low`/i);
    // The mechanism, not just the promise: what doctor actually rejects.
    expect(kit).toMatch(/lyt doctor` warns/);
  });
});

describe("shipped commands appear in the public reference (ISS-0124)", () => {
  const readme = read(README);

  it("documents lyt journal and its derived contract", () => {
    expect(readme).toContain("`lyt journal`");
    expect(readme).toMatch(/derived/i);
    expect(readme).toMatch(/--json/);
  });

  it("documents every command the CLI registers", () => {
    // The README drifted eleven commands behind the tool once; this is the guard.
    const verbs = [
      "init", "board", "archive", "lint", "doctor", "show", "start", "move",
      "park", "unpark", "next", "budget", "gates", "report", "journal",
      "pull-notes", "close", "claim", "unclaim", "migrate-frontmatter",
      "absorb", "upgrade", "update",
    ];
    const missing = verbs.filter((v) => !readme.includes(`\`lyt ${v}`));
    expect(missing).toEqual([]);
  });
});
