/**
 * ISS-0176, F4 — a configuration cannot raise the computed level silently.
 *
 * ADR-0010 says the defaults are the floor and a project can only tighten. The
 * provider table is the one setting that is NOT a tightening: a project may
 * add models and may override the mapping. The rule that reconciles the two:
 * a config entry that REASSIGNS a model the shipped table already maps to a
 * different provider is reported (packet, `lyt gates`, `lyt doctor`), the
 * level it produces says it relied on an override, and at risk HIGH it is
 * never counted: the minimum is checked against the shipped mapping.
 * New and unknown models can still be added freely.
 */

import { describe, it, expect } from "vitest";
import { parseConfig } from "../../src/lib/config.js";
import {
  computeIndependence,
  type AiIdentity,
} from "../../src/lib/independence.js";
import {
  matchesPrefix,
  reassignmentOf,
  resolveProvider,
  SHIPPED_PROVIDERS,
  type ProviderRule,
} from "../../src/lib/independence-providers.js";
import { judge, type IndependenceSettings } from "../../src/lib/independence-policy.js";
import { settingsFromConfig } from "../../src/lib/independence-settings.js";
import { planIndependence, IndependenceError } from "../../src/lib/independence-plan.js";
import { describeIndependence } from "../../src/lib/independence-view.js";

const settingsOf = (yaml: string): IndependenceSettings =>
  settingsFromConfig({ ...parseConfig(yaml), path: "config.yml", present: true, unreadable: false });

const id = (model: string, session = ""): AiIdentity => ({ model, session });

/** The malicious reassignment of the review: opus is "someoneelse". */
const MALICIOUS = "independence:\n  providers:\n    claude-opus: someoneelse\n";

/** The pair the review used: both Anthropic, so level 3 unless the table is bent. */
const sonnet = id("claude-sonnet-4", "s1");
const opus = id("claude-opus-4", "s2");

describe("a malicious reassignment of a shipped model", () => {
  const settings = settingsOf(MALICIOUS);

  it("is reported as a problem, naming the shipped provider", () => {
    expect(settings.problems).toHaveLength(1);
    expect(settings.problems[0]).toContain("independence.providers.claude-opus");
    expect(settings.problems[0]).toContain("reassigns");
    expect(settings.problems[0]).toContain('"anthropic"');
    expect(settings.problems[0]).toContain('"someoneelse"');
    expect(settings.problems[0]).toContain("risk high");
  });

  it("is still applied below high risk, and the level says it relied on an override", () => {
    const c = computeIndependence(sonnet, opus, settings);
    expect(c.level).toBe(1);
    expect(c.basis).toBe("different-provider");
    expect(c.overrides).toHaveLength(1);
    expect(c.flags.some((f) => f.startsWith("provider override:"))).toBe(true);
    const flag = c.flags.find((f) => f.startsWith("provider override:"))!;
    expect(flag).toContain("claude-opus-4");
    expect(flag).toContain("someoneelse");
    expect(flag).toContain("anthropic");
    expect(c.reviewer.override).toEqual({ prefix: "claude-opus", from: "anthropic", to: "someoneelse" });
    expect(c.implementer.override).toBeNull();
  });

  it("keeps the shipped-mapping level next to it: level 3 for this pair", () => {
    const c = computeIndependence(sonnet, opus, settings);
    expect(c.shipped).toEqual({ level: 3, effectiveLevel: 3 });
  });

  it("never lifts a review to level 1 by itself at HIGH risk", () => {
    const c = computeIndependence(sonnet, opus, settings);
    const j = judge(c, "high", settings);
    expect(j.meets).toBe(false);
    expect(j.standing).toBe("needs-countersignature");
    expect(j.overrideIgnored).toBe(true);
    expect(j.appliedLevel).toBe("3");
  });

  it("counts at medium and low, flagged: the project said what it said", () => {
    const c = computeIndependence(sonnet, opus, settings);
    for (const risk of ["low", "medium"] as const) {
      const j = judge(c, risk, settings);
      expect(j.meets).toBe(true);
      expect(j.overrideIgnored).toBe(false);
      expect(j.appliedLevel).toBe("1");
    }
  });

  it("is also held at high when a team tightens the minimum to level-1", () => {
    const strict = settingsOf(`${MALICIOUS}  minimum:\n    high: level-1\n`);
    const c = computeIndependence(sonnet, opus, strict);
    expect(judge(c, "high", strict).meets).toBe(false);
  });

  it("is refused by the write-time rule at high risk, and the message says why", () => {
    const fm = { id: "ISS-1", risk: "high", ai_implementer: { model: "claude-sonnet-4", session: "s1" } };
    const plan = (countersign: boolean) =>
      planIndependence({
        fm,
        verdict: "go",
        reviewer: opus,
        countersign,
        settings,
        user: "alice",
        date: "2026-11-20",
      });
    let error: unknown;
    try {
      plan(false);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(IndependenceError);
    const message = (error as IndependenceError).message;
    expect(message).toContain("level 3");
    expect(message).toContain("provider override");
    // The way through is the countersignature, recorded at the level that counted.
    const record = plan(true).set.review_independence as Record<string, string>;
    expect(record.level).toBe("3");
    expect(record.countersigned_as).toBe("weak independence");
  });

  it("shows in the packet view: the override, the applied level, the standing", () => {
    const view = describeIndependence(
      "/nonexistent/.lytos",
      {
        id: "ISS-1",
        risk: "high",
        ai_implementer: { model: "claude-sonnet-4", session: "s1" },
        ai_reviewer: { model: "claude-opus-4", session: "s2" },
        review: "go",
      },
      settings
    );
    expect(view.level).toBe(1);
    expect(view.appliedLevel).toBe("3");
    expect(view.overrideIgnored).toBe(true);
    expect(view.overrides[0]).toContain("claude-opus-4");
    expect(view.standing).toBe("needs-countersignature");
    expect(view.opposable).toBe(false);
    expect(view.configProblems).toEqual(settings.problems);
    expect(view.decide.join(" ")).toContain("provider override");
  });

  it("does not make a later report disagree with the record the CLI wrote", () => {
    const view = describeIndependence(
      "/nonexistent/.lytos",
      {
        id: "ISS-1",
        risk: "high",
        ai_implementer: { model: "claude-sonnet-4", session: "s1" },
        ai_reviewer: { model: "claude-opus-4", session: "s2" },
        review: "go",
        review_independence: {
          level: "3",
          risk: "high",
          minimum: "level-2",
          countersigned_by: "alice",
          countersigned_at: "2026-11-20",
          countersigned_as: "weak independence",
        },
      },
      settings
    );
    expect(view.drift).toEqual([]);
    expect(view.standing).toBe("countersigned");
  });
});

describe("what a configuration may still do with the provider table", () => {
  it("adds a model the shipped table does not know, freely, even at high risk", () => {
    const s = settingsOf("independence:\n  providers:\n    acme: acme-labs\n");
    expect(s.problems).toEqual([]);
    const c = computeIndependence(id("claude-opus-4"), id("acme-7"), s);
    expect(c.level).toBe(1);
    expect(c.overrides).toEqual([]);
    expect(judge(c, "high", s).meets).toBe(true);
    expect(judge(c, "high", s).overrideIgnored).toBe(false);
  });

  it("gives an unknown model a provider, freely", () => {
    const s = settingsOf("independence:\n  providers:\n    homegrown: homegrown\n");
    const c = computeIndependence(id("claude-opus-4"), id("homegrown-1"), s);
    expect(c.basis).toBe("different-provider");
    expect(judge(c, "high", s).meets).toBe(true);
  });

  it("restating the shipped mapping is not a reassignment", () => {
    const s = settingsOf("independence:\n  providers:\n    claude: anthropic\n    gpt-5: openai\n");
    expect(s.problems).toEqual([]);
    const c = computeIndependence(id("claude-opus-4"), id("gpt-5"), s);
    expect(c.overrides).toEqual([]);
    expect(c.shipped).toBeNull();
  });

  it("a reassignment that LOWERS the level is harmless, and is still reported", () => {
    // gpt reassigned to anthropic: claude vs gpt is no longer two providers.
    const s = settingsOf("independence:\n  providers:\n    gpt: anthropic\n");
    expect(s.problems).toHaveLength(1);
    const c = computeIndependence(id("claude-opus-4"), id("gpt-big"), s);
    expect(c.level).toBe(3);
    expect(c.shipped?.effectiveLevel).toBe(1);
    const j = judge(c, "high", s);
    expect(j.overrideIgnored).toBe(false); // the stricter reading stands
    expect(j.appliedLevel).toBe("3");
    expect(j.meets).toBe(false);
  });

  it("catches the reassignment on the implementer side too", () => {
    const s = settingsOf("independence:\n  providers:\n    claude-sonnet: someoneelse\n");
    const c = computeIndependence(sonnet, opus, s);
    expect(c.level).toBe(1);
    expect(c.implementer.override).toMatchObject({ from: "anthropic", to: "someoneelse" });
    expect(judge(c, "high", s).meets).toBe(false);
  });

  it("catches a whole-family reassignment that changes nothing about this pair, and reports it", () => {
    const s = settingsOf("independence:\n  providers:\n    claude: someoneelse\n");
    expect(s.problems).toHaveLength(1);
    const c = computeIndependence(id("claude-a"), id("claude-b"), s);
    expect(c.level).toBe(3); // both someoneelse: the same provider
    expect(c.overrides).toHaveLength(2);
  });

  it("normalises case and spaces: a disguised prefix is the same prefix", () => {
    const s = settingsOf('independence:\n  providers:\n    "  CLAUDE-OPUS ": " SomeoneElse "\n');
    expect(s.problems).toHaveLength(1);
    const c = computeIndependence(sonnet, opus, s);
    expect(judge(c, "high", s).meets).toBe(false);
  });

  it("catches a more specific prefix: an exact version, or a trailing dash", () => {
    for (const prefix of ["claude-opus-4", "claude-opus-", "claude-opus-4-7"]) {
      const s = settingsOf(`independence:\n  providers:\n    ${prefix}: someoneelse\n`);
      expect(s.problems, prefix).toHaveLength(1);
      const c = computeIndependence(sonnet, id("claude-opus-4-7"), s);
      expect(judge(c, "high", s).meets, prefix).toBe(false);
    }
  });

  it("two reassignments, one on each side, are both shown and both ignored at high risk", () => {
    const s = settingsOf(
      "independence:\n  providers:\n    claude-opus: a\n    claude-sonnet: b\n"
    );
    const c = computeIndependence(sonnet, opus, s);
    expect(c.overrides).toHaveLength(2);
    expect(judge(c, "high", s).meets).toBe(false);
  });
});

describe("the static check is exact: any provider change for a shipped model is reported", () => {
  const models = ["claude-opus-4", "claude-sonnet-4", "claude", "gpt-5", "o3-mini", "gemini-2-pro", "llama-3", "grok-4", "qwen3-coder"];
  const prefixes = ["claude", "claude-opus", "claude-opus-4", "claude-", "gpt", "gpt-5", "o", "o3", "o3-mini", "gemini", "llama", "l", "cl", "grok-4", "qwen", "qwen3"];
  const providers = ["anthropic", "openai", "someoneelse"];

  it("holds for every model, prefix and provider of the table", () => {
    let reassigned = 0;
    for (const model of models) {
      for (const prefix of prefixes) {
        for (const provider of providers) {
          const rule: ProviderRule = { prefix, provider, origin: "config" };
          const before = resolveProvider(model, SHIPPED_PROVIDERS);
          const after = resolveProvider(model, [...SHIPPED_PROVIDERS, rule]);
          const changed = !!before && !!after && before.provider !== after.provider;
          const c = computeIndependence(id(model), id("homegrown-1"), {
            ranking: [],
            providers: [...SHIPPED_PROVIDERS, rule],
          });
          const label = `${model} / ${prefix} -> ${provider}`;
          expect(c.implementer.override !== null, label).toBe(changed);
          if (changed) {
            reassigned++;
            expect(reassignmentOf(rule), label).not.toBeNull();
          }
          // A rule that never matches the model is never an override on it.
          if (!matchesPrefix(model, prefix)) expect(c.implementer.override, label).toBeNull();
        }
      }
    }
    expect(reassigned).toBeGreaterThan(20);
  });

  it("never reports a shipped rule, or a rule on a model the table does not know", () => {
    expect(SHIPPED_PROVIDERS.every((r) => reassignmentOf(r) === null)).toBe(true);
    expect(reassignmentOf({ prefix: "acme", provider: "x", origin: "config" })).toBeNull();
    expect(reassignmentOf({ prefix: "claude", provider: "anthropic", origin: "config" })).toBeNull();
    expect(reassignmentOf({ prefix: "claude", provider: "x", origin: "config" })).toMatchObject({
      provider: "anthropic",
    });
  });
});
