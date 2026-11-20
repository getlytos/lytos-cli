/**
 * The record of a human override of the discovery gate (ADR-0009 §3, ISS-0165,
 * ISS-0175), and the reason it carries.
 *
 * A record exempts a leaf only when it is COMPLETE (reason, date, by, epic) and
 * was made for the leaf's CURRENT parent: the same stance as an incomplete
 * countersignature, which is not a signature, whoever typed it
 * (`independence-record.ts`). A bare or stale record exempts nothing, and
 * `lyt lint` says so.
 *
 * The reason is a person's words written into the frontmatter, which has no
 * escapes. `cleanReason` makes it a plain one-line text that cannot be read as a
 * delimiter, a key, a list or any other YAML construct, and that reads back
 * exactly as it was written.
 *
 * Pure functions, no I/O. Zero dependencies.
 */

import type { Frontmatter } from "./frontmatter.js";
import { parentIdOf } from "./intent.js";

/** The card type of a feasibility study or measurement: exempt from the gate. */
export const SPIKE_TYPE = "spike";

/** The frontmatter key that records a human override. */
export const OVERRIDE_KEY = "discovery_override";

/** What is written into the card when an override lets a leaf through. */
export interface DiscoveryOverride {
  reason: string;
  /** `YYYY-MM-DD`. */
  date: string;
  /** The epic that was in discovery: it must be the leaf's parent for the record to count. */
  epic: string;
  /** The accountable human (the git user). */
  by: string;
}

export type OverrideState =
  | { state: "none" }
  | { state: "valid"; record: DiscoveryOverride }
  | {
      state: "invalid";
      /** Why it does not count, as a predicate: "is incomplete (missing: …)". */
      problem: string;
    };

const REQUIRED = ["reason", "date", "by", "epic"] as const;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A reason as it will be written and read back. In order: whitespace collapses
 * (a line break would break the record), double quotes and backslashes become
 * harmless characters, a run of three dashes or more becomes one dash (so no
 * reason can look like the frontmatter delimiter), and whatever would make the
 * value start as YAML syntax is dropped from its start (`[`, `{`, `- `, `? `, `&`,
 * `*`, `!`, `|`, `>`, `#`, `%`, `@`, a quote). A quote left at the end goes too:
 * the reader strips it. Empty means there is no reason.
 */
export function cleanReason(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/"/g, "'")
    .replace(/\\/g, "/")
    .replace(/-{3,}/g, "-")
    .replace(/^[-?:,[\]{}#&*!|>%@`'\s]+/, "")
    .replace(/'+$/, "")
    .trim();
}

function field(node: Record<string, string>, key: string): string {
  return (node[key] ?? "").trim();
}

/** What the card says about an override, and whether it counts for its current parent. */
export function readOverride(fm: Frontmatter): OverrideState {
  const raw = fm[OVERRIDE_KEY];
  if (raw === undefined || (typeof raw === "string" && raw.trim() === "")) {
    return { state: "none" };
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return {
      state: "invalid",
      problem: "is not a record (reason, date, by, epic)",
    };
  }

  const missing = REQUIRED.filter((key) => field(raw, key) === "");
  if (missing.length > 0) {
    return {
      state: "invalid",
      problem: `is incomplete (missing: ${missing.join(", ")})`,
    };
  }
  if (!DATE.test(field(raw, "date"))) {
    return { state: "invalid", problem: "has a date that is not YYYY-MM-DD" };
  }
  const epic = field(raw, "epic").toUpperCase();
  const parent = parentIdOf({ fm });
  if (epic !== parent) {
    return {
      state: "invalid",
      problem: `was recorded for ${epic}, but the card's parent is ${parent || "(none)"}`,
    };
  }
  return {
    state: "valid",
    record: {
      reason: field(raw, "reason"),
      date: field(raw, "date"),
      epic: field(raw, "epic"),
      by: field(raw, "by"),
    },
  };
}

/** Does the card carry an override that counts: complete, and made for its current parent? */
export function hasDiscoveryOverride(fm: Frontmatter): boolean {
  return readOverride(fm).state === "valid";
}
