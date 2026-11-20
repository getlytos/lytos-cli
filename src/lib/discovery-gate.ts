/**
 * The discovery gate (ADR-0009 §3, ISS-0165, ISS-0175).
 *
 * Work committed to a sprint before its intent is settled makes the loop build on
 * a moving target. While an epic is in `phase: discovery`, its leaves cannot leave
 * the backlog: `lyt move` out of the icebox, the backlog or parked into any later
 * stage, `lyt start`, `lyt claim`, `lyt unpark` and `lyt close` refuse them, and
 * `lyt next` excludes them.
 *
 * A SEND-BACK is a move of a card that is already in the sprint or beyond
 * (2-sprint, 3-in-progress, 4-review, 5-done). It is not asked again: every way
 * into those stages is gated, so a card found there got in through the gate. A
 * card put there by hand is not the CLI's to police: `lyt lint` flags it.
 *
 * Who is not concerned:
 *   - a card with no parent epic (a fix, a chore), or whose parent is missing or
 *     is not an epic (`lyt lint` warns about those);
 *   - a leaf whose epic is `frozen`, or has no `phase` (the field is optional);
 *   - the epic itself.
 *
 * Two exemptions: a leaf of `type: spike` (a feasibility study or a measurement:
 * it produces the evidence the epic needs), and a human override, recorded in the
 * card under `discovery_override` (see `discovery-override.ts`). The override is
 * a PERSON's decision: the refusal says so, and a wrapper never passes it.
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
import {
  OVERRIDE_KEY,
  SPIKE_TYPE,
  cleanReason,
  hasDiscoveryOverride,
  readOverride,
  type DiscoveryOverride,
} from "./discovery-override.js";
import { findIssueFile } from "./show.js";

/** Stages past the backlog: a card that reaches one has been committed. */
const BEYOND_THE_BACKLOG = ["2-sprint", "3-in-progress", "4-review", "5-done"];
/** Stages a card is in before the sprint: nothing is committed yet. */
const BEFORE_THE_SPRINT = ["0-icebox", "1-backlog", "parked"];

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

/**
 * Does a move take a card out of the icebox, the backlog or parked into a stage
 * beyond the backlog? Then the gate runs, whatever the stage (the sprint, review
 * or done). Anything else is free: a move between the stages before the sprint,
 * or a send-back.
 */
export function leavesTheBacklog(from: string, to: string): boolean {
  return BEFORE_THE_SPRINT.includes(from) && BEYOND_THE_BACKLOG.includes(to);
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
 * Decide what happens to a card that is about to leave the backlog or to be
 * delivered: pass, pass on an explicit override (the record to write comes back),
 * or refuse with the epic and the ways forward.
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
        "--discovery-override needs a reason made of words: say why this leaf may go ahead before its epic is frozen.",
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
        by: cleanReason(options.by ?? "") || "unknown",
      },
    };
  }
  const leaf = scalar(fm.id) || "This card";
  const hints = [
    `Freeze the epic: set phase: frozen on ${epic.id} once its intent, thin slice and feasibility matrix are agreed (ADR-0009 §3).`,
    "Or make this card a feasibility study: set type: spike.",
    `Or a person must decide to let it through: --discovery-override "<reason>" on \`lyt move\`, \`lyt start\` or \`lyt close\`. The reason is recorded in the card, under that person's name. An agent or a wrapper never passes this option.`,
  ];
  const existing = readOverride(fm);
  if (existing.state === "invalid") {
    hints.push(
      `The ${OVERRIDE_KEY} in this card ${existing.problem} and does not count.`
    );
  }
  return {
    action: "refuse",
    reason: "epic-in-discovery",
    epic: epic.id,
    message: `${leaf} is a leaf of ${epic.id} ("${epic.title}"), which is still in discovery: its leaves cannot leave the backlog until the epic is frozen.`,
    hints,
  };
}
