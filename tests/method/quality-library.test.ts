/**
 * The quality library the method ships (ISS-0155): rubrics, checklists, the kit
 * lines that point at them, and the rule on `verify: human`.
 *
 * A kit line that points at a rubric nobody shipped is the failure the kit
 * exists to prevent — a rule that looks enforced and is not — so these tests
 * resolve every pointer against the disk rather than trust the prose.
 */

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { parseGates, baselineViolations, validateKit } from "../../src/lib/quality.js";
import {
  QUALITY_LIBRARY_FILES,
  RUBRIC_NAMES,
  CHECKLIST_NAMES,
} from "../../src/lib/method-files.js";
import { leaksIn } from "../helpers/shipped-content.js";

const root = process.cwd();
const read = (p: string): string => readFileSync(join(root, p), "utf-8");
const KIT = "method/quality/kit.md";
const shipped = { gates: parseGates(read(KIT)), stack: null };
const gate = (id: string) => shipped.gates.find((g) => g.id === id);

function walk(dir: string): string[] {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const rel = `${dir}/${name}`;
    return statSync(join(root, rel)).isDirectory() ? walk(rel) : [rel];
  });
}

describe("the shipped list matches the disk", () => {
  it("lists every file under method/quality/rubrics and checklists, and nothing else", () => {
    const onDisk = [
      ...walk("method/quality/rubrics"),
      ...walk("method/quality/checklists"),
    ].map((p) => p.replace(/^method\//, ""));
    expect([...QUALITY_LIBRARY_FILES].sort()).toEqual(onDisk.sort());
  });

  it("ships the nine rubrics and the four checklists the owner asked for", () => {
    expect([...RUBRIC_NAMES].sort()).toEqual(
      [
        "FORMAT", "architecture", "cost-review", "design-fidelity", "over-engineering",
        "red-team", "security", "tests-negative", "ux",
      ].sort()
    );
    expect([...CHECKLIST_NAMES].sort()).toEqual(
      ["a11y", "intent", "legal-accounting", "real-money"].sort()
    );
  });
});

describe("every pointer of the shipped kit resolves", () => {
  const pointers = shipped.gates
    .map((g) => ({ id: g.id, match: g.tool.match(/^(rubric|checklist):([a-z0-9-]+)/) }))
    .filter((p) => p.match !== null);

  it("has pointers to check", () => {
    expect(pointers.length).toBeGreaterThanOrEqual(10);
  });

  it.each(pointers.map((p) => [p.id, p.match![1], p.match![2]]))(
    "%s -> %s:%s",
    (_id, kind, name) => {
      const dir = kind === "rubric" ? "rubrics" : "checklists";
      expect(existsSync(join(root, `method/quality/${dir}/${name}.md`))).toBe(true);
    }
  );

  it("points reviewer lines at rubrics and human lines at checklists, never crosswise", () => {
    for (const g of shipped.gates) {
      if (g.kind === "reviewer") expect(g.tool).toMatch(/^rubric:/);
      if (g.kind === "human") expect(g.tool).toMatch(/^checklist:/);
    }
  });
});

describe("the new kit lines", () => {
  it.each([
    ["ux-review", "reviewer", ["medium", "high"], "rubric:ux"],
    ["design-fidelity", "reviewer", ["medium", "high"], "rubric:design-fidelity"],
    ["red-team", "reviewer", ["high"], "rubric:red-team"],
    // The owner wants a cheapest-robust-solution study on EVERY card.
    ["cost-review", "reviewer", ["low", "medium", "high"], "rubric:cost-review"],
    ["legal-accounting", "human", ["high"], "checklist:legal-accounting"],
    ["real-money", "human", ["high"], "checklist:real-money"],
  ])("%s is a %s line at %j bound to %s", (id, kind, tiers, tool) => {
    expect(gate(id as string)).toEqual({ id, kind, tiers, tool });
  });

  it("leaves the six floor gates as they were, and the kit coherent", () => {
    for (const id of ["tests-unit", "typecheck", "lint", "secrets-scan", "build-reproducible", "doc-L0"]) {
      expect(gate(id)?.kind).toBe("gate");
      expect(gate(id)?.tiers).toEqual(["low", "medium", "high"]);
    }
    expect(baselineViolations(shipped)).toEqual([]);
    expect(validateKit(shipped)).toEqual([]);
  });

  it("makes cost-review the only reviewer line that applies at low", () => {
    const atLow = shipped.gates.filter((g) => g.kind !== "gate" && g.tiers.includes("low"));
    expect(atLow.map((g) => g.id)).toEqual(["cost-review"]);
  });
});

describe("the kit states the rule on verify: human (ISS-0154)", () => {
  const kit = read(KIT);

  it("has its own section: last resort, always pinned, auto:e2e otherwise", () => {
    expect(kit).toMatch(/##\s+`verify: human` is the last resort/);
    expect(kit).toMatch(/could NOT check it\s+itself, in a browser or with Playwright/);
    expect(kit).toContain("verify: auto:e2e");
    expect(kit).toMatch(/always carries a pin/);
    for (const pin of ["product-intent", "screen-reader", "legal-accounting", "real-money"]) {
      expect(kit).toContain(`human:${pin}`);
    }
    expect(kit).toMatch(/warning, never an error/);
  });
});

describe("the briefing maps the quality library", () => {
  it("LYTOS.md points at the kit, the rubrics and the checklists — and this repo's copy is the same", () => {
    const doc = read("method/LYTOS.md");
    for (const path of ["quality/kit.md", "quality/rubrics/*.md", "quality/checklists/*.md"]) {
      expect(doc).toContain(`\`${path}\``);
    }
    expect(read(".lytos/LYTOS.md")).toBe(doc);
  });
});

describe("the common review format", () => {
  const format = read("method/quality/rubrics/FORMAT.md");

  it.each([
    [/read-only/i, "a review writes no fix"],
    [/severity/i, "a severity"],
    [/confidence/i, "a confidence"],
    [/0\.7/, "below 0.7 nothing is reported"],
    [/evidence/i, "evidence"],
    [/file and line/i, "as file and line"],
    [/scenario/i, "a scenario"],
    [/one sentence/i, "a one-sentence fix"],
    [/What I could not verify/, "what could not be verified"],
    [/comes back twice becomes an automated test/i, "a recurring finding becomes a test"],
  ])("states %s (%s)", (pattern) => {
    expect(format).toMatch(pattern);
  });
});

describe("cost-review: robustness is a floor, cost is the goal", () => {
  const rubric = read("method/quality/rubrics/cost-review.md");

  it("states the rule of choice", () => {
    expect(rubric).toMatch(/Robustness is a FLOOR, cost is the GOAL/);
    expect(rubric).toMatch(/Among the options that pass the\s+floor, keep the cheapest/);
    expect(rubric).toMatch(/cheaper option that fails the floor is discarded, not weighed/);
  });

  it("names the five properties of the floor", () => {
    for (const pattern of [/fails visibly/, /idempotent/, /resumes after a failure/, /undone \(rollback\)/, /isolates failures/]) {
      expect(rubric).toMatch(pattern);
    }
  });

  it("has two moments: a study before the code, conformance at review", () => {
    expect(rubric).toMatch(/Before the code: the solution study/);
    expect(rubric).toContain("Proposed solution");
    expect(rubric).toMatch(/Risk low:\*\* one line/);
    expect(rubric).toMatch(/Risk medium or high:\*\* a table of two or three options/);
    expect(rubric).toMatch(/At review: conformance/);
  });

  it("estimates at 10, 100 and 500 units and names the cost classes and the cost drivers", () => {
    expect(rubric).toContain("10, 100 and 500");
    expect(rubric).toMatch(/constant/);
    expect(rubric).toMatch(/O\(N\)/);
    for (const driver of [/Continuous-integration minutes/, /Platform/, /Human time/, /Moving parts/]) {
      expect(rubric).toMatch(driver);
    }
  });
});

describe("the other grids carry their rule", () => {
  it("architecture: layers, one truth per gesture, SOLID only when it explains a defect", () => {
    const doc = read("method/quality/rubrics/architecture.md");
    expect(doc).toMatch(/Layers/);
    expect(doc).toMatch(/One truth per gesture/);
    expect(doc).toMatch(/SOLID, only when it explains a concrete defect/);
  });

  it("design-fidelity: the four classes of gap", () => {
    const doc = read("method/quality/rubrics/design-fidelity.md");
    for (const cls of [/Fidelity gap/, /Gap justified by what exists/, /Missing from the board/, /Common-sense addition/]) {
      expect(doc).toMatch(cls);
    }
  });

  it("red-team: the eight scenarios, and probes that prove a defect stay out of the suite", () => {
    const doc = read("method/quality/rubrics/red-team.md");
    expect(doc.match(/^\d+\. /gm)).toHaveLength(8);
    expect(doc).toMatch(/\.txt/);
    expect(doc).toMatch(/never\s+enters the test suite/);
  });

  it("every rubric is titled, every checklist names the pin it serves", () => {
    for (const name of RUBRIC_NAMES) {
      if (name === "FORMAT") continue;
      expect(read(`method/quality/rubrics/${name}.md`)).toMatch(/^# Rubric: /);
    }
    for (const name of CHECKLIST_NAMES) {
      expect(read(`method/quality/checklists/${name}.md`)).toMatch(/^# Human list: .*\(`human:[a-z-]+`\)/);
    }
  });
});

describe("what ships carries nothing private", () => {
  // This repository is public, so no list of names is kept here. The check is generic — machine
  // paths, addresses, credentials, private URLs — plus the private terms a maintainer may provide
  // locally (LYTOS_PRIVATE_TERMS, or the git-ignored .lytos/private-terms.local). With neither,
  // that part has nothing to search for and passes. See tests/helpers/shipped-content.ts.
  it.each(walk("method/quality"))("%s", (path) => {
    expect(leaksIn(read(path)), path).toEqual([]);
  });
});

describe("the shipped kit and ADR-0007 agree on the review lines (ISS-0155)", () => {
  const adr = read(".lytos/adr/ADR-0007-risk-tiered-gates-doc-levels-ready.md");
  const kit = read(KIT);

  it("ADR-0007 records cost-review at low as the one deliberate exception", () => {
    expect(adr).toMatch(/Field revision — 2026-11-20/);
    expect(adr).toMatch(/`cost-review`[^.]*the one deliberate exception/);
    expect(adr).toMatch(/Nothing is always-on/);
  });

  it("ADR-0007 scopes ux-review and design-fidelity to projects with an interface", () => {
    expect(adr).toMatch(/`ux-review` and `design-fidelity`[^.]*(?:interface|UI)/);
  });

  it("the kit names the exception, points at the ADR, and tells a project with no interface to drop the UI lines", () => {
    expect(kit).toMatch(/`cost-review` is the one `reviewer` line at `low`/);
    expect(kit).toContain("ADR-0007");
    expect(kit).toMatch(/`ux-review` and\s+`design-fidelity` bite on UI work/);
  });

  it("the README no longer says low gets only the floor", () => {
    for (const path of ["README.md"]) {
      const row = read(path).split("\n").find((l) => l.startsWith("| `lyt gates")) ?? "";
      expect(row, path).toContain("`cost-review`");
      expect(row, path).toContain("ADR-0007");
    }
  });
});
