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

import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { parseFrontmatter } from "./frontmatter.js";
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

/** The milestone ids, from the file names under `.lytos/milestones/`, sorted. */
export function listMilestoneIds(lytosDir: string): string[] {
  const dir = join(lytosDir, MILESTONES_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.slice(0, -".md".length))
    .filter((id) => MILESTONE_ID.test(id))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/**
 * Read one milestone file. Null when the id is not a plain file name (so nothing
 * outside the milestones folder is ever read) or when no such file exists.
 */
export function readMilestone(
  lytosDir: string,
  id: string
): MilestoneFile | null {
  if (!MILESTONE_ID.test(id)) return null;
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
