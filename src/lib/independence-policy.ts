/**
 * Reviewer independence — the minimum by risk, and what happens below it
 * (ADR-0010 §3, ISS-0166).
 *
 * The level itself is computed in `independence.ts`; the project's choices come
 * from `.lytos/config.yml` (`independence-settings.ts`). This module holds the
 * vocabulary, the defaults — which are also the FLOOR — and the judgement:
 * whether a given level is enough for a given risk.
 *
 * Minimums (weakest first):
 *   any            any reviewer, even one nothing is known about;
 *   fresh-session  level 1 or 2, or level 3 from a session that is recorded
 *                  and differs from the implementer's;
 *   level-2        level 1 or 2;
 *   level-1        level 1 only.
 *
 * Below the minimum, a positive verdict (`go`, `go-pending-human`):
 *   warn         is recorded and flagged — the card is not held;
 *   countersign  is refused until the owner countersigns, with "weak
 *                independence", who and when recorded (the ADR-0010 default
 *                at high risk);
 *   refuse       is refused, countersignature or not.
 *
 * Zero dependencies.
 */

import type {
  ComputeSettings,
  IndependenceComputation,
} from "./independence.js";
import { SHIPPED_PROVIDERS } from "./independence-providers.js";
import type { RiskTier } from "./quality.js";

export const RISKS: readonly RiskTier[] = ["low", "medium", "high"];

/** Weakest requirement first. */
export const MINIMUMS = ["any", "fresh-session", "level-2", "level-1"] as const;
export type Minimum = (typeof MINIMUMS)[number];

/** Gentlest consequence first. */
export const ACTIONS = ["warn", "countersign", "refuse"] as const;
export type BelowAction = (typeof ACTIONS)[number];

export const DEFAULT_MINIMUM: Readonly<Record<RiskTier, Minimum>> = {
  low: "any",
  medium: "fresh-session",
  high: "level-2",
};

export const DEFAULT_BELOW_MINIMUM: Readonly<Record<RiskTier, BelowAction>> = {
  low: "warn",
  medium: "warn",
  high: "countersign",
};

export type ByRisk<T> = Record<RiskTier, T>;

export interface IndependenceSettings extends ComputeSettings {
  minimum: ByRisk<Minimum>;
  belowMinimum: ByRisk<BelowAction>;
  /** Where each value came from, for the packet: config, or the default. */
  fromConfig: {
    ranking: boolean;
    providers: number;
    minimum: ByRisk<boolean>;
    belowMinimum: ByRisk<boolean>;
  };
  config: { path: string; present: boolean };
  /** Everything in the config that was not used, one sentence each. */
  problems: string[];
}

/** The settings of a project with no configuration at all. */
export function defaultSettings(): IndependenceSettings {
  const none = (): ByRisk<boolean> => ({
    low: false,
    medium: false,
    high: false,
  });
  return {
    ranking: [],
    providers: SHIPPED_PROVIDERS,
    minimum: { ...DEFAULT_MINIMUM },
    belowMinimum: { ...DEFAULT_BELOW_MINIMUM },
    fromConfig: {
      ranking: false,
      providers: 0,
      minimum: none(),
      belowMinimum: none(),
    },
    config: { path: ".lytos/config.yml", present: false },
    problems: [],
  };
}

/** Does this computation satisfy the minimum? `unknown` counts as level 3. */
export function meetsMinimum(
  c: IndependenceComputation,
  minimum: Minimum
): boolean {
  switch (minimum) {
    case "any":
      return true;
    case "fresh-session":
      return c.effectiveLevel <= 2 || c.freshSession;
    case "level-2":
      return c.effectiveLevel <= 2;
    case "level-1":
      return c.effectiveLevel === 1;
  }
}

/** The minimum in words. */
export function describeMinimum(minimum: Minimum): string {
  switch (minimum) {
    case "any":
      return "any reviewer";
    case "fresh-session":
      return "a different model, or a fresh session";
    case "level-2":
      return "level 1 or 2";
    case "level-1":
      return "level 1";
  }
}

/**
 * Where a review stands against the minimum for its risk.
 *   meets                   enough.
 *   below-warn              not enough; the project only asks to be told.
 *   needs-countersignature  not enough; a positive verdict waits for the owner.
 *   refused                 not enough; the project refuses it outright.
 * (The packet adds `countersigned` once a valid countersignature is recorded.)
 */
export type Standing =
  | "meets"
  | "below-warn"
  | "needs-countersignature"
  | "refused";

export interface Judgement {
  risk: RiskTier;
  minimum: Minimum;
  action: BelowAction;
  meets: boolean;
  standing: Standing;
}

/** Judge a computation against the minimum configured for `risk`. */
export function judge(
  c: IndependenceComputation,
  risk: RiskTier,
  settings: IndependenceSettings
): Judgement {
  const minimum = settings.minimum[risk];
  const action = settings.belowMinimum[risk];
  const meets = meetsMinimum(c, minimum);
  const standing: Standing = meets
    ? "meets"
    : action === "refuse"
      ? "refused"
      : action === "countersign"
        ? "needs-countersignature"
        : "below-warn";
  return { risk, minimum, action, meets, standing };
}
