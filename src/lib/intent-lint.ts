/**
 * Lint rules of the intent layer (ADR-0009 §2, ISS-0163). The two rules of the
 * discovery gate (ISS-0175) live in `discovery-lint.ts` and run from here.
 *
 * Four rules over the `parent`, `phase` and `milestone` fields: `parent` is one
 * card id that points at an existing epic; the depth is at most two (an epic has
 * no `parent`); `phase` is set only on an epic and is `discovery` or `frozen`;
 * `milestone` names an existing file under `.lytos/milestones/`.
 *
 * Every rule is a warning with its remedy: nothing here can change an exit code,
 * and a card that adopts none of the fields is never flagged.
 *
 * Zero dependencies.
 */

import { existsSync } from "fs";
import { join } from "path";
import {
  CARD_ID,
  MILESTONES_DIR,
  MILESTONE_ID,
  PHASES,
  isEpic,
  isSet,
  loadIntentCards,
  scalar,
  type IntentCard,
} from "./intent.js";
import { discoveryFindings } from "./discovery-lint.js";
import type { LintFinding } from "./linter.js";

function warning(card: IntentCard, message: string, fix: string): LintFinding {
  return { severity: "warning", file: card.file, message, fix };
}

/** The `parent` rules: one id, an existing epic, depth at most two. */
function parentFindings(
  card: IntentCard,
  byId: Map<string, IntentCard>
): LintFinding[] {
  const raw = card.fm.parent;
  if (!isSet(raw)) return [];

  if (isEpic(card)) {
    return [
      warning(
        card,
        "Epic with a parent: an epic has no parent (depth is at most two)",
        "Remove `parent` from the epic: depth is at most two (epic, leaf). If this card is a leaf, give it its real `type` (ADR-0009 §1)"
      ),
    ];
  }
  if (typeof raw !== "string") {
    return [
      warning(
        card,
        "`parent` must be a single card id, found a list",
        "Name the one epic this card belongs to: `parent: ISS-XXXX` (ADR-0009 §2)"
      ),
    ];
  }

  const parentId = raw.trim();
  if (!CARD_ID.test(parentId)) {
    return [
      warning(
        card,
        `\`parent: ${parentId}\` is not a card id`,
        "Use the id of an epic, for example `parent: ISS-0010`"
      ),
    ];
  }
  return parentTargetFindings(card, parentId, byId.get(parentId.toUpperCase()));
}

/** What the parent card turned out to be: missing, a leaf, or a leaf with a parent. */
function parentTargetFindings(
  card: IntentCard,
  parentId: string,
  target: IntentCard | undefined
): LintFinding[] {
  if (!target) {
    return [
      warning(
        card,
        `\`parent: ${parentId}\` matches no card on the board`,
        `Create the epic ${parentId}, point \`parent\` at an existing epic, or remove the field (ADR-0009 §2)`
      ),
    ];
  }
  if (target === card) {
    return [
      warning(
        card,
        `\`parent: ${parentId}\` names the card itself: a card cannot be its own parent`,
        "Point `parent` at the epic this card belongs to, or remove the field (ADR-0009 §2)"
      ),
    ];
  }
  if (isEpic(target)) return [];

  const grandparent = scalar(target.fm.parent);
  if (grandparent !== "") {
    return [
      warning(
        card,
        `\`parent: ${parentId}\` is itself a child of ${grandparent}: depth would be three`,
        `There are no grandchildren: make this card a sibling under ${grandparent}, or turn ${parentId} into an epic (ADR-0009 §1)`
      ),
    ];
  }
  const kind = target.type || "card";
  return [
    warning(
      card,
      `\`parent: ${parentId}\` is a ${kind}, not an epic`,
      `Set \`type: epic\` on ${parentId}, or point \`parent\` at an epic (ADR-0009 §2)`
    ),
  ];
}

/** `phase` belongs to an epic and takes one of the two phases. */
function phaseFindings(card: IntentCard): LintFinding[] {
  const raw = card.fm.phase;
  if (!isSet(raw)) return [];
  const findings: LintFinding[] = [];

  if (!isEpic(card)) {
    findings.push(
      warning(
        card,
        "`phase` is set on a card that is not an epic",
        "Remove `phase`, or set `type: epic` if this card is the intent card of a group of leaves (ADR-0009 §2)"
      )
    );
  }
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!PHASES.includes(value)) {
    findings.push(
      warning(
        card,
        `Invalid \`phase\` value: ${typeof raw === "string" ? raw : "not a single word"}`,
        `Use one of: ${PHASES.join(", ")}`
      )
    );
  }
  return findings;
}

/** `milestone` names a file under `.lytos/milestones/`. */
function milestoneFindings(card: IntentCard, lytosDir: string): LintFinding[] {
  const raw = card.fm.milestone;
  if (!isSet(raw)) return [];

  const id = typeof raw === "string" ? raw.trim() : "";
  if (!MILESTONE_ID.test(id)) {
    return [
      warning(
        card,
        `\`milestone: ${id || "(not a single word)"}\` is not a valid milestone id`,
        `Use the id of a file under .lytos/${MILESTONES_DIR}/ (letters, digits, dots and hyphens)`
      ),
    ];
  }
  const rel = `.lytos/${MILESTONES_DIR}/${id}.md`;
  if (existsSync(join(lytosDir, MILESTONES_DIR, `${id}.md`))) return [];
  return [
    warning(
      card,
      `\`milestone: ${id}\` has no file ${rel}`,
      `Create ${rel}, or fix the id (ADR-0009 §2)`
    ),
  ];
}

/**
 * The four intent-layer lint rules (ADR-0009 §2), over every card on the board.
 * Warnings only. An archived card is looked up (it can be a parent) but not linted.
 */
export function lintIntent(lytosDir: string): LintFinding[] {
  const cards = loadIntentCards(lytosDir);
  const byId = new Map<string, IntentCard>();
  for (const card of cards) {
    if (!byId.has(card.id)) byId.set(card.id, card);
  }

  const findings: LintFinding[] = [];
  for (const card of cards) {
    if (card.archived) continue;
    findings.push(
      ...parentFindings(card, byId),
      ...phaseFindings(card),
      ...milestoneFindings(card, lytosDir),
      ...discoveryFindings(card, byId)
    );
  }
  return findings;
}
