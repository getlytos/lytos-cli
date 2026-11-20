/**
 * Milestone files and their derived progress (ADR-0009 §1, ISS-0164).
 *
 * A milestone is a product-level goal with exit criteria — a version. It lives in
 * `.lytos/milestones/<id>.md`:
 *
 *   ---
 *   id: v1.7
 *   title: "The intent layer"
 *   status: open            # open | closed — the owner's acceptance
 *   ---
 *   ## Exit criteria
 *   - [ ] a criterion, ticked by the owner when it holds
 *
 * The criteria are a checklist in the body, not a frontmatter list: the
 * dependency-free frontmatter reader splits a list on commas, which a sentence
 * does not survive. The file is declared by a human and read here, never written.
 *
 * Progress is derived on every read from the epics and leaves that name the
 * milestone, directly or through their epic (ADR-0002): no count is stored.
 *
 * Zero dependencies.
 */

import { existsSync, lstatSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { parseFrontmatter } from "./frontmatter.js";
import { symlinkOnPath } from "./safe-write.js";
import {
  MILESTONES_DIR,
  MILESTONE_ID,
  isEpic,
  loadIntentCards,
  milestoneOf,
  parentIdOf,
  scalar,
  type IntentCard,
} from "./intent.js";
import {
  byId,
  effectiveMilestone,
  epicViewOf,
  leafView,
  progressOf,
  ratio,
  type EpicView,
  type LeafView,
  type Progress,
} from "./intent-tree.js";

const HEADING = /^(#{1,6})[ \t]+(.*)$/;
const CRITERIA_HEADING = /^exit criteria\b/i;
const CRITERION = /^\s*[-*+]\s+\[([ xX])\]\s+(.+?)\s*$/;

export interface Criterion {
  text: string;
  done: boolean;
}

/** What the file says, and what is wrong with it. */
export interface MilestoneFile {
  /** The file name, which is the id. */
  id: string;
  title: string;
  status: string;
  /** Path relative to the project root. */
  file: string;
  exitCriteria: Criterion[];
  /** Why the file is malformed; empty when it is fine. */
  problems: string[];
}

/** A milestone with its derived progress. */
export interface MilestoneView extends MilestoneFile {
  /** Leaves done over leaves that name the milestone. */
  leaves: Progress;
  /** Epics whose own card is done over epics that name the milestone. */
  epicsAccepted: Progress;
  /** Exit criteria ticked over declared. */
  criteria: Progress;
  epics: EpicView[];
  /** Leaves of the milestone that sit under no epic of it. */
  otherLeaves: LeafView[];
}

/** The checklist items of the `## Exit criteria` section, and only those. */
function parseCriteria(content: string): Criterion[] {
  const items: Criterion[] = [];
  let level = 0;
  for (const line of content.split(/\r?\n/)) {
    const heading = line.match(HEADING);
    if (heading) {
      const depth = heading[1].length;
      if (CRITERIA_HEADING.test(heading[2].trim())) level = depth;
      else if (depth <= level) level = 0;
      continue;
    }
    const item = level > 0 ? line.match(CRITERION) : null;
    if (item) items.push({ text: item[2], done: item[1] !== " " });
  }
  return items;
}

/** A path as the messages show it: relative to the project root. */
function shownPath(...parts: string[]): string {
  return [".lytos", MILESTONES_DIR, ...parts].join("/");
}

/**
 * Why a milestone path is not read: a symbolic link anywhere on it (the milestones
 * folder included), or something that is not a regular file. Null for a regular
 * file, and for a file that is not there. Like `exchanges`, a milestone is never
 * followed through a link, and never read from a directory (ISS-0178).
 */
export function milestoneRefusal(lytosDir: string, id: string): string | null {
  const folder = join(lytosDir, MILESTONES_DIR);
  if (symlinkOnPath(folder, lytosDir)) {
    return `${shownPath()} is a symbolic link: it is not read`;
  }
  const path = join(folder, `${id}.md`);
  const shown = shownPath(`${id}.md`);
  let stat;
  try {
    stat = lstatSync(path);
  } catch {
    return null; // not there: the caller says so
  }
  if (stat.isSymbolicLink())
    return `${shown} is a symbolic link: it is not read`;
  if (stat.isDirectory()) {
    return `${shown} is a directory, not a regular file: it is not read`;
  }
  return stat.isFile()
    ? null
    : `${shown} is not a regular file: it is not read`;
}

/** The names of the `.md` entries under the milestones folder, sorted. */
function milestoneEntries(lytosDir: string): string[] {
  const dir = join(lytosDir, MILESTONES_DIR);
  if (symlinkOnPath(dir, lytosDir) || !existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.slice(0, -".md".length))
    .filter((id) => MILESTONE_ID.test(id))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/** The milestone ids, from the regular files under `.lytos/milestones/`, sorted. */
export function listMilestoneIds(lytosDir: string): string[] {
  return milestoneEntries(lytosDir).filter(
    (id) => milestoneRefusal(lytosDir, id) === null
  );
}

/** The entries `listMilestoneIds` left out, each with why, so a command can say so. */
export function skippedMilestones(lytosDir: string): string[] {
  const skipped: string[] = [];
  for (const id of milestoneEntries(lytosDir)) {
    const refusal = milestoneRefusal(lytosDir, id);
    if (refusal) skipped.push(refusal);
  }
  return skipped;
}

/**
 * Read one milestone file. Null when the id is not a plain file name (so nothing
 * outside the milestones folder is ever read), when the path is a link or not a
 * regular file (`milestoneRefusal` says which), or when no such file exists.
 */
export function readMilestone(
  lytosDir: string,
  id: string
): MilestoneFile | null {
  if (!MILESTONE_ID.test(id)) return null;
  if (milestoneRefusal(lytosDir, id) !== null) return null;
  const path = join(lytosDir, MILESTONES_DIR, `${id}.md`);
  if (!existsSync(path)) return null;

  const content = readFileSync(path, "utf-8");
  const fm = parseFrontmatter(content);
  const problems: string[] = [];
  if (!fm) {
    problems.push("no YAML frontmatter (expected id, title and status)");
  } else if (scalar(fm.id) === "") {
    problems.push("the frontmatter has no id");
  } else if (scalar(fm.id) !== id) {
    problems.push(
      `the frontmatter id "${scalar(fm.id)}" differs from the file name "${id}"`
    );
  }
  return {
    id,
    title: fm ? scalar(fm.title) : "",
    status: fm ? scalar(fm.status) : "",
    file: `.lytos/${MILESTONES_DIR}/${id}.md`,
    exitCriteria: parseCriteria(content),
    problems,
  };
}

/**
 * A milestone and its progress, derived from the cards. Pass `cards` to read the
 * board once for several milestones.
 */
export function milestoneView(
  lytosDir: string,
  id: string,
  cards: IntentCard[] = loadIntentCards(lytosDir)
): MilestoneView | null {
  const file = readMilestone(lytosDir, id);
  if (!file) return null;

  const byCardId = new Map<string, IntentCard>();
  for (const card of cards) {
    if (!byCardId.has(card.id)) byCardId.set(card.id, card);
  }
  const epics = cards
    .filter((c) => isEpic(c) && milestoneOf(c) === id)
    .sort(byId);
  const leaves = cards.filter(
    (c) => !isEpic(c) && effectiveMilestone(c, byCardId) === id
  );
  const epicIds = new Set(epics.map((e) => e.id));

  return {
    ...file,
    leaves: progressOf(leaves.map((l) => l.status)),
    epicsAccepted: progressOf(epics.map((e) => e.status)),
    criteria: ratio(
      file.exitCriteria.filter((c) => c.done).length,
      file.exitCriteria.length
    ),
    epics: epics.map((epic) =>
      epicViewOf(
        epic,
        leaves.filter((l) => parentIdOf(l) === epic.id)
      )
    ),
    otherLeaves: leaves
      .filter((l) => !epicIds.has(parentIdOf(l)))
      .sort(byId)
      .map(leafView),
  };
}

/** Every milestone with its progress, sorted by id. The board is read once. */
export function milestoneSummaries(lytosDir: string): MilestoneView[] {
  const cards = loadIntentCards(lytosDir);
  const views: MilestoneView[] = [];
  for (const id of listMilestoneIds(lytosDir)) {
    const view = milestoneView(lytosDir, id, cards);
    if (view) views.push(view);
  }
  return views;
}
