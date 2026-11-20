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
import { analyzeReady } from "../../src/lib/ready.js";
import { parseFrontmatter } from "../../src/lib/frontmatter.js";

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

describe("the three verify: modes are documented where they are written (ISS-0153)", () => {
  it.each([FEATURE_TEMPLATE, TASK_TEMPLATE])("%s names reviewer and the pin", (path) => {
    const doc = read(path);
    expect(doc).toContain("verify: reviewer");
    expect(doc).toMatch(/pin/i);
  });

  it("an unmarked item counts as auto, so the rules and templates say `no auto or unmarked item`", () => {
    // `machine = auto + unmarked` in dod.ts: "no `auto` item" alone would be inexact.
    for (const path of [RULES, FEATURE_TEMPLATE, ".lytos/rules/cli-rules.md"]) {
      expect(read(path), path).toMatch(/no `auto` \(or unmarked\) item/);
    }
  });

  it("a pin is the id of a kit line, not the name of a rubric or a checklist file", () => {
    for (const path of [RULES, ".lytos/rules/cli-rules.md"]) {
      expect(read(path), path).toMatch(/id of a (quality-)?kit line/);
    }
    expect(read(".lytos/rules/cli-rules.md")).not.toMatch(/reviewer:<rubric>|human:<checklist>/);
  });

  it("the rules name the reasons `lyt next` refuses a DoD for", () => {
    const rules = read(RULES);
    expect(rules).toContain("`all-human-dod`");
    expect(rules).toContain("`no-machine-dod`");
  });

  it("the generated rules give reviewer its own row and its own owner", () => {
    const rules = read(RULES);
    expect(rules).toContain("`— verify: reviewer`");
    expect(rules).toMatch(/auditing model/i);
    expect(rules).toMatch(/reviewer:over-engineering/);
  });

  it("the generated rules state the human rule: last resort, always pinned, e2e otherwise (ISS-0154)", () => {
    const rules = read(RULES);
    expect(rules).toMatch(/`verify: human` is the last resort, and it always carries a pin/);
    expect(rules).toMatch(/could not check it themselves/);
    expect(rules).toContain("verify: auto:e2e");
    expect(rules).toMatch(/lyt lint` warns/);
  });

  it("ADR-0004 records the marker grammar and the eligibility decision", () => {
    const adr = read(".lytos/adr/ADR-0004-autonomous-loop-under-governance.md");
    expect(adr).toContain("verify: (auto|reviewer|human)[:pin]");
    expect(adr).toMatch(/`reviewer` does \*\*not\*\* count as machine-verifiable/);
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

describe("the card templates carry the solution study (ISS-0156)", () => {
  it("issue-feature.md has the study under Proposed solution, and a Solution line in Ready", () => {
    const doc = read(FEATURE_TEMPLATE);
    const proposed = doc.slice(doc.indexOf("## Proposed solution"), doc.indexOf("## Ready"));
    expect(proposed).toMatch(/Solution study \(rubric `cost-review`\) — written BEFORE any code/);
    expect(proposed).toMatch(/Risk low: one line/);
    expect(proposed).toMatch(/Risk medium or high: a table of two or three options/);
    expect(proposed).toContain("10 / 100 / 500");
    expect(proposed).toMatch(/robustness floor/);
    expect(proposed).toMatch(/\*\*Decision:\*\* the cheapest option that passes/);
    const ready = doc.slice(doc.indexOf("## Ready"), doc.indexOf("## Definition of done"));
    expect(ready).toMatch(/- \*\*Solution\*\* — the study above is written/);
  });

  it("issue-task.md has a one-line Solution in Ready", () => {
    const doc = read(TASK_TEMPLATE);
    const ready = doc.slice(doc.indexOf("## Ready"), doc.indexOf("## Definition of done"));
    expect(ready).toMatch(/- \*\*Solution\*\* — one line: the cheapest option that stays robust/);
  });

  it("the Solution line does not disturb the Ready analysis", () => {
    // A card filled from either template is still ready when its three labels are set —
    // and still not ready when they are not. `lyt next` never reads the Solution line.
    const fill = (tpl: string, effort: string): { content: string; fm: ReturnType<typeof parseFrontmatter> } => {
      const body = tpl
        .replace(/^---[\s\S]*?\n---\n/, "")
        .replace("- **Out of scope** — what this task explicitly does NOT touch.", "- **Out of scope** — the world.")
        .replace("- **Out of scope** — what it explicitly does NOT do.", "- **Out of scope** — the world.")
        .replace("- **Scope** — what this issue does, in one line.", "- **Scope** — one thing.")
        .replace("- **Constraints** — what it must respect.", "- **Constraints** — none.")
        .replace("- [ ] Verifiable criterion — verify: auto", "- [ ] A thing — verify: auto")
        .replace("- [ ] Verifiable criterion 1 — verify: auto", "- [ ] A thing — verify: auto");
      const content = `---\nid: ISS-0001\ntitle: t\neffort: ${effort}\nrisk: low\nstatus: 2-sprint\n---\n${body}`;
      return { content, fm: parseFrontmatter(content) };
    };
    for (const [path, effort] of [[FEATURE_TEMPLATE, "M"], [TASK_TEMPLATE, "S"]] as const) {
      const { content, fm } = fill(read(path), effort);
      expect(analyzeReady(content, fm!), path).toEqual({ ready: true, missing: [] });
      const unfilled = content.replace("**Out of scope** — the world.", "**Out of scope** —");
      expect(analyzeReady(unfilled, fm!).missing, path).toContain("no-out-of-scope");
    }
  });

  it("the default rules say where the study lives and who checks it", () => {
    const rules = read(RULES);
    expect(rules).toMatch(/\*\*solution study\*\* in its "Proposed solution", written before any code/);
    expect(rules).toMatch(/`cost-review` review checks it/);
  });

  it("this repo's own template copies are the shipped ones", () => {
    for (const name of ["issue-feature.md", "issue-task.md"]) {
      expect(read(`.lytos/issue-board/templates/${name}`)).toBe(read(`method/issue-board/templates/${name}`));
    }
    expect(read(".lytos/rules/default-rules.md")).toBe(read(RULES));
  });
});

describe("the READMEs describe the 1.6 surface (ISS-0158, ISS-0153, ISS-0154)", () => {
  it.each([
    ["README.md", /Do you use Claude Design for design\?/],
    ["docs/fr/README.md", /Utilisez-vous Claude Design pour le design \?/],
  ])("%s documents the optional design question and --design", (path, question) => {
    const doc = read(path);
    expect(doc).toMatch(question);
    expect(doc).toContain("--design <claude-design|other|none>");
    expect(doc).toContain(".lytos/design/registry.md");
    expect(doc).toMatch(/design:/);
    // The promise that matters: it is never a brake.
    expect(doc).toMatch(/never a brake|jamais un frein/i);
  });

  it.each(["README.md", "docs/fr/README.md"])("%s says an unmarked item counts as auto", (path) => {
    const doc = read(path);
    expect(doc).toMatch(/unmarked item counts as `auto`|item non marqué compte comme `auto`/);
    expect(doc).not.toMatch(/with no `auto` item is not loop work|sans item `auto` n'est pas/);
  });

  it("the README documents the reasons `lyt next --json` gives", () => {
    const row = read("README.md").split("\n").find((l) => l.startsWith("| `lyt next`")) ?? "";
    for (const reason of ["deps-pending", "no-dod", "all-human-dod", "no-machine-dod", "not-ready"]) {
      expect(row, reason).toContain(reason);
    }
  });

  it.each(["README.md", "docs/fr/README.md"])("%s documents the three verify: markers and the human rule", (path) => {
    const doc = read(path);
    for (const marker of ["verify: auto", "verify: reviewer", "verify: human"]) expect(doc).toContain(marker);
    expect(doc).toContain("verify: human:product-intent");
    expect(doc).toContain("verify: auto:e2e");
  });
});
