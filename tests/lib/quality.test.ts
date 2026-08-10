/**
 * Unit tests for the quality kit (ADR-0005/0007, ISS-0107).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  parseGates,
  parseStack,
  validateKit,
  gatesForRisk,
  baselineViolations,
  unresolvedGateRefs,
  type QualityKit,
} from "../../src/lib/quality.js";

const KIT_MD = `# Quality kit

| id | kind | tiers | tool |
|----|------|-------|------|
| tests-unit | gate | low,medium,high | npm test |
| deps-audit | gate | medium,high | npm audit |
| over-engineering | reviewer | medium,high | rubric:oe |
| screen-reader | human | high | checklist:a11y |
`;

describe("parseGates", () => {
  it("parses rows, kinds and tiers; skips header and separator", () => {
    const gates = parseGates(KIT_MD);
    expect(gates.map((g) => g.id)).toEqual(["tests-unit", "deps-audit", "over-engineering", "screen-reader"]);
    expect(gates[0]).toEqual({ id: "tests-unit", kind: "gate", tiers: ["low", "medium", "high"], tool: "npm test" });
    expect(gates[1].tiers).toEqual(["medium", "high"]);
    expect(gates[3].kind).toBe("human");
  });

  it("ignores prose that is not a table", () => {
    expect(parseGates("# Title\n\nno table here\n")).toEqual([]);
  });

  it("ignores a documentation table that is not the gate catalog", () => {
    const withProse = `${KIT_MD}
## The three kinds

| \`kind\` | What it means | Who runs it | Prevents |
|--------|---------------|-------------|----------|
| \`gate\` | A command exits non-zero | CI | drift |
| \`human\` | Needs taste | The human | rubber-stamping |
`;
    expect(parseGates(withProse).map((g) => g.id)).toEqual([
      "tests-unit", "deps-audit", "over-engineering", "screen-reader",
    ]);
  });
});

describe("parseStack", () => {
  it("reads frontmatter and the allowed-dependencies bullets", () => {
    const stack = parseStack(`---\nlockfile: package-lock.json\ndocs_source: vendored\n---\n\n## Allowed dependencies\n\n- commander\n- zod\n`);
    expect(stack.lockfile).toBe("package-lock.json");
    expect(stack.docsSource).toBe("vendored");
    expect(stack.allowedDeps).toEqual(["commander", "zod"]);
  });
});

describe("validateKit", () => {
  const kit = (md: string): QualityKit => ({ gates: parseGates(md), stack: null });

  it("accepts a coherent kit", () => {
    expect(validateKit(kit(KIT_MD))).toEqual([]);
  });

  it("flags invalid kind, invalid tier, missing tiers, duplicate id", () => {
    const bad = `| id | kind | tiers | tool |
|----|------|-------|------|
| a | wizard | low | x |
| b | gate | urgent | y |
| c | gate |  | z |
| a | gate | low | w |
`;
    const problems = validateKit(kit(bad));
    expect(problems.some((p) => p.includes("invalid kind"))).toBe(true);
    expect(problems.some((p) => p.includes("invalid tier"))).toBe(true);
    expect(problems.some((p) => p.includes("no risk tiers"))).toBe(true);
    expect(problems.some((p) => p.includes("duplicate gate id"))).toBe(true);
  });
});

describe("gatesForRisk", () => {
  const kit: QualityKit = { gates: parseGates(KIT_MD), stack: null };

  it("returns the cheap set at low", () => {
    expect(gatesForRisk(kit, "low").map((g) => g.id)).toEqual(["tests-unit"]);
  });

  it("adds the heavier gates at high", () => {
    expect(gatesForRisk(kit, "high").map((g) => g.id)).toEqual([
      "tests-unit", "deps-audit", "over-engineering", "screen-reader",
    ]);
  });
});

describe("unresolvedGateRefs", () => {
  const kit: QualityKit = { gates: parseGates(KIT_MD), stack: null };

  it("finds DoD gate refs absent from the kit", () => {
    const content = "- [ ] x — verify: auto:tests-unit\n- [ ] y — verify: auto:ghost-gate\n";
    expect(unresolvedGateRefs(content, kit)).toEqual(["ghost-gate"]);
  });

  it("returns nothing when all refs resolve", () => {
    expect(unresolvedGateRefs("- [ ] x — verify: auto:deps-audit", kit)).toEqual([]);
  });
});

describe("baselineViolations", () => {
  const kit = (md: string): QualityKit => ({ gates: parseGates(md), stack: null });
  const FLOOR = `| id | kind | tiers | tool |
|----|------|-------|------|
| tests-unit | gate | low,medium,high | npm test |
| typecheck | gate | low,medium,high | tsc |
| lint | gate | low,medium,high | eslint |
| secrets-scan | gate | low,medium,high | gitleaks |
| build-reproducible | gate | low,medium,high | lockfile |
| doc-L0 | gate | low,medium,high | api docs |
`;

  it("accepts the kit shipped by lyt init", () => {
    const shipped = kit(readFileSync(join(process.cwd(), "method/quality/kit.md"), "utf-8"));
    expect(baselineViolations(shipped)).toEqual([]);
    // The file also carries prose tables. parseGates reads any 4-column table,
    // so a documentation table must never be mistaken for a gate catalog.
    expect(validateKit(shipped)).toEqual([]);
    // Every shipped gate must be referenceable from a DoD item. `doc-L0` and
    // `doc-L3` carry an uppercase letter, so this also pins the case handling.
    const refs = shipped.gates.map((g) => `- [ ] x — verify: auto:${g.id}`).join("\n");
    expect(unresolvedGateRefs(refs, shipped)).toEqual([]);
  });

  it("accepts tightening above the floor", () => {
    const tightened = `${FLOOR}| e2e | gate | low,medium,high | playwright |\n| custom | reviewer | high | rubric:x |\n`;
    expect(baselineViolations(kit(tightened))).toEqual([]);
  });

  it("allows dropping a non-floor gate — proportionality is the point", () => {
    const noUi = `${FLOOR}| deps-audit | gate | medium,high | npm audit |\n`;
    expect(baselineViolations(kit(noUi))).toEqual([]);
  });

  it("flags a removed floor gate", () => {
    const missing = FLOOR.split("\n").filter((l) => !l.startsWith("| secrets-scan")).join("\n");
    const problems = baselineViolations(kit(missing));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('baseline gate "secrets-scan" is missing');
  });

  it("flags a floor gate narrowed to the upper tiers", () => {
    const narrowed = FLOOR.replace("| lint | gate | low,medium,high |", "| lint | gate | medium,high |");
    const problems = baselineViolations(kit(narrowed));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('baseline gate "lint" no longer applies at low');
  });

  it("flags a floor gate downgraded to a softer kind", () => {
    const softened = FLOOR.replace("| typecheck | gate |", "| typecheck | human |");
    const problems = baselineViolations(kit(softened));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('downgraded to "human"');
  });
});
