/**
 * Unit tests for the independence level (ADR-0010, ISS-0166): the three levels
 * from the two recorded identities, and every way the answer is NOT a better
 * level than the evidence allows.
 */

import { describe, it, expect } from "vitest";
import {
  computeIndependence,
  identityOf,
  levelLabel,
  type AiIdentity,
  type ComputeSettings,
} from "../../src/lib/independence.js";
import {
  matchesPrefix,
  resolveProvider,
  SHIPPED_PROVIDERS,
  type ProviderRule,
} from "../../src/lib/independence-providers.js";

const NO_RANKING: ComputeSettings = {
  ranking: [],
  providers: SHIPPED_PROVIDERS,
};

/** A ranking weakest first; `claude-*` and `gpt-*` come from the shipped table. */
const RANKED: ComputeSettings = {
  ranking: ["claude-haiku-x", "claude-sonnet-x", "claude-opus-x", "gpt-small", "gpt-big"],
  providers: SHIPPED_PROVIDERS,
};

const id = (model: string, session = ""): AiIdentity => ({ model, session });

describe("level 1 — a different provider", () => {
  it("is level 1 for two models of two shipped providers", () => {
    const c = computeIndependence(id("claude-opus-x"), id("gpt-big"), NO_RANKING);
    expect(c.level).toBe(1);
    expect(c.effectiveLevel).toBe(1);
    expect(c.basis).toBe("different-provider");
    expect(c.flags).toEqual([]);
  });

  it("does not depend on the ranking or on the sessions", () => {
    const c = computeIndependence(id("gemini-2-pro", "s"), id("claude-haiku-x", "s"), RANKED);
    expect(c.level).toBe(1);
    expect(c.freshSession).toBe(false);
  });

  it("uses a provider the project configured", () => {
    const rules: ProviderRule[] = [
      ...SHIPPED_PROVIDERS,
      { prefix: "acme", provider: "acme-labs", origin: "config" },
    ];
    const c = computeIndependence(id("claude-opus-x"), id("acme-7"), {
      ranking: [],
      providers: rules,
    });
    expect(c.level).toBe(1);
    expect(c.reviewer.providerOrigin).toBe("config");
  });
});

describe("level 2 — the same provider, a stronger model", () => {
  it("is level 2 when the ranking puts the reviewer above the implementer", () => {
    const c = computeIndependence(id("claude-sonnet-x"), id("claude-opus-x"), RANKED);
    expect(c.level).toBe(2);
    expect(c.basis).toBe("stronger-model");
  });

  it("is level 3 when the reviewer is ranked BELOW the implementer", () => {
    const c = computeIndependence(id("claude-opus-x"), id("claude-haiku-x"), RANKED);
    expect(c.level).toBe(3);
    expect(c.basis).toBe("not-stronger");
    expect(c.reason).toContain("does not put");
  });

  it("is level 3 with an EMPTY ranking: nothing is ever stronger", () => {
    const c = computeIndependence(id("claude-haiku-x"), id("claude-opus-x"), NO_RANKING);
    expect(c.level).toBe(3);
    expect(c.basis).toBe("not-stronger");
    expect(c.flags.join(" ")).toContain("independence.ranking");
  });

  it("is level 3 when the reviewer is NOT in the ranking, however strong it looks", () => {
    const c = computeIndependence(id("claude-sonnet-x"), id("claude-opus-9-unlisted"), RANKED);
    expect(c.level).toBe(3);
    expect(c.flags).toEqual([
      '"claude-opus-9-unlisted" is not in independence.ranking (.lytos/config.yml): it is never treated as stronger',
    ]);
  });

  it("is level 3 when the IMPLEMENTER is not in the ranking", () => {
    const c = computeIndependence(id("claude-unlisted"), id("claude-opus-x"), RANKED);
    expect(c.level).toBe(3);
    expect(c.flags).toHaveLength(1);
    expect(c.flags[0]).toContain("claude-unlisted");
  });

  it("compares ids exactly: a longer id does not inherit a shorter one's rank", () => {
    const c = computeIndependence(id("gpt-small"), id("gpt-big-2"), RANKED);
    expect(c.level).toBe(3);
  });

  it("ignores case and surrounding space in model ids", () => {
    const c = computeIndependence(id("  Claude-Sonnet-X "), id("CLAUDE-OPUS-X"), RANKED);
    expect(c.level).toBe(2);
  });
});

describe("level 3 — the same model", () => {
  it("is level 3 for the same model, however the id is written", () => {
    const c = computeIndependence(id("claude-opus-x"), id(" Claude-Opus-X "), RANKED);
    expect(c.level).toBe(3);
    expect(c.basis).toBe("same-model");
  });

  it("is level 3 for the same model of a provider nobody knows", () => {
    const c = computeIndependence(id("homegrown-1"), id("homegrown-1"), NO_RANKING);
    expect(c.level).toBe(3);
    expect(c.basis).toBe("same-model");
  });

  it("is level 3 when a model's provider is UNKNOWN, and says so", () => {
    const c = computeIndependence(id("claude-opus-x"), id("homegrown-1"), NO_RANKING);
    expect(c.level).toBe(3);
    expect(c.basis).toBe("provider-unknown");
    expect(c.flags).toEqual([
      'no provider known for "homegrown-1": add it under independence.providers in .lytos/config.yml',
    ]);
  });

  it("is level 3 when BOTH providers are unknown, even if the models differ", () => {
    const c = computeIndependence(id("alpha-1"), id("beta-2"), NO_RANKING);
    expect(c.level).toBe(3);
    expect(c.flags).toHaveLength(2);
  });
});

describe("unknown — missing fields are never a better level", () => {
  it("is unknown, treated as level 3, when the implementer model is missing", () => {
    const c = computeIndependence(id(""), id("gpt-big"), NO_RANKING);
    expect(c.level).toBe("unknown");
    expect(c.effectiveLevel).toBe(3);
    expect(c.basis).toBe("missing-fields");
    expect(c.flags).toEqual([
      "ai_implementer.model is not recorded: the level cannot be established",
    ]);
  });

  it("is unknown when the reviewer model is missing", () => {
    const c = computeIndependence(id("claude-opus-x"), id(""), NO_RANKING);
    expect(c.level).toBe("unknown");
    expect(c.flags[0]).toContain("ai_reviewer.model");
  });

  it("is unknown when both are missing, with one flag each", () => {
    const c = computeIndependence(id(""), id(""), RANKED);
    expect(c.level).toBe("unknown");
    expect(c.flags).toHaveLength(2);
  });

  it("is unknown when a field is present but is not a model/session block", () => {
    const imp = identityOf("claude-opus-x");
    expect(imp).toEqual({ model: "", session: "", malformed: true });
    const c = computeIndependence(imp, id("gpt-big"), NO_RANKING);
    expect(c.level).toBe("unknown");
    expect(c.flags[0]).toContain("not a model/session block");
  });

  it("reads a nested block, trimming it", () => {
    expect(identityOf({ model: " gpt-big ", session: " s1 ", prompt_ref: "x" })).toEqual({
      model: "gpt-big",
      session: "s1",
    });
    expect(identityOf(undefined)).toEqual({ model: "", session: "", malformed: false });
  });

  it("labels it as treated-as-3", () => {
    expect(levelLabel(computeIndependence(id(""), id(""), NO_RANKING))).toBe(
      "unknown (treated as level 3)"
    );
  });
});

describe("fresh session", () => {
  it("is fresh when both sessions are recorded and differ", () => {
    expect(computeIndependence(id("m", "a"), id("m", "b"), NO_RANKING).freshSession).toBe(true);
  });

  it("is not fresh when the sessions are the same", () => {
    expect(computeIndependence(id("m", "a"), id("m", "a"), NO_RANKING).freshSession).toBe(false);
  });

  it("is not fresh when either session is missing: two blanks are not 'different'", () => {
    expect(computeIndependence(id("m", ""), id("m", "b"), NO_RANKING).freshSession).toBe(false);
    expect(computeIndependence(id("m", "a"), id("m", ""), NO_RANKING).freshSession).toBe(false);
    expect(computeIndependence(id("m", ""), id("m", ""), NO_RANKING).freshSession).toBe(false);
  });
});

describe("the model-to-provider table", () => {
  it("matches a prefix only up to a non-letter", () => {
    expect(matchesPrefix("gpt-5", "gpt")).toBe(true);
    expect(matchesPrefix("gpt5", "gpt")).toBe(true);
    expect(matchesPrefix("gpt", "gpt")).toBe(true);
    expect(matchesPrefix("gptj", "gpt")).toBe(false);
    expect(matchesPrefix("o3-mini", "o3")).toBe(true);
    expect(matchesPrefix("o3rd-party", "o3")).toBe(false);
    expect(matchesPrefix("anything", "")).toBe(false);
  });

  it("returns null for a model nobody listed", () => {
    expect(resolveProvider("homegrown-1", SHIPPED_PROVIDERS)).toBeNull();
    expect(resolveProvider("", SHIPPED_PROVIDERS)).toBeNull();
  });

  it("prefers the longest prefix, and a configured rule over a shipped one of equal length", () => {
    const rules: ProviderRule[] = [
      ...SHIPPED_PROVIDERS,
      { prefix: "claude", provider: "my-gateway", origin: "config" },
      { prefix: "claude-opus", provider: "special", origin: "config" },
    ];
    expect(resolveProvider("claude-haiku-x", rules)?.provider).toBe("my-gateway");
    expect(resolveProvider("claude-opus-x", rules)?.provider).toBe("special");
  });

  it("a shorter configured prefix does not override a longer shipped one", () => {
    const rules: ProviderRule[] = [
      ...SHIPPED_PROVIDERS,
      { prefix: "o", provider: "other", origin: "config" },
    ];
    expect(matchesPrefix("o3-mini", "o")).toBe(true); // both rules match…
    expect(resolveProvider("o3-mini", rules)?.provider).toBe("openai"); // …the longer one wins
  });
});
