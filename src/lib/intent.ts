/**
 * The intent layer (ADR-0009): the optional `parent`, `milestone` and `phase`
 * fields, the `epic` card type, and the cards that carry them.
 *
 * Three levels, never more: a milestone, an epic (type `epic`), a leaf (any other
 * card with a `parent`). The fields are optional and schema v2 is unchanged, so a
 * card that adopts none of them is read, linted and shown exactly as before.
 *
 * This module only reads. Validation lives in `intent-lint.ts` and in `lint` —
 * never in the frontmatter reader — so a surface that ignores the fields keeps
 * seeing valid flat cards.
 *
 * Zero dependencies.
 */

import { existsSync, readFileSync, readdirSync } from "fs";
import { basename, join } from "path";
import {
  parseFrontmatter,
  type Frontmatter,
  type FrontmatterValue,
} from "./frontmatter.js";

/** The card type that marks an epic (an intent card). */
export const EPIC_TYPE = "epic";

/** The two phases of an epic: until `frozen`, its leaves are not sprint work. */
export const PHASES = ["discovery", "frozen"];

/** Where milestone files live, relative to `.lytos/`. */
export const MILESTONES_DIR = "milestones";

/** A card id as the board writes it. */
export const CARD_ID = /^ISS-\d+$/i;

/** A milestone id is a file name: no separator, no leading dot. */
export const MILESTONE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** The board folders a card can live in (`parked` is a side-state, ADR-0004). */
const STAGES = [
  "0-icebox",
  "1-backlog",
  "2-sprint",
  "3-in-progress",
  "4-review",
  "5-done",
  "parked",
];

/** A card, reduced to what the intent layer reads. */
export interface IntentCard {
  /** Upper-cased card id. */
  id: string;
  title: string;
  type: string;
  /** The frontmatter status (the source of truth), else the folder. */
  status: string;
  /** Path relative to `.lytos/`, for findings. */
  file: string;
  /** True for a card under `issue-board/archive/`: closed, kept for reference. */
  archived: boolean;
  fm: Frontmatter;
}

/** A frontmatter value as a trimmed string; "" for a list, an object or nothing. */
export function scalar(value: FrontmatterValue | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Is the field present with a value? An empty string or an empty list is absent. */
export function isSet(value: FrontmatterValue | undefined): boolean {
  if (value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return value.trim() !== "";
}

/** Is this card an epic? */
export function isEpic(card: Pick<IntentCard, "type">): boolean {
  return card.type.toLowerCase() === EPIC_TYPE;
}

function readFolder(
  dir: string,
  relDir: string,
  archived: boolean
): IntentCard[] {
  if (!existsSync(dir)) return [];
  const cards: IntentCard[] = [];
  const files = readdirSync(dir)
    .filter((f) => f.startsWith("ISS-") && f.endsWith(".md"))
    .sort();

  for (const file of files) {
    const fm = parseFrontmatter(readFileSync(join(dir, file), "utf-8"));
    const id = fm ? scalar(fm.id) : "";
    if (!fm || id === "") continue; // `lint` already reports a card with no frontmatter
    cards.push({
      id: id.toUpperCase(),
      title: scalar(fm.title),
      type: scalar(fm.type),
      status: archived ? "5-done" : scalar(fm.status) || basename(dir),
      file: `${relDir}/${file}`,
      archived,
      fm,
    });
  }
  return cards;
}

/**
 * Every card of the project: the board folders, then the archive (a closed card
 * is still a parent or a child, and it counts as done).
 */
export function loadIntentCards(lytosDir: string): IntentCard[] {
  const boardDir = join(lytosDir, "issue-board");
  const cards: IntentCard[] = [];
  for (const stage of STAGES) {
    cards.push(
      ...readFolder(join(boardDir, stage), `issue-board/${stage}`, false)
    );
  }

  const archiveDir = join(boardDir, "archive");
  if (existsSync(archiveDir)) {
    for (const entry of readdirSync(archiveDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const rel = `issue-board/archive/${entry.name}`;
      cards.push(...readFolder(join(archiveDir, entry.name), rel, true));
    }
  }
  return cards;
}

/** The id of the epic a card points at, upper-cased; "" when it has none or names several. */
export function parentIdOf(card: Pick<IntentCard, "fm">): string {
  return scalar(card.fm.parent).toUpperCase();
}

/** The phase of an epic as written, "" when absent. */
export function phaseOf(card: Pick<IntentCard, "fm">): string {
  return scalar(card.fm.phase);
}

/** The milestone a card names itself, "" when absent. */
export function milestoneOf(card: Pick<IntentCard, "fm">): string {
  return scalar(card.fm.milestone);
}
