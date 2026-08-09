/**
 * Unit tests for the quality kit (ADR-0005/0007, ISS-0107).
 */

import { describe, it, expect } from "vitest";
import {
  parseGates,
  parseStack,
  validateKit,
  gatesForRisk,
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
