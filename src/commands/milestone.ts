/**
 * lyt milestone [id] — read a milestone and its derived progress (ADR-0009, ISS-0164).
 *
 * Read-only. A milestone is declared by a human in `.lytos/milestones/<id>.md`;
 * its progress is derived on every call from the epics and leaves that name it,
 * so it can never disagree with the cards. Without an id, every milestone is
 * listed with its progress.
 */

import { Command } from "commander";
import { existsSync } from "fs";
import { resolve } from "path";
import {
  listMilestoneIds,
  milestoneSummaries,
  milestoneView,
  type MilestoneView,
} from "../lib/milestone.js";
import { MILESTONES_DIR, MILESTONE_ID } from "../lib/intent.js";
import { leafLine, progressLabel } from "../lib/epic-render.js";
import {
  ok,
  error,
  bold,
  cyan,
  green,
  yellow,
  blue,
  dim,
} from "../lib/output.js";

function fail(message: string, json: boolean | undefined): never {
  if (json) console.log(JSON.stringify({ status: "error", message }));
  else error(message);
  process.exit(1);
}

function statusTag(status: string): string {
  if (status === "closed") return green(status);
  return status === "" ? dim("(no status)") : yellow(status);
}

function displayList(views: MilestoneView[]): void {
  console.error("");
  if (views.length === 0) {
    ok("No milestones.");
    console.error(
      `  ${dim(`A milestone is a file .lytos/${MILESTONES_DIR}/<id>.md (id, title, status, an "Exit criteria" checklist).`)}`
    );
    console.error("");
    return;
  }
  console.error(`  ${bold(cyan("Milestones"))} ${dim(`(${views.length})`)}`);
  console.error("");
  for (const v of views) {
    console.error(`  ${cyan(bold(v.id))}  ${v.title}  ${statusTag(v.status)}`);
    console.error(
      `      ${dim("leaves")}  ${progressLabel(v.leaves)}  ${dim("·")}  ${v.epicsAccepted.done}/${v.epicsAccepted.total} ${dim("epics accepted")}`
    );
    for (const problem of v.problems)
      console.error(`      ${problemLine(problem)}`);
    console.error("");
  }
}

function problemLine(problem: string): string {
  return `${yellow("!")} ${problem}`;
}

function displayDetail(v: MilestoneView): void {
  console.error("");
  console.error(
    `  ${cyan(bold(v.id))} ${dim("—")} ${cyan(bold(v.title || "(no title)"))}`
  );
  console.error(`  ${statusTag(v.status)}  ${dim("·")}  ${dim(v.file)}`);
  for (const problem of v.problems) console.error(`  ${problemLine(problem)}`);
  console.error("");
  console.error(`  ${blue("Leaves")}         ${progressLabel(v.leaves, 20)}`);
  console.error(
    `  ${blue("Epics")}          ${v.epicsAccepted.done}/${v.epicsAccepted.total} accepted`
  );
  if (v.criteria.total > 0) {
    console.error(
      `  ${blue("Exit criteria")}  ${v.criteria.done}/${v.criteria.total}`
    );
    for (const c of v.exitCriteria) {
      console.error(`    ${c.done ? green("✓") : yellow("○")} ${c.text}`);
    }
  }
  for (const epic of v.epics) {
    console.error("");
    const tag = epic.phase ? `  ${dim(epic.phase)}` : "";
    console.error(
      `  ${cyan(epic.id)}  ${bold(epic.title)}${tag}  ${progressLabel(epic.progress)}`
    );
    for (const leaf of epic.leaves) console.error(`    ${leafLine(leaf)}`);
  }
  if (v.otherLeaves.length > 0) {
    console.error("");
    console.error(`  ${blue("Other leaves")}`);
    for (const leaf of v.otherLeaves) console.error(`    ${leafLine(leaf)}`);
  }
  console.error("");
}

export const milestoneCommand = new Command("milestone")
  .description(
    "Show a milestone and its progress, derived from its epics and leaves (read-only)"
  )
  .argument(
    "[id]",
    `Milestone id (a file name under .lytos/${MILESTONES_DIR}/)`
  )
  .option("--json", "Output as JSON", false)
  .on("--help", () => {
    console.log("");
    console.log("Examples:");
    console.log(
      "  lyt milestone              # every milestone, with its progress"
    );
    console.log(
      "  lyt milestone v1.7         # one milestone: epics, leaves, exit criteria"
    );
    console.log("  lyt milestone v1.7 --json");
    console.log("");
    console.log(
      "Progress is never stored: it is counted from the epics and leaves that name"
    );
    console.log(
      "the milestone (`milestone:` in their frontmatter), on every call."
    );
  })
  .action((id: string | undefined, opts: { json?: boolean }) => {
    const lytosDir = resolve(process.cwd(), ".lytos");
    if (!existsSync(lytosDir)) {
      error("No .lytos/ directory found. Run `lyt init` first.");
      process.exit(2);
    }

    if (id === undefined) {
      const views = milestoneSummaries(lytosDir);
      if (opts.json) console.log(JSON.stringify(views, null, 2));
      else displayList(views);
      return;
    }

    if (!MILESTONE_ID.test(id)) {
      fail(
        `"${id}" is not a milestone id: it is the file name under .lytos/${MILESTONES_DIR}/, without the extension.`,
        opts.json
      );
    }
    const view = milestoneView(lytosDir, id);
    if (!view) {
      const known = listMilestoneIds(lytosDir);
      const hint =
        known.length > 0
          ? `Known milestones: ${known.join(", ")}.`
          : `No milestone file exists yet under .lytos/${MILESTONES_DIR}/.`;
      fail(`Milestone ${id} not found. ${hint}`, opts.json);
    }

    if (opts.json) console.log(JSON.stringify(view, null, 2));
    else displayDetail(view);
  });
