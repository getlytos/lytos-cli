/**
 * Reviewer independence — the record on the card (ADR-0010 §3, ISS-0166).
 *
 * The `review_independence` block is what `lyt review` SAW when it recorded an
 * approval: the level it computed, the card's risk, the minimum it applied and,
 * when the owner countersigned a weak review, who, when and why. It is never
 * trusted as a fact about the review: `lyt report` recomputes the level from
 * `ai_implementer` / `ai_reviewer` every time and compares it with the block,
 * so an edit to either side shows (`independence-view.ts`).
 *
 * Zero dependencies.
 */

import type { FrontmatterValue } from "./frontmatter.js";
import type { RiskTier } from "./quality.js";

/** The frontmatter field that carries the record. */
export const RECORD_FIELD = "review_independence";

/** The reason a countersignature records, verbatim (ADR-0010). */
export const COUNTERSIGN_REASON = "weak independence";

const POSITIVE_VERDICTS = ["go", "go-pending-human"];

/** `go` and `go-pending-human` approve; `no-go`, `pending` and `none` do not. */
export function isPositiveVerdict(verdict: string): boolean {
  return POSITIVE_VERDICTS.includes(verdict.trim().toLowerCase());
}

export interface IndependenceRecord {
  level: string;
  risk: string;
  minimum: string;
  countersignedBy: string;
  countersignedAt: string;
  countersignedAs: string;
}

export interface Countersignature {
  by: string;
  at: string;
}

function text(node: FrontmatterValue | undefined, key: string): string {
  if (node && typeof node === "object" && !Array.isArray(node)) {
    return (node[key] ?? "").trim();
  }
  return "";
}

/** Read the block off a card, or null when the card carries none. */
export function readRecord(
  node: FrontmatterValue | undefined
): IndependenceRecord | null {
  if (!node || typeof node !== "object" || Array.isArray(node)) return null;
  return {
    level: text(node, "level"),
    risk: text(node, "risk"),
    minimum: text(node, "minimum"),
    countersignedBy: text(node, "countersigned_by"),
    countersignedAt: text(node, "countersigned_at"),
    countersignedAs: text(node, "countersigned_as"),
  };
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A countersignature counts only when it is complete: who, a date, and the
 * reason this feature records. Anything less is not a signature, whoever
 * typed it.
 */
export function countersignatureOf(
  record: IndependenceRecord | null
): Countersignature | null {
  if (!record) return null;
  const complete =
    record.countersignedBy !== "" &&
    DATE.test(record.countersignedAt) &&
    record.countersignedAs.toLowerCase() === COUNTERSIGN_REASON;
  return complete
    ? { by: record.countersignedBy, at: record.countersignedAt }
    : null;
}

/**
 * The risk the rule applies. An absent `risk` is `medium` (ADR-0001). A value
 * that is present but is not `low|medium|high` is read as `high`: a typo must
 * never lower the bar.
 */
export function independenceRisk(raw: FrontmatterValue | undefined): {
  risk: RiskTier;
  flag: string | null;
} {
  if (raw === undefined || (typeof raw === "string" && raw.trim() === ""))
    return { risk: "medium", flag: null };
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (value === "low" || value === "medium" || value === "high")
    return { risk: value, flag: null };
  return {
    risk: "high",
    flag: "`risk:` is not low, medium or high: read as high",
  };
}
