/**
 * Reviewer independence — the write-time rule (ADR-0010 §3, ISS-0166).
 *
 * `lyt review --verdict` is the one writer of `review:`. When it records a
 * POSITIVE verdict (`go`, `go-pending-human`) it first computes the
 * independence of the review and applies the project's rule for the card's
 * risk (`independence-policy.ts`):
 *
 *   - enough independence: the verdict is written, with a `review_independence`
 *     block recording what was computed;
 *   - not enough, and the project only asks to be told: written, flagged;
 *   - not enough, and the card must wait for the owner: refused — the file is
 *     not touched — unless the SAME call carries `--countersign`, in which case
 *     the block also records who countersigned, when, and why: "weak
 *     independence";
 *   - not enough, and the project refuses: refused, countersignature or not.
 *
 * A negative or pending verdict is always writable: independence is about how
 * far to trust an approval, and a rejection never needs trusting. It clears the
 * block, because a new round of review starts and a countersignature belongs to
 * one verdict only: it is never carried over to the next.
 *
 * Pure: the card's fields and the settings in, the fields to write out — or an
 * `IndependenceError` thrown before anything is.
 *
 * Zero dependencies.
 */

import type { Frontmatter, FrontmatterValue } from "./frontmatter.js";
import {
  computeIndependence,
  identityOf,
  levelLabel,
  levelText,
  type AiIdentity,
  type IndependenceComputation,
} from "./independence.js";
import {
  describeMinimum,
  judge,
  type Judgement,
} from "./independence-policy.js";
import type { IndependenceSettings } from "./independence-policy.js";
import {
  COUNTERSIGN_REASON,
  RECORD_FIELD,
  independenceRisk,
  isPositiveVerdict,
} from "./independence-record.js";

export type IndependenceErrorCode =
  | "needs-countersignature"
  | "refused"
  | "countersign-not-applicable"
  | "countersign-anonymous";

/**
 * Thrown BEFORE anything is written when a verdict may not be recorded as
 * asked. It is an error rather than a return value so that a caller who does
 * not look cannot believe the verdict was written.
 */
export class IndependenceError extends Error {
  constructor(
    readonly code: IndependenceErrorCode,
    message: string,
    readonly judgement: Judgement | null,
    readonly computation: IndependenceComputation | null
  ) {
    super(message);
    this.name = "IndependenceError";
  }
}

export interface PlanInput {
  fm: Frontmatter;
  verdict: string;
  /** The AI reviewer as it will stand on the card after this call. */
  reviewer: AiIdentity;
  /** True when this call gave the AI reviewer; false when it comes from the card. */
  reviewerGiven?: boolean;
  countersign: boolean;
  settings: IndependenceSettings;
  /** The human running the command, recorded as the countersigner. */
  user: string;
  /** Today, `YYYY-MM-DD`. */
  date: string;
}

export interface IndependencePlan {
  /** Fields to write. */
  set: Frontmatter;
  /** Fields to remove. */
  clear: string[];
  computation: IndependenceComputation;
  /** Null for a verdict that does not approve. */
  judgement: Judgement | null;
  /** Where the AI reviewer came from: this call, or what the card already said. */
  reviewerFrom: "call" | "card";
}

function hasIdentity(user: string): boolean {
  return user.trim() !== "" && user.trim().toLowerCase() !== "unknown";
}

function blocked(
  j: Judgement,
  c: IndependenceComputation,
  verdict: string
): IndependenceError {
  const level = `level ${levelText(c)}`;
  const base = `A ${level} review cannot produce \`review: ${verdict}\` at risk ${j.risk} (${describeMinimum(j.minimum)} is required): ${c.reason}.`;
  if (j.standing === "refused") {
    return new IndependenceError(
      "refused",
      `${base} This project refuses it (independence.below_minimum.${j.risk}: refuse): a more independent review is needed.`,
      j,
      c
    );
  }
  return new IndependenceError(
    "needs-countersignature",
    `${base} The card waits for the owner's countersignature, recorded as "${COUNTERSIGN_REASON}": run the same command with --countersign, or get a more independent review.`,
    j,
    c
  );
}

function notApplicable(
  message: string,
  judgement: Judgement | null,
  computation: IndependenceComputation
): IndependenceError {
  return new IndependenceError(
    "countersign-not-applicable",
    message,
    judgement,
    computation
  );
}

/** `--countersign` is only meaningful on an approval that falls short, by a named person. */
function checkCountersign(
  input: PlanInput,
  j: Judgement,
  c: IndependenceComputation
): void {
  if (!input.countersign) return;
  if (!hasIdentity(input.user)) {
    throw new IndependenceError(
      "countersign-anonymous",
      "A countersignature records who signed it, and no name is available (set `git config user.name`): nothing was written.",
      j,
      c
    );
  }
  if (j.meets) {
    throw notApplicable(
      `Nothing to countersign: a level ${levelText(c)} review meets the minimum for risk ${j.risk} (${describeMinimum(j.minimum)}).`,
      j,
      c
    );
  }
}

/** The block `lyt review` writes with an approval. */
function recordOf(
  input: PlanInput,
  j: Judgement,
  c: IndependenceComputation
): { [k: string]: string } {
  const record: { [k: string]: string } = {
    level: levelText(c),
    risk: j.risk,
    minimum: j.minimum,
  };
  if (input.countersign) {
    record.countersigned_by = input.user;
    record.countersigned_at = input.date;
    record.countersigned_as = COUNTERSIGN_REASON;
  }
  return record;
}

/**
 * Decide what the verdict write does about independence. Pure: it reads the
 * card's fields and the settings, and either returns the fields to write or
 * throws an `IndependenceError`.
 */
export function planIndependence(input: PlanInput): IndependencePlan {
  const { fm, verdict, settings } = input;
  const reviewerFrom = input.reviewerGiven ? "call" : "card";
  const computation = computeIndependence(
    identityOf(fm.ai_implementer),
    input.reviewer,
    settings
  );
  if (!isPositiveVerdict(verdict)) {
    if (input.countersign) {
      throw notApplicable(
        "--countersign records the owner's countersignature of an approval: use it with --verdict go or go-pending-human.",
        null,
        computation
      );
    }
    return {
      set: {},
      clear: [RECORD_FIELD],
      computation,
      judgement: null,
      reviewerFrom,
    };
  }
  const judgement = judge(
    computation,
    independenceRisk(fm.risk).risk,
    settings
  );
  checkCountersign(input, judgement, computation);
  const held = judgement.standing === "needs-countersignature";
  if (judgement.standing === "refused" || (held && !input.countersign)) {
    throw blocked(judgement, computation, verdict);
  }
  return {
    set: { [RECORD_FIELD]: recordOf(input, judgement, computation) },
    clear: [],
    computation,
    judgement,
    reviewerFrom,
  };
}

export interface GivenAiReviewer {
  model?: string;
  session?: string;
  prompt_ref?: string;
}

/**
 * The AI reviewer as it will stand on the card once the flags of this call are
 * applied over what the card already says. `block` is what to write (null when
 * the call gave nothing, and the card is left as it is); `identity` is what the
 * independence is computed from, in either case.
 */
export function resolveAiReviewer(
  existing: FrontmatterValue | undefined,
  given: GivenAiReviewer | undefined
): { block: { [k: string]: string } | null; identity: AiIdentity } {
  const current: { [k: string]: string } =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...existing }
      : {};
  const flags = Object.entries(given ?? {}).filter(
    ([, v]) => typeof v === "string" && v.trim() !== ""
  );
  if (flags.length === 0) {
    return { block: null, identity: identityOf(existing) };
  }
  const merged = { ...current };
  for (const [key, value] of flags) merged[key] = (value as string).trim();
  if (merged.model && !merged.prompt_ref) {
    merged.prompt_ref = "skills/code-review/SKILL.md";
  }
  return { block: merged, identity: identityOf(merged) };
}

export interface Notice {
  /** `ok` needs nothing from the human; `warn` is worth reading. */
  kind: "ok" | "warn";
  text: string;
}

/**
 * What `lyt review` says after it recorded an approval: how independent the
 * review was and what that means for the card. Null for a verdict that does
 * not approve.
 */
export function verdictNotice(plan: IndependencePlan): Notice | null {
  const j = plan.judgement;
  if (!j) return null;
  const c = plan.computation;
  const record = plan.set[RECORD_FIELD] as { [k: string]: string } | undefined;
  const models = `implementer ${c.implementer.model || "—"}, reviewer ${c.reviewer.model || "—"}${plan.reviewerFrom === "card" ? " (read from the card: pass --ai-model to change it)" : ""}`;
  const head = `Independence: level ${levelLabel(c)} [${models}]`;
  const rule = `the minimum for risk ${j.risk} is ${describeMinimum(j.minimum)}`;
  const assumed = c.flags.length > 0 ? ` Assumed: ${c.flags.join("; ")}.` : "";
  if (j.meets) {
    return { kind: "ok", text: `${head} — meets it (${rule}).${assumed}` };
  }
  if (record?.countersigned_by) {
    return {
      kind: "warn",
      text: `${head} — below the minimum (${rule}). Countersigned by ${record.countersigned_by} on ${record.countersigned_at}, recorded as "${COUNTERSIGN_REASON}".${assumed}`,
    };
  }
  return {
    kind: "warn",
    text: `${head} — below the minimum (${rule}). Recorded and flagged in the review packet.${assumed}`,
  };
}
