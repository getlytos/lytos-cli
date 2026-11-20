/**
 * `lyt gates` and `lyt doctor` read the independence settings too (ADR-0010,
 * Consequences; ISS-0166).
 */

import { describe, it, expect, afterEach } from "vitest";
import { spawnSync } from "child_process";
import { mkdirSync, writeFileSync } from "fs";
import { resolve, join } from "path";
import { createEmptyFixture, type Fixture } from "../helpers/fixtures.js";

const CLI = resolve(__dirname, "../../dist/cli.js");

function run(args: string[], cwd: string) {
  const r = spawnSync("node", [CLI, ...args], { cwd, encoding: "utf-8" });
  return { stdout: r.stdout || "", stderr: r.stderr || "", exitCode: r.status ?? 0 };
}

let fixture: Fixture;
afterEach(() => fixture?.cleanup());

const KIT =
  "# Kit\n| id | kind | tiers | tool |\n|----|------|-------|------|\n| tests-unit | gate | low,medium,high | npm test |\n";

function project(front: string, config?: string): string {
  fixture = createEmptyFixture();
  const cwd = fixture.cwd;
  const lyt = (p: string) => join(cwd, ".lytos", p);
  mkdirSync(lyt("quality"), { recursive: true });
  mkdirSync(lyt("issue-board/2-sprint"), { recursive: true });
  writeFileSync(lyt("quality/kit.md"), KIT);
  if (config !== undefined) writeFileSync(lyt("config.yml"), config);
  writeFileSync(
    lyt("issue-board/2-sprint/ISS-0001-x.md"),
    `---\nid: ISS-0001\ntitle: "x"\nstatus: 2-sprint\ncreated: 2026-11-01\n${front}---\n\n# ISS-0001\n`
  );
  return cwd;
}

describe("lyt gates — the independence minimum", () => {
  it("prints the minimum for each risk in the whole matrix", () => {
    const cwd = project("");
    const json = JSON.parse(run(["gates", "--json"], cwd).stdout);
    expect(json.matrix.map((m: { independence: unknown }) => m.independence)).toEqual([
      { minimum: "any", belowMinimum: "warn" },
      { minimum: "fresh-session", belowMinimum: "warn" },
      { minimum: "level-2", belowMinimum: "countersign" },
    ]);
    expect(json.independenceProblems).toEqual([]);
    expect(run(["gates"], cwd).stderr).toContain("level 1 or 2; below it: countersign");
  });

  it("shows the card's risk, level and standing", () => {
    const cwd = project(
      "risk: high\nai_implementer:\n  model: claude-opus-x\nai_reviewer:\n  model: gpt-big\n"
    );
    const json = JSON.parse(run(["gates", "ISS-0001", "--json"], cwd).stdout);
    expect(json.independence).toMatchObject({
      risk: "high",
      level: 1,
      minimum: "level-2",
      belowMinimum: "countersign",
      meetsMinimum: true,
      standing: "meets",
    });
  });

  it("reads the minimum from the project's config, never below the default", () => {
    const cwd = project(
      "risk: medium\n",
      "independence:\n  minimum:\n    medium: level-2\n    high: any\n"
    );
    const json = JSON.parse(run(["gates", "ISS-0001", "--json"], cwd).stdout);
    expect(json.independence.minimum).toBe("level-2");
    const matrix = JSON.parse(run(["gates", "--json"], cwd).stdout);
    expect(matrix.matrix[2].independence.minimum).toBe("level-2");
    expect(matrix.independenceProblems[0]).toContain("independence.minimum.high");
  });

  it("describes a card whose models are not recorded as unknown, treated as 3", () => {
    const cwd = project("risk: high\n");
    const out = run(["gates", "ISS-0001"], cwd).stderr;
    expect(out).toContain("level unknown (treated as level 3)");
    expect(out).toContain("needs-countersignature");
  });

  it("surfaces configuration problems", () => {
    const cwd = project("risk: high\n", "independence:\n  minimum:\n    high: banana\n");
    expect(run(["gates", "ISS-0001"], cwd).stderr).toContain("independence.minimum.high");
  });
});

describe("a provider override on a shipped model is reported everywhere (ISS-0176, F4)", () => {
  const OVERRIDE = "independence:\n  providers:\n    claude-opus: someoneelse\n";
  const CARD =
    "risk: high\nai_implementer:\n  model: claude-sonnet-4\n  session: s1\nai_reviewer:\n  model: claude-opus-4\n  session: s2\n";

  it("lyt gates: a problem in the matrix and on the card, and the card is held at high risk", () => {
    const cwd = project(CARD, OVERRIDE);
    const matrix = JSON.parse(run(["gates", "--json"], cwd).stdout);
    expect(matrix.independenceProblems[0]).toContain("reassigns");
    const json = JSON.parse(run(["gates", "ISS-0001", "--json"], cwd).stdout);
    expect(json.independence.problems[0]).toContain("reassigns");
    expect(json.independence.meetsMinimum).toBe(false);
    expect(json.independence.standing).toBe("needs-countersignature");
    expect(json.independence.flags.join(" ")).toContain("provider override");
  });

  it("lyt doctor: a warning", () => {
    const cwd = project("", OVERRIDE);
    const out = JSON.parse(run(["doctor", "--json"], cwd).stdout);
    const found = (out.findings as Array<{ category: string; message: string }>).filter(
      (f) => f.category === "independence-config"
    );
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain("reassigns");
  });

  it("an unknown key in the independence section is reported, never crashes", () => {
    const cwd = project(
      "",
      "independence:\n  rankng: [a]\n  constructor: x\n  __proto__:\n    minimum: any\n  toString: y\n"
    );
    const out = JSON.parse(run(["doctor", "--json"], cwd).stdout);
    const messages = (out.findings as Array<{ category: string; message: string }>)
      .filter((f) => f.category === "independence-config")
      .map((f) => f.message)
      .join("\n");
    for (const key of ["rankng", "constructor", "__proto__", "toString"]) {
      expect(messages, key).toContain(`independence.${key}: unknown setting`);
    }
    expect(messages).not.toContain("duplicate");
    const json = JSON.parse(run(["gates", "--json"], cwd).stdout);
    expect(json.matrix[2].independence.minimum).toBe("level-2");
  });
});

describe("lyt doctor — the independence settings", () => {
  it("says nothing when there is no config, or a config with no independence section", () => {
    for (const config of [undefined, "language: fr\nprofile: lead\ndesign: none\n"]) {
      const cwd = project("", config);
      const out = JSON.parse(run(["doctor", "--json"], cwd).stdout);
      const findings = (out.findings ?? []) as Array<{ category: string }>;
      expect(findings.filter((f) => f.category === "independence-config")).toEqual([]);
    }
  });

  it("warns about each setting it could not use", () => {
    const cwd = project(
      "",
      "independence:\n  minimum:\n    high: any\n    low: banana\n  below_minimum:\n    critical: refuse\n"
    );
    const out = JSON.parse(run(["doctor", "--json"], cwd).stdout);
    const findings = (out.findings as Array<{ category: string; severity: string; message: string }>).filter(
      (f) => f.category === "independence-config"
    );
    expect(findings).toHaveLength(3);
    expect(findings.every((f) => f.severity === "warning")).toBe(true);
    expect(findings.map((f) => f.message).join(" ")).toContain("may only tighten");
  });
});
