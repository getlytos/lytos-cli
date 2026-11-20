/**
 * The discovery gate (ADR-0009 §3, ISS-0165).
 *
 * Work committed to a sprint before its intent is settled makes the loop build on
 * a moving target. While an epic is in `phase: discovery`, its leaves cannot enter
 * the sprint: `lyt move` (into the sprint), `lyt start`, `lyt claim` and
 * `lyt unpark` refuse them, and `lyt next` excludes them.
 *
 * Who is not concerned:
 *   - a card with no parent epic (a fix, a chore), or whose parent is missing or
 *     is not an epic (`lyt lint` warns about those);
 *   - a leaf whose epic is `frozen`, or has no `phase` (the field is optional);
 *   - the epic itself.
 *
 * Two exemptions: a leaf of `type: spike` (a feasibility study or a measurement:
 * it produces the evidence the epic needs), and an explicit human override that
 * carries a reason and is recorded in the card under `discovery_override`.
 *
 * Zero dependencies.
 */

import { readFileSync } from "fs";
import {
  DISCOVERY_PHASE,
  isEpic,
  parentIdOf,
  phaseOf,
  scalar,
} from "./intent.js";
import { parseFrontmatter, type Frontmatter } from "./frontmatter.js";
import { today } from "./issue-ops.js";
import { findIssueFile } from "./show.js";

/** The card type of a feasibility study or measurement: exempt from the gate. */
export const SPIKE_TYPE = "spike";

/** The frontmatter key that records a human override. */
export const OVERRIDE_KEY = "discovery_override";

const SPRINT = "2-sprint";
/** Stages a card comes from when it ENTERS the sprint (anything later is a send-back). */
const BEFORE_THE_SPRINT = ["0-icebox", "1-backlog", "parked"];

/** What is written into the card when an override lets a leaf through. */
export interface DiscoveryOverride {
  reason: string;
  date: string;
  /** The epic that was in discovery. */
  epic: string;
  /** The accountable human (the git user). */
  by: string;
}

export type GateDecision =
  | { action: "pass" }
  | { action: "override"; record: DiscoveryOverride }
  | {
      action: "refuse";
      reason: "epic-in-discovery" | "override-needs-reason";
      /** The epic in discovery, when the refusal is about one. */
      epic?: string;
      message: string;
      /** The ways forward, one sentence each. */
      hints: string[];
    };

export interface GateOptions {
  /** The reason given with `--discovery-override`; undefined when the option is absent. */
  override?: string;
  /** Who is overriding (the git user). */
  by?: string;
}

/** Does a move from `from` to `to` enter the sprint? A send-back does not. */
export function entersSprint(from: string, to: string): boolean {
  return to === SPRINT && BEFORE_THE_SPRINT.includes(from);
}

/**
 * A reason as it will be written and read back. The frontmatter reader has no
 * escapes: a line break would break the record, and a quote at either end is
 * stripped on the way back. So whitespace collapses, double quotes become single
 * ones, and quotes at the ends go. Empty means there is no reason.
 */
export function cleanReason(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/"/g, "'")
    .trim()
    .replace(/^'+|'+$/g, "")
    .trim();
}

/** Does the card carry a recorded override — a record with a reason? */
export function hasDiscoveryOverride(fm: Frontmatter): boolean {
  const record = fm[OVERRIDE_KEY];
  return (
    typeof record === "object" &&
    record !== null &&
    !Array.isArray(record) &&
    (record.reason ?? "").trim() !== ""
  );
}

/** The epic in discovery that blocks this card, or null when nothing does. */
function blockingEpic(
  lytosDir: string,
  fm: Frontmatter
): { id: string; title: string } | null {
  const parentId = parentIdOf({ fm });
  if (parentId === "") return null;
  const type = scalar(fm.type).toLowerCase();
  if (type === SPIKE_TYPE || isEpic({ type }) || hasDiscoveryOverride(fm)) {
    return null;
  }

  const found = findIssueFile(lytosDir, parentId);
  const parent = found && parseFrontmatter(readFileSync(found.path, "utf-8"));
  if (!parent || scalar(parent.id).toUpperCase() !== parentId) return null;
  if (!isEpic({ type: scalar(parent.type) })) return null;
  if (phaseOf({ fm: parent }) !== DISCOVERY_PHASE) return null;
  return { id: parentId, title: scalar(parent.title) };
}

/**
 * Decide what happens to a card that is about to enter the sprint or the flow:
 * pass, pass on an explicit override (the record to write comes back), or refuse
 * with the epic and the ways forward.
 */
export function decideDiscoveryGate(
  lytosDir: string,
  fm: Frontmatter,
  options: GateOptions = {}
): GateDecision {
  const reason =
    options.override === undefined ? undefined : cleanReason(options.override);
  if (reason === "") {
    return {
      action: "refuse",
      reason: "override-needs-reason",
      message:
        "--discovery-override needs a reason: say why this leaf may enter the sprint before its epic is frozen.",
      hints: [
        'Example: --discovery-override "the owner needs it for the demo"',
      ],
    };
  }

  const epic = blockingEpic(lytosDir, fm);
  if (!epic) return { action: "pass" };

  if (reason !== undefined) {
    return {
      action: "override",
      record: {
        reason,
        date: today(),
        epic: epic.id,
        by: options.by ?? "unknown",
      },
    };
  }
  const leaf = scalar(fm.id) || "This card";
  return {
    action: "refuse",
    reason: "epic-in-discovery",
    epic: epic.id,
    message: `${leaf} is a leaf of ${epic.id} ("${epic.title}"), which is still in discovery: its leaves cannot enter the sprint until the epic is frozen.`,
    hints: [
      `Freeze the epic: set phase: frozen on ${epic.id} once its intent, thin slice and feasibility matrix are agreed (ADR-0009 §3).`,
      "Or make this card a feasibility study: set type: spike.",
      'Or, as the accountable human, override and say why: --discovery-override "<reason>" on `lyt move` or `lyt start` (the reason is recorded in the card).',
    ],
  };
}
