/**
 * Reviewer independence — what the review packet and `lyt gates` show
 * (ADR-0010 §2 and Consequences, ISS-0166).
 *
 * The view is RECOMPUTED from the card every time it is built; it never trusts
 * a field that merely says "level 1". It shows the models and sessions it read,
 * the level it derived and why, the minimum for the card's risk, where each
 * setting came from, and what it had to assume. That is what makes a hand edit
 * visible: edit `ai_reviewer.model` and the level moves in front of the human;
 * write `review: go` by hand on a high-risk card and the packet says the
 * approval is not opposable; add a countersignature and it is shown, with the
 * name and date that were typed; change the models or the risk after a verdict
 * was recorded and the block the CLI wrote no longer matches.
 *
 * Read-only. Zero dependencies.
 */

import type { Frontmatter } from "./frontmatter.js";
import {
  computeIndependence,
  identityOf,
  levelLabel,
  levelText,
  type Basis,
  type IndependenceComputation,
  type Level,
  type ResolvedIdentity,
} from "./independence.js";
import {
  describeMinimum,
  judge,
  type Judgement,
  type BelowAction,
  type IndependenceSettings,
  type Minimum,
  type Standing,
} from "./independence-policy.js";
import { loadSettings } from "./independence-settings.js";
import { decideLines } from "./independence-render.js";
import {
  RECORD_FIELD,
  countersignatureOf,
  independenceRisk,
  isPositiveVerdict,
  readRecord,
  type Countersignature,
  type IndependenceRecord,
} from "./independence-record.js";
import type { RiskTier } from "./quality.js";

export interface IdentityView {
  model: string;
  session: string;
  provider: string | null;
  /** `shipped` table, a `config` override, or null when the provider is unknown. */
  providerFrom: "shipped" | "config" | null;
  ranked: boolean;
}

export interface IndependenceView {
  risk: RiskTier;
  level: Level | "unknown";
  /** The level every rule applies: unknown counts as 3. */
  effectiveLevel: Level;
  label: string;
  basis: Basis;
  reason: string;
  freshSession: boolean;
  implementer: IdentityView;
  reviewer: IdentityView;
  minimum: Minimum;
  minimumText: string;
  belowMinimum: BelowAction;
  meetsMinimum: boolean;
  standing: Standing | "countersigned";
  /** The `review:` field as the card says it. */
  verdict: string;
  /** True when the card records an approval (`go`, `go-pending-human`). */
  approved: boolean;
  /** For an approval: may it be relied on? Null when there is none. */
  opposable: boolean | null;
  countersignature: Countersignature | null;
  /** The block `lyt review` wrote with the verdict, if the card has one. */
  recorded: { level: string; risk: string; minimum: string } | null;
  /** Ways the card no longer matches what the verdict recorded. */
  drift: string[];
  /** Lines for the packet's "Decide first" list. */
  decide: string[];
  /** What was assumed rather than established. */
  flags: string[];
  /** Where each value came from. */
  sources: string[];
  /** Everything in `.lytos/config.yml` that was not used. */
  configProblems: string[];
}

function identityView(r: ResolvedIdentity): IdentityView {
  return {
    model: r.model,
    session: r.session,
    provider: r.provider,
    providerFrom: r.providerOrigin,
    ranked: r.rank !== null,
  };
}

function driftOf(
  recorded: { level: string; risk: string } | null,
  c: IndependenceComputation,
  risk: RiskTier
): string[] {
  if (!recorded || recorded.level === "") return [];
  const drift: string[] = [];
  if (recorded.level !== levelText(c)) {
    drift.push(
      `the verdict recorded level ${recorded.level}, the models on the card now give level ${levelText(c)}`
    );
  }
  if (recorded.risk !== "" && recorded.risk !== risk) {
    drift.push(
      `the verdict was recorded at risk ${recorded.risk}, the card now says ${risk}`
    );
  }
  return drift;
}

function sourcesOf(s: IndependenceSettings, risk: RiskTier): string[] {
  const from = (config: boolean): string =>
    config ? `${s.config.path}` : "default";
  const rules =
    s.fromConfig.providers > 0
      ? `shipped table + ${s.fromConfig.providers} from ${s.config.path}`
      : "shipped table";
  const ranking = s.fromConfig.ranking
    ? `${s.config.path} (${s.ranking.length} model${s.ranking.length === 1 ? "" : "s"})`
    : "none configured";
  return [
    "models and sessions: ai_implementer and ai_reviewer in the card frontmatter",
    `providers: ${rules}`,
    `ranking: ${ranking}`,
    `minimum for risk ${risk}: ${from(s.fromConfig.minimum[risk])}; below the minimum: ${from(s.fromConfig.belowMinimum[risk])}`,
    `${s.config.path}: ${s.config.present ? "read" : "absent — defaults apply"}`,
  ];
}

/** The judgement, upgraded when a complete countersignature covers a shortfall. */
function standingOf(
  j: Judgement,
  countersignature: Countersignature | null
): IndependenceView["standing"] {
  const covers =
    j.standing === "needs-countersignature" || j.standing === "below-warn";
  return countersignature && covers ? "countersigned" : j.standing;
}

function flagsOf(
  c: IndependenceComputation,
  extra: {
    riskFlag: string | null;
    approved: boolean;
    record: IndependenceRecord | null;
    refusedSignature: boolean;
  }
): string[] {
  const flags = [...c.flags];
  if (extra.riskFlag) flags.push(extra.riskFlag);
  if (extra.approved && !extra.record) {
    flags.push(
      "the verdict carries no review_independence block: written by hand, or by a CLI older than 1.7"
    );
  }
  if (extra.refusedSignature) {
    flags.push(
      "a countersignature is on the card, but this project refuses it"
    );
  }
  return flags;
}

/** What was recorded with the verdict, or null when the card carries nothing usable. */
function recordedOf(record: IndependenceRecord | null) {
  return record && record.level !== ""
    ? { level: record.level, risk: record.risk, minimum: record.minimum }
    : null;
}

/** The fields of the view that come straight from the computation and the judgement. */
function detailOf(
  c: IndependenceComputation,
  j: Judgement,
  settings: IndependenceSettings
) {
  return {
    effectiveLevel: c.effectiveLevel,
    basis: c.basis,
    reason: c.reason,
    freshSession: c.freshSession,
    implementer: identityView(c.implementer),
    reviewer: identityView(c.reviewer),
    minimum: j.minimum,
    belowMinimum: j.action,
    meetsMinimum: j.meets,
    sources: sourcesOf(settings, j.risk),
    configProblems: settings.problems,
  };
}

/**
 * Compute the independence view of a card. `settings` defaults to the project's
 * `.lytos/config.yml` (or the shipped defaults when there is none).
 */
export function describeIndependence(
  lytosDir: string,
  fm: Frontmatter,
  settings: IndependenceSettings = loadSettings(lytosDir)
): IndependenceView {
  const { risk, flag: riskFlag } = independenceRisk(fm.risk);
  const c = computeIndependence(
    identityOf(fm.ai_implementer),
    identityOf(fm.ai_reviewer),
    settings
  );
  const j = judge(c, risk, settings);
  const verdict = typeof fm.review === "string" ? fm.review.trim() : "";
  const approved = isPositiveVerdict(verdict);
  const record = readRecord(fm[RECORD_FIELD]);
  const countersignature = countersignatureOf(record);
  const standing = standingOf(j, countersignature);
  const recorded = recordedOf(record);
  const drift = approved ? driftOf(recorded, c, risk) : [];
  const core = {
    risk,
    level: c.level,
    label: levelLabel(c),
    minimumText: describeMinimum(j.minimum),
    standing,
    approved,
    verdict,
    countersignature,
    drift,
    recorded,
  };
  const refusedSignature =
    countersignature !== null && j.standing === "refused";
  return {
    ...core,
    ...detailOf(c, j, settings),
    opposable: approved
      ? standing !== "needs-countersignature" && standing !== "refused"
      : null,
    decide: decideLines({ id: String(fm.id ?? ""), v: core }),
    flags: flagsOf(c, { riskFlag, approved, record, refusedSignature }),
  };
}
