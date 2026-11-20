/**
 * Unit tests for the independence policy (ADR-0010 §3, ISS-0166): the minimum
 * by risk, the tighten-only rule, and every way a configuration can be wrong.
 */

import { describe, it, expect, afterEach } from "vitest";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { parseConfig } from "../../src/lib/config.js";
import {
  computeIndependence,
  type AiIdentity,
  type IndependenceComputation,
} from "../../src/lib/independence.js";
import {
  DEFAULT_BELOW_MINIMUM,
  DEFAULT_MINIMUM,
  defaultSettings,
  describeMinimum,
  judge,
  meetsMinimum,
  MINIMUMS,
  type IndependenceSettings,
  type Minimum,
} from "../../src/lib/independence-policy.js";
import { loadSettings, settingsFromConfig } from "../../src/lib/independence-settings.js";
import { createEmptyFixture, type Fixture } from "../helpers/fixtures.js";

function settingsOf(yaml: string): IndependenceSettings {
  const parsed = parseConfig(yaml);
  return settingsFromConfig({ ...parsed, path: "config.yml", present: true, unreadable: false });
}

const id = (model: string, session = ""): AiIdentity => ({ model, session });

/** One computation per cell of the ladder. */
const L1 = (session = "") => computeIndependence(id("claude-a", "x"), id("gpt-b", session), defaultSettings());
const L3 = (impSession = "", revSession = "") =>
  computeIndependence(id("claude-a", impSession), id("claude-a", revSession), defaultSettings());
const UNKNOWN = (): IndependenceComputation =>
  computeIndependence(id(""), id(""), defaultSettings());

describe("the defaults (ADR-0010 §3)", () => {
  it("asks nothing at low, a fresh session or another model at medium, level 1 or 2 at high", () => {
    expect(DEFAULT_MINIMUM).toEqual({ low: "any", medium: "fresh-session", high: "level-2" });
  });

  it("only warns at low and medium, and holds a high-risk approval for the owner", () => {
    expect(DEFAULT_BELOW_MINIMUM).toEqual({ low: "warn", medium: "warn", high: "countersign" });
  });

  it("starts with no ranking, the shipped providers and no problem", () => {
    const s = defaultSettings();
    expect(s.ranking).toEqual([]);
    expect(s.providers.length).toBeGreaterThan(5);
    expect(s.problems).toEqual([]);
    expect(s.fromConfig.ranking).toBe(false);
  });

  it("an absent config file, or one with no independence section, changes nothing", () => {
    for (const yaml of ["", "language: fr\nprofile: lead\ndesign: none\n", "independence:\n"]) {
      const s = settingsOf(yaml);
      expect(s.minimum).toEqual(DEFAULT_MINIMUM);
      expect(s.belowMinimum).toEqual(DEFAULT_BELOW_MINIMUM);
      expect(s.problems).toEqual([]);
    }
  });
});

describe("meetsMinimum — every level against every minimum", () => {
  const cases: Array<[string, IndependenceComputation, Record<Minimum, boolean>]> = [
    ["level 1", L1(), { any: true, "fresh-session": true, "level-2": true, "level-1": true }],
    ["level 3, fresh session", L3("a", "b"), { any: true, "fresh-session": true, "level-2": false, "level-1": false }],
    ["level 3, same session", L3("a", "a"), { any: true, "fresh-session": false, "level-2": false, "level-1": false }],
    ["level 3, sessions not recorded", L3("", ""), { any: true, "fresh-session": false, "level-2": false, "level-1": false }],
    ["unknown, sessions not recorded", UNKNOWN(), { any: true, "fresh-session": false, "level-2": false, "level-1": false }],
  ];
  for (const [name, computation, expected] of cases) {
    it(name, () => {
      for (const minimum of MINIMUMS) {
        expect(meetsMinimum(computation, minimum), `${name} vs ${minimum}`).toBe(expected[minimum]);
      }
    });
  }

  it("level 2 passes level-2 and fresh-session, not level-1", () => {
    const s = settingsOf("independence:\n  ranking: [claude-a, claude-b]\n");
    const c = computeIndependence(id("claude-a"), id("claude-b"), s);
    expect(c.level).toBe(2);
    expect(meetsMinimum(c, "fresh-session")).toBe(true);
    expect(meetsMinimum(c, "level-2")).toBe(true);
    expect(meetsMinimum(c, "level-1")).toBe(false);
  });

  it("describes each minimum in words", () => {
    for (const m of MINIMUMS) expect(describeMinimum(m).length).toBeGreaterThan(3);
  });
});

describe("judge — the standing at each risk, with the defaults", () => {
  const s = defaultSettings();

  it("low accepts anything, even an unknown reviewer", () => {
    expect(judge(UNKNOWN(), "low", s).standing).toBe("meets");
    expect(judge(L3("a", "a"), "low", s).standing).toBe("meets");
  });

  it("medium warns below a fresh session and accepts level 3 from a fresh one", () => {
    expect(judge(L3("a", "a"), "medium", s).standing).toBe("below-warn");
    expect(judge(UNKNOWN(), "medium", s).standing).toBe("below-warn");
    expect(judge(L3("a", "b"), "medium", s).standing).toBe("meets");
    expect(judge(L1(), "medium", s).standing).toBe("meets");
  });

  it("high holds every level-3 and unknown review for the owner, fresh session or not", () => {
    expect(judge(L3("a", "b"), "high", s).standing).toBe("needs-countersignature");
    expect(judge(L3("a", "a"), "high", s).standing).toBe("needs-countersignature");
    expect(judge(UNKNOWN(), "high", s).standing).toBe("needs-countersignature");
    expect(judge(L1(), "high", s).standing).toBe("meets");
  });

  it("carries the minimum and the action it applied", () => {
    expect(judge(L3(), "high", s)).toMatchObject({
      risk: "high",
      minimum: "level-2",
      action: "countersign",
      meets: false,
    });
  });
});

describe("configuration — tightening is accepted", () => {
  it("lets a team refuse outright at high risk", () => {
    const s = settingsOf("independence:\n  below_minimum:\n    high: refuse\n");
    expect(s.belowMinimum.high).toBe("refuse");
    expect(s.problems).toEqual([]);
    expect(judge(L3("a", "b"), "high", s).standing).toBe("refused");
    expect(judge(L1(), "high", s).standing).toBe("meets");
    // The shipped defaults are untouched by someone else's configuration.
    expect(judge(L3("a", "b"), "high", defaultSettings()).standing).toBe("needs-countersignature");
  });

  it("lets a team raise the medium minimum and hold medium approvals too", () => {
    const s = settingsOf(
      "independence:\n  minimum:\n    medium: level-2\n  below_minimum:\n    medium: countersign\n"
    );
    expect(s.minimum.medium).toBe("level-2");
    expect(judge(L3("a", "b"), "medium", s).standing).toBe("needs-countersignature");
    expect(s.fromConfig.minimum.medium).toBe(true);
    expect(s.fromConfig.minimum.high).toBe(false);
  });

  it("lets a team ask for level 1 at high risk, and something at low", () => {
    const s = settingsOf(
      "independence:\n  minimum:\n    high: level-1\n    low: fresh-session\n"
    );
    expect(s.minimum).toEqual({ low: "fresh-session", medium: "fresh-session", high: "level-1" });
  });

  it("reads the ranking, normalised, and the providers", () => {
    const s = settingsOf(
      "independence:\n  ranking: [Claude-A, claude-b]\n  providers:\n    acme: Acme-Labs\n"
    );
    expect(s.ranking).toEqual(["claude-a", "claude-b"]);
    expect(s.fromConfig.ranking).toBe(true);
    expect(s.fromConfig.providers).toBe(1);
    expect(s.providers.some((r) => r.prefix === "acme" && r.provider === "acme-labs" && r.origin === "config")).toBe(true);
    expect(s.providers.some((r) => r.prefix === "claude")).toBe(true); // the shipped table stays
  });

  it("a risk with no minimum in the config keeps its default", () => {
    const s = settingsOf("independence:\n  minimum:\n    medium: level-2\n");
    expect(s.minimum.high).toBe("level-2");
    expect(s.minimum.low).toBe("any");
    expect(s.belowMinimum).toEqual(DEFAULT_BELOW_MINIMUM);
  });
});

describe("configuration — loosening is never accepted", () => {
  it("ignores a looser high-risk minimum and says why", () => {
    for (const loose of ["any", "fresh-session"]) {
      const s = settingsOf(`independence:\n  minimum:\n    high: ${loose}\n`);
      expect(s.minimum.high).toBe("level-2");
      expect(s.problems).toHaveLength(1);
      expect(s.problems[0]).toContain("independence.minimum.high");
      expect(s.problems[0]).toContain("may only tighten");
      expect(judge(L3("a", "b"), "high", s).standing).toBe("needs-countersignature");
    }
  });

  it("ignores a looser medium minimum", () => {
    const s = settingsOf("independence:\n  minimum:\n    medium: any\n");
    expect(s.minimum.medium).toBe("fresh-session");
    expect(s.problems[0]).toContain("looser than the default");
  });

  it("ignores `warn` at high risk: a level-3 approval cannot go through alone", () => {
    const s = settingsOf("independence:\n  below_minimum:\n    high: warn\n");
    expect(s.belowMinimum.high).toBe("countersign");
    expect(s.problems[0]).toContain("independence.below_minimum.high");
    expect(judge(L3("a", "b"), "high", s).standing).toBe("needs-countersignature");
  });

  it("accepts a value equal to the default without complaint", () => {
    const s = settingsOf("independence:\n  minimum:\n    high: level-2\n");
    expect(s.problems).toEqual([]);
    expect(s.fromConfig.minimum.high).toBe(true);
  });
});

describe("configuration — invalid values leave the defaults in force", () => {
  it("rejects a minimum that is not one of the known values", () => {
    const s = settingsOf("independence:\n  minimum:\n    high: banana\n");
    expect(s.minimum.high).toBe("level-2");
    expect(s.problems).toEqual([
      'independence.minimum.high: "banana" is not one of any, fresh-session, level-2, level-1 — the default (level-2) stays',
    ]);
  });

  it("rejects an action that is not one of the known values", () => {
    const s = settingsOf("independence:\n  below_minimum:\n    high: shrug\n");
    expect(s.belowMinimum.high).toBe("countersign");
    expect(s.problems[0]).toContain("warn, countersign, refuse");
  });

  it("rejects a risk that does not exist", () => {
    const s = settingsOf("independence:\n  minimum:\n    critical: level-1\n");
    expect(s.problems).toEqual([
      "independence.minimum.critical: not a risk (low, medium, high) — ignored",
    ]);
    expect(s.minimum).toEqual(DEFAULT_MINIMUM);
  });

  it("rejects a list or a nested value where one word is expected", () => {
    const s = settingsOf("independence:\n  minimum:\n    high: [level-1]\n    low:\n      x: y\n");
    expect(s.problems).toHaveLength(2);
    expect(s.minimum).toEqual(DEFAULT_MINIMUM);
  });

  it("rejects a section that is a scalar", () => {
    expect(settingsOf("independence: yes\n").problems[0]).toContain("expected a section");
    expect(settingsOf("independence:\n  minimum: high\n").problems[0]).toContain("expected `low`");
    expect(settingsOf("independence:\n  below_minimum: refuse\n").problems[0]).toContain("expected `low`");
  });

  it("treats a ranking that is not a list as no ranking", () => {
    const s = settingsOf("independence:\n  ranking: claude-a\n");
    expect(s.ranking).toEqual([]);
    expect(s.problems[0]).toContain("expected a list of model ids");
  });

  it("treats a ranking that lists a model twice as no ranking at all", () => {
    const s = settingsOf("independence:\n  ranking: [claude-a, claude-b, Claude-A]\n");
    expect(s.ranking).toEqual([]);
    expect(s.fromConfig.ranking).toBe(false);
    expect(s.problems[0]).toContain('"claude-a" is listed twice');
  });

  it("accepts an explicitly empty ranking: a stated choice, not a mistake", () => {
    const s = settingsOf("independence:\n  ranking: []\n");
    expect(s.ranking).toEqual([]);
    expect(s.problems).toEqual([]);
    expect(s.fromConfig.ranking).toBe(true);
    const c = computeIndependence(id("claude-a"), id("claude-b"), s);
    expect(c.level).toBe(3); // an empty ranking never makes anything stronger
  });

  it("ignores a provider entry that is not a prefix and a name", () => {
    const s = settingsOf(
      "independence:\n  providers:\n    ok: fine\n    'bad key!': x\n    nested:\n      a: b\n"
    );
    expect(s.fromConfig.providers).toBe(1);
    expect(s.problems).toHaveLength(2);
  });

  it("ignores providers that is not a map", () => {
    const s = settingsOf("independence:\n  providers: [a, b]\n");
    expect(s.problems[0]).toContain("independence.providers");
    expect(s.providers.length).toBe(defaultSettings().providers.length);
  });

  it("reports the lines the reader skipped", () => {
    const s = settingsOf("independence:\n\tminimum: x\nlanguage: fr\n");
    expect(s.problems.some((p) => p.includes("line 2") && p.includes("tab"))).toBe(true);
  });

  it("an unreadable config file leaves the defaults and says so", () => {
    const s = settingsFromConfig({
      data: {},
      ignored: [],
      path: "config.yml",
      present: true,
      unreadable: true,
    });
    expect(s.minimum).toEqual(DEFAULT_MINIMUM);
    expect(s.problems).toEqual([".lytos/config.yml could not be read — the defaults apply"]);
  });
});

describe("loadSettings", () => {
  let fixture: Fixture;
  afterEach(() => fixture?.cleanup());

  it("reads .lytos/config.yml from disk", () => {
    fixture = createEmptyFixture();
    mkdirSync(join(fixture.cwd, ".lytos"));
    writeFileSync(
      join(fixture.cwd, ".lytos", "config.yml"),
      "language: fr\nindependence:\n  below_minimum:\n    high: refuse\n"
    );
    const s = loadSettings(join(fixture.cwd, ".lytos"));
    expect(s.belowMinimum.high).toBe("refuse");
    expect(s.config.present).toBe(true);
  });

  it("returns the defaults when there is no file", () => {
    fixture = createEmptyFixture();
    const s = loadSettings(join(fixture.cwd, ".lytos"));
    expect(s.minimum).toEqual(DEFAULT_MINIMUM);
    expect(s.config.present).toBe(false);
  });
});
