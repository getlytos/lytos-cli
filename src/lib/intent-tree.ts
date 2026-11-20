/**
 * The derived tree and progress of the intent layer (ADR-0009 §2, ISS-0164).
 *
 * Children and progress are computed on every read from the `parent` fields of the
 * leaves — never stored, never read from a list or a count written in a card
 * (ADR-0002, the same principle as BOARD.md). Nothing here writes anything.
 *
 * Progress counts leaves: a leaf is done when its card is in `5-done`, and an
 * archived card is done by definition, so archiving never lowers a figure. An
 * epic's own acceptance is its own card moving to `5-done`, not the sum of its
 * leaves (ADR-0009 §1): it is counted separately, by the milestone.
 *
 * Zero dependencies.
 */

import { dirname } from "path";
import type { Frontmatter } from "./frontmatter.js";
import { readOverride } from "./discovery-override.js";
import {
  isEpic,
  isSet,
  loadIntentCards,
  milestoneOf,
  parentIdOf,
  phaseOf,
  scalar,
  type IntentCard,
} from "./intent.js";

/** The status a card has when it is finished (an archived card reads as this). */
const DONE_STATUS = "5-done";

export interface Progress {
  done: number;
  total: number;
  /** Rounded; 0 when there is nothing to count yet. */
  percent: number;
}

export interface LeafView {
  id: string;
  title: string;
  status: string;
  /** Path relative to `.lytos/`. */
  file: string;
}

export interface EpicView {
  id: string;
  title: string;
  status: string;
  phase: string;
  milestone: string;
  file: string;
  leaves: LeafView[];
  progress: Progress;
}

/** The epic a leaf points at, as `lyt show` reports it. */
export interface ParentView {
  id: string;
  title: string;
  status: string;
  phase: string;
  /** False when no card on the board has this id. */
  found: boolean;
}

/** The record of a human override of the discovery gate, as written in the card. */
export interface OverrideView {
  reason: string;
  date: string;
  epic: string;
  by: string;
}

/** What `lyt show` adds for a card that takes part in the intent layer. */
export interface IntentDetail {
  parent?: ParentView;
  milestone?: string;
  phase?: string;
  /** Present on an epic: its leaves and their progress. */
  leaves?: LeafView[];
  progress?: Progress;
  /** Present on a leaf that was let into the sprint by a human override (ISS-0165). */
  discoveryOverride?: OverrideView;
}

/** Numeric-aware so that ISS-0009 sorts before ISS-0010 and ISS-10000 after. */
export function byId(a: { id: string }, b: { id: string }): number {
  return a.id.localeCompare(b.id, undefined, { numeric: true });
}

/** A progress figure from a count of done items over a total. */
export function ratio(done: number, total: number): Progress {
  return {
    done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

/** Done over total, from a list of card statuses. */
export function progressOf(statuses: readonly string[]): Progress {
  return ratio(
    statuses.filter((s) => s === DONE_STATUS).length,
    statuses.length
  );
}

/** A card as one line of a tree. */
export function leafView(card: IntentCard): LeafView {
  return {
    id: card.id,
    title: card.title,
    status: card.status,
    file: card.file,
  };
}

/** An epic and the given leaves, in the shape every view prints. */
export function epicViewOf(epic: IntentCard, leaves: IntentCard[]): EpicView {
  const views = [...leaves].sort(byId).map(leafView);
  return {
    id: epic.id,
    title: epic.title,
    status: epic.status,
    phase: phaseOf(epic),
    milestone: milestoneOf(epic),
    file: epic.file,
    leaves: views,
    progress: progressOf(views.map((l) => l.status)),
  };
}

/** The leaves of every epic, keyed by the epic's id: one pass over the cards. */
export function groupLeaves(cards: IntentCard[]): Map<string, IntentCard[]> {
  const groups = new Map<string, IntentCard[]>();
  for (const card of cards) {
    const parent = parentIdOf(card);
    if (isEpic(card) || parent === "") continue;
    const group = groups.get(parent);
    if (group) group.push(card);
    else groups.set(parent, [card]);
  }
  return groups;
}

/**
 * Every live epic with its leaves. A card is a leaf only when its `parent` names
 * an epic: an orphan, a third level or an epic under an epic is left where it is
 * (`lyt lint` warns about each). An archived epic is history and is left out.
 */
export function buildEpicViews(cards: IntentCard[]): EpicView[] {
  const groups = groupLeaves(cards);
  return cards
    .filter((c) => isEpic(c) && !c.archived)
    .sort(byId)
    .map((epic) => epicViewOf(epic, groups.get(epic.id) ?? []));
}

/** The epics of a board directory (`.lytos/issue-board`), read from the cards. */
export function collectEpics(boardDir: string): EpicView[] {
  return buildEpicViews(loadIntentCards(dirname(boardDir)));
}

/**
 * The milestone a card belongs to: the one it names, else the one its epic names.
 * An epic only ever has its own.
 */
export function effectiveMilestone(
  card: IntentCard,
  byCardId: ReadonlyMap<string, IntentCard>
): string {
  const own = milestoneOf(card);
  if (own !== "" || isEpic(card)) return own;
  const parent = byCardId.get(parentIdOf(card));
  return parent && isEpic(parent) ? milestoneOf(parent) : "";
}

function parentView(parentId: string, cards: IntentCard[]): ParentView {
  const parent = cards.find((c) => c.id === parentId);
  if (!parent) {
    return { id: parentId, title: "", status: "", phase: "", found: false };
  }
  return {
    id: parent.id,
    title: parent.title,
    status: parent.status,
    phase: phaseOf(parent),
    found: true,
  };
}

/**
 * What `lyt show` adds for one card, or undefined when the card takes no part in
 * the intent layer — so a card that adopts none of the fields shows exactly as
 * before, and costs no extra read of the board.
 */
export function describeIntent(
  lytosDir: string,
  id: string,
  fm: Frontmatter
): IntentDetail | undefined {
  const self = { type: scalar(fm.type), fm };
  const epic = isEpic(self);
  if (!epic && !isSet(fm.parent) && !isSet(fm.milestone) && !isSet(fm.phase)) {
    return undefined;
  }

  const cards = loadIntentCards(lytosDir);
  const detail: IntentDetail = {};
  if (milestoneOf(self) !== "") detail.milestone = milestoneOf(self);
  if (phaseOf(self) !== "") detail.phase = phaseOf(self);
  if (epic) {
    const own = cards.find((c) => c.id === id.toUpperCase() && isEpic(c));
    const view = own && epicViewOf(own, groupLeaves(cards).get(own.id) ?? []);
    detail.leaves = view?.leaves ?? [];
    detail.progress = view?.progress ?? progressOf([]);
  }
  const parentId = parentIdOf(self);
  if (parentId !== "") detail.parent = parentView(parentId, cards);
  // Only an override that counts is shown as one (ISS-0175).
  const override = readOverride(fm);
  if (override.state === "valid") detail.discoveryOverride = override.record;
  return detail;
}
