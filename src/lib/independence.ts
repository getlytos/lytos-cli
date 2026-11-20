/**
 * Reviewer independence — the level, computed (ADR-0010, ISS-0166).
 *
 * ADR-0004 §5 says the reviewer must not be the implementer. In practice few
 * people have two AI providers, and a review by the model that wrote the work
 * shares its blind spots. The schema already records who implemented and who
 * reviewed (`ai_implementer`, `ai_reviewer`: model and session). This module
 * turns those two records into a level, so that something can require more of
 * it where the stakes are higher (see `independence-policy.ts`).
 *
 * The three levels, strongest first:
 *   1. a different provider;
 *   2. the same provider, a different model that the configured ranking puts
 *      ABOVE the implementer's;
 *   3. the same model — "weak independence".
 *
 * Computed, never declared: nothing here reads a field that says "level".
 * And never optimistic: whatever cannot be established is treated as level 3
 * and said so in `flags` — a missing model, a model whose provider is unknown,
 * a model absent from the ranking. A model absent from the ranking is NEVER
 * "stronger": the ranking is a declared input, not a measurement of quality
 * (ADR-0010 non-goals), and an unknown quantity must not buy a better grade.
 *
 * Pure: strings in, a plain object out. No file is read here.
 *
 * Zero dependencies.
 */

import type { FrontmatterValue } from "./frontmatter.js";
import {
  normalizeModel,
  reassignmentOf,
  resolveProvider,
  type ProviderRule,
} from "./independence-providers.js";

export type Level = 1 | 2 | 3;

/** Why the level is what it is — the one fact the rest is derived from. */
export type Basis =
  | "missing-fields"
  | "same-model"
  | "provider-unknown"
  | "different-provider"
  | "stronger-model"
  | "not-stronger";

/** What the computation needs from the configuration. */
export interface ComputeSettings {
  /** Lowercase exact model ids, weakest first. */
  ranking: readonly string[];
  providers: readonly ProviderRule[];
}

export interface AiIdentity {
  model: string;
  session: string;
  /** True when the field was present but not a `model`/`session` block. */
  malformed?: boolean;
}

export interface ResolvedIdentity {
  model: string;
  session: string;
  provider: string | null;
  providerOrigin: "shipped" | "config" | null;
  /** Index in the ranking (0 = weakest), or null when unranked. */
  rank: number | null;
  /**
   * Set when the configuration moved this model to another provider than the
   * shipped table gives it (ISS-0176): `from` is the shipped one, `to` the
   * configured one that was used.
   */
  override: { prefix: string; from: string; to: string } | null;
}

export interface IndependenceComputation {
  /** `unknown` only when a model is not recorded. */
  level: Level | "unknown";
  /** The level every rule applies: `unknown` counts as 3, never better. */
  effectiveLevel: Level;
  basis: Basis;
  /** Both sessions recorded and different. */
  freshSession: boolean;
  implementer: ResolvedIdentity;
  reviewer: ResolvedIdentity;
  /** The reading of the level, one sentence. */
  reason: string;
  /** Everything that was assumed rather than established. */
  flags: string[];
  /** The provider overrides this level relied on, one sentence each. */
  overrides: string[];
  /**
   * The level the shipped provider table alone gives, when an override was used
   * (null otherwise). At risk high the minimum is checked against the worse of
   * the two, so a configuration cannot lift a review to level 1 by itself.
   */
  shipped: { level: Level | "unknown"; effectiveLevel: Level } | null;
}

/** Read `{model, session}` from an `ai_implementer` / `ai_reviewer` value. */
export function identityOf(node: FrontmatterValue | undefined): AiIdentity {
  if (node && typeof node === "object" && !Array.isArray(node)) {
    return {
      model: (node.model ?? "").trim(),
      session: (node.session ?? "").trim(),
    };
  }
  const present = typeof node === "string" ? node.trim() !== "" : !!node;
  return { model: "", session: "", malformed: present };
}

function resolve(
  identity: AiIdentity,
  settings: ComputeSettings
): ResolvedIdentity {
  const id = normalizeModel(identity.model);
  const rule = id ? resolveProvider(id, settings.providers) : null;
  const index = id ? settings.ranking.indexOf(id) : -1;
  const shipped = rule ? reassignmentOf(rule) : null;
  return {
    model: identity.model,
    session: identity.session,
    provider: rule ? rule.provider : null,
    providerOrigin: rule ? rule.origin : null,
    rank: index >= 0 ? index : null,
    override:
      rule && shipped
        ? { prefix: rule.prefix, from: shipped.provider, to: rule.provider }
        : null,
  };
}

function field(role: string, identity: AiIdentity): string[] {
  if (identity.model) return [];
  const why = identity.malformed
    ? `ai_${role} is not a model/session block`
    : `ai_${role}.model is not recorded`;
  return [`${why}: the level cannot be established`];
}

type Verdict = Pick<
  IndependenceComputation,
  "level" | "effectiveLevel" | "basis" | "reason" | "flags"
>;

/** Same provider, two different models: is the reviewer ranked above? */
function sameProvider(imp: ResolvedIdentity, rev: ResolvedIdentity): Verdict {
  if (imp.rank !== null && rev.rank !== null && rev.rank > imp.rank) {
    return {
      level: 2,
      effectiveLevel: 2,
      basis: "stronger-model",
      reason: `same provider (${imp.provider}), and the ranking puts "${rev.model}" above "${imp.model}"`,
      flags: [],
    };
  }
  const flags: string[] = [];
  for (const m of [imp, rev]) {
    if (m.rank === null)
      flags.push(
        `"${m.model}" is not in independence.ranking (.lytos/config.yml): it is never treated as stronger`
      );
  }
  const weaker = imp.rank !== null && rev.rank !== null;
  return {
    level: 3,
    effectiveLevel: 3,
    basis: "not-stronger",
    reason: weaker
      ? `same provider (${imp.provider}), and the ranking does not put "${rev.model}" above "${imp.model}"`
      : `same provider (${imp.provider}), and "${rev.model}" is not shown to be stronger than "${imp.model}"`,
    flags,
  };
}

/** At least one provider is unknown: no better than level 3, and said so. */
function providerUnknown(
  imp: ResolvedIdentity,
  rev: ResolvedIdentity
): Verdict {
  const unknown = [imp, rev].filter((m) => !m.provider).map((m) => m.model);
  return {
    level: 3,
    effectiveLevel: 3,
    basis: "provider-unknown",
    reason: `the provider of ${unknown.map((m) => `"${m}"`).join(" and ")} is unknown: treated as level 3`,
    flags: unknown.map(
      (m) =>
        `no provider known for "${m}": add it under independence.providers in .lytos/config.yml`
    ),
  };
}

/** The level from two resolved identities that both carry a model. */
function ladder(imp: ResolvedIdentity, rev: ResolvedIdentity): Verdict {
  if (normalizeModel(imp.model) === normalizeModel(rev.model)) {
    return {
      level: 3,
      effectiveLevel: 3,
      basis: "same-model",
      reason: "the reviewer is the same model as the implementer",
      flags: [],
    };
  }
  if (!imp.provider || !rev.provider) return providerUnknown(imp, rev);
  if (imp.provider !== rev.provider) {
    return {
      level: 1,
      effectiveLevel: 1,
      basis: "different-provider",
      reason: `different providers (${imp.provider} implemented, ${rev.provider} reviewed)`,
      flags: [],
    };
  }
  return sameProvider(imp, rev);
}

/** The level from the two identities and one provider table; no override logic. */
function computeWith(
  implementer: AiIdentity,
  reviewer: AiIdentity,
  settings: ComputeSettings
): IndependenceComputation {
  const imp = resolve(implementer, settings);
  const rev = resolve(reviewer, settings);
  const freshSession =
    imp.session !== "" && rev.session !== "" && imp.session !== rev.session;
  const missing = [
    ...field("implementer", implementer),
    ...field("reviewer", reviewer),
  ];
  const shape = { freshSession, implementer: imp, reviewer: rev };
  const none = { overrides: [], shipped: null };
  if (missing.length > 0) {
    return {
      level: "unknown",
      effectiveLevel: 3,
      basis: "missing-fields",
      reason:
        "the level cannot be established from the card: treated as level 3",
      flags: missing,
      ...shape,
      ...none,
    };
  }
  return { ...ladder(imp, rev), ...shape, ...none };
}

function overrideSentence(role: string, m: ResolvedIdentity): string {
  const o = m.override!;
  return `provider override: the ${role} model "${m.model}" is counted as provider "${o.to}" because .lytos/config.yml reassigns "${o.prefix}" (the shipped table says "${o.from}")`;
}

/**
 * Compute the independence of a review from the two recorded identities.
 *
 * `freshSession` is independent of the level: it says only that both sessions
 * are recorded and differ. Two missing sessions are not "different".
 *
 * When the configuration reassigned a model the shipped table already maps to
 * another provider, the level is computed with that override (it is what the
 * project said), reported in `overrides` and `flags`, and computed again with
 * the shipped mapping into `shipped`, so that the policy can refuse to let an
 * override lift a high-risk review (ISS-0176).
 */
export function computeIndependence(
  implementer: AiIdentity,
  reviewer: AiIdentity,
  settings: ComputeSettings
): IndependenceComputation {
  const c = computeWith(implementer, reviewer, settings);
  const used: Array<[string, ResolvedIdentity]> = [
    ["implementer", c.implementer],
    ["reviewer", c.reviewer],
  ];
  const overridden = used.filter(([, m]) => m.override !== null);
  if (c.level === "unknown" || overridden.length === 0) return c;
  const trusted = computeWith(implementer, reviewer, {
    ...settings,
    providers: settings.providers.filter((r) => reassignmentOf(r) === null),
  });
  const overrides = overridden.map(([role, m]) => overrideSentence(role, m));
  return {
    ...c,
    overrides,
    flags: [...c.flags, ...overrides],
    shipped: { level: trusted.level, effectiveLevel: trusted.effectiveLevel },
  };
}

/** `1`, `2`, `3` or `unknown` — the form written to and read from the card. */
export function levelText(c: IndependenceComputation): string {
  return String(c.level);
}

const LEVEL_NAME: Record<Level, string> = {
  1: "different provider",
  2: "same provider, stronger model",
  3: "weak independence",
};

/** A short label: `1 — different provider`, `unknown (treated as 3)`. */
export function levelLabel(c: IndependenceComputation): string {
  if (c.level === "unknown") return "unknown (treated as level 3)";
  return `${c.level} — ${LEVEL_NAME[c.level]}`;
}
