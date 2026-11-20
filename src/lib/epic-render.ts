/**
 * Rendering of epics for `lyt board` (ISS-0164): the Epics section of BOARD.md
 * and its terminal twin, plus the progress label shared with `lyt show` and
 * `lyt milestone`.
 *
 * Everything printed here is derived from the cards on each call
 * (see `intent-tree.ts`); nothing is stored or written back.
 *
 * Zero dependencies.
 */

import type { EpicView, LeafView, Progress } from "./intent-tree.js";
import { bold, cyan, dim, green, progressBar, yellow } from "./output.js";

const BAR_WIDTH = 12;
const MAX_TITLE = 50;

/** A progress figure as a bar, `done/total` and a percentage; "no leaf yet" at 0 of 0. */
export function progressLabel(progress: Progress, width = BAR_WIDTH): string {
  if (progress.total === 0) return dim("no leaf yet");
  const colorFn =
    progress.percent === 100 ? green : progress.percent >= 50 ? yellow : dim;
  return `${progressBar(progress.percent, width)}  ${colorFn(`${progress.done}/${progress.total}`)}  ${colorFn(`${progress.percent}%`)}`;
}

function clip(title: string): string {
  return title.length > MAX_TITLE ? title.slice(0, MAX_TITLE - 1) + "…" : title;
}

/** A path relative to `.lytos/` as BOARD.md (in `issue-board/`) links to it. */
function boardLink(id: string, file: string): string {
  return `[${id}](${file.replace(/^issue-board\//, "")})`;
}

/** The Epics section of BOARD.md; the caller adds it only when there is an epic. */
export function renderEpicsMarkdown(epics: EpicView[]): string[] {
  const lines = [
    "## Epics",
    "",
    "*Derived from the `parent` field of each card. Nothing here is written by hand.*",
    "",
  ];
  for (const epic of epics) {
    const count =
      epic.progress.total === 0
        ? "no leaf yet"
        : `${epic.progress.done}/${epic.progress.total} leaves done (${epic.progress.percent}%)`;
    const tags = [epic.phase, epic.milestone].filter((t) => t !== "");
    const suffix = tags.length > 0 ? ` · ${tags.join(" · ")}` : "";
    lines.push(
      `- ${boardLink(epic.id, epic.file)} ${epic.title} — ${count}${suffix}`
    );
    for (const leaf of epic.leaves) {
      lines.push(
        `  - ${boardLink(leaf.id, leaf.file)} ${leaf.title} — ${leaf.status}`
      );
    }
  }
  lines.push("");
  return lines;
}

/** One leaf as a line of a terminal tree: a tick or a circle, id, title, status. */
export function leafLine(leaf: LeafView): string {
  const mark = leaf.status === "5-done" ? green("✓") : yellow("○");
  return `${mark} ${cyan(leaf.id)}  ${clip(leaf.title)}  ${dim(leaf.status)}`;
}

/** The epics under the board in the terminal: each with its leaves and progress. */
export function displayEpics(epics: EpicView[]): void {
  if (epics.length === 0) return;
  console.log(`  ${bold(cyan(`▸ EPICS (${epics.length})`))}`);
  console.log(`  ${dim("│")}`);
  for (const epic of epics) {
    const tags = [epic.phase, epic.milestone]
      .filter((t) => t !== "")
      .map((t) => dim(t));
    const head = [cyan(epic.id), bold(clip(epic.title)), ...tags];
    console.log(
      `  ${dim("│")} ${head.join("  ")}  ${progressLabel(epic.progress)}`
    );
    epic.leaves.forEach((leaf, i) => {
      const branch = i === epic.leaves.length - 1 ? "└── " : "├── ";
      console.log(`  ${dim("│")}    ${dim(branch)}${leafLine(leaf)}`);
    });
    console.log(`  ${dim("│")}`);
  }
  console.log("");
}
