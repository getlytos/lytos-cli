/**
 * lyt show [ISS-XXXX] — Display issue detail with progress.
 *
 * With an argument: shows a single issue with checklist, progress bar,
 * metadata, and dependency status.
 * Without argument: shows all in-progress issues with progress summary.
 */

import { Command } from "commander";
import { existsSync } from "fs";
import { resolve } from "path";
import {
  parseIssueDetail,
  getInProgressSummaries,
  type IssueDetail,
  type IssueSummary,
} from "../lib/show.js";
import type { IntentDetail } from "../lib/intent-tree.js";
import { leafLine, progressLabel } from "../lib/epic-render.js";
import {
  ok,
  error,
  bold,
  green,
  yellow,
  blue,
  cyan,
  dim,
  progressBar,
} from "../lib/output.js";

function statusLabel(status: string): string {
  const labels: Record<string, (t: string) => string> = {
    "0-icebox": dim,
    "1-backlog": dim,
    "2-sprint": blue,
    "3-in-progress": yellow,
    "4-review": blue,
    "5-done": green,
  };
  const colorFn = labels[status] || dim;
  return colorFn(status);
}

function displayDetail(issue: IssueDetail): void {
  console.error("");
  console.error(
    `  ${cyan(bold(issue.id))} ${dim("—")} ${cyan(bold(issue.title))}`
  );
  console.error(
    `  ${statusLabel(issue.status)}  ${dim("·")}  ${blue("Effort:")} ${issue.effort}  ${dim("·")}  ${issue.daysOpen}d`
  );
  if (issue.status === "parked" && issue.parkReason) {
    const since = issue.parkedAt ? ` ${dim(`(since ${issue.parkedAt})`)}` : "";
    console.error(
      `  ${yellow("⏸ Parked:")} ${yellow(issue.parkReason)}${since}`
    );
  }
  console.error("");

  // Progress
  if (issue.checklistTotal > 0) {
    const pct = issue.progress;
    const colorFn = pct === 100 ? green : pct >= 50 ? yellow : blue;
    console.error(
      `  ${progressBar(pct)}  ${colorFn(bold(`${issue.checklistDone}/${issue.checklistTotal}`))} ${colorFn(`${pct}%`)}`
    );
    console.error("");

    // Checklist
    for (const item of issue.checklist) {
      const icon = item.done ? green("✓") : blue("○");
      const text = item.done ? dim(item.text) : item.text;
      console.error(`  ${icon} ${text}`);
    }
  } else {
    console.error(`  ${dim("No checklist items")}`);
  }

  console.error("");

  // Loop-eligibility (ADR-0004 §1) from the DoD verification modes (ISS-0101)
  if (issue.dod.hasDod) {
    const d = issue.dod;
    const counts = `${d.machine} auto${d.reviewer > 0 ? ` · ${d.reviewer} reviewer` : ""}${d.human > 0 ? ` · ${d.human} human` : ""}`;
    if (d.loopEligible) {
      console.error(
        `  ${blue("Loop:")} ${green("eligible")} ${dim(`(DoD ${counts})`)}`
      );
    } else {
      console.error(
        `  ${blue("Loop:")} ${yellow("ineligible")} ${dim(`(DoD ${counts} — no machine gate: work it by hand; reviewer items go to the auditor)`)}`
      );
    }
    if (d.unqualified > 0) {
      console.error(
        `  ${dim(`↳ ${d.unqualified} DoD item(s) without a verify: marker — 'lyt lint' flags them`)}`
      );
    }
    console.error("");
  }

  // Metadata
  const meta: string[] = [];
  if (issue.skill) meta.push(`${blue("Skill:")} ${issue.skill}`);
  if (issue.skillsAux.length > 0)
    meta.push(`${blue("Aux:")} ${issue.skillsAux.join(", ")}`);
  if (issue.branch) meta.push(`${blue("Branch:")} ${issue.branch}`);
  if (issue.complexity) meta.push(`${blue("Complexity:")} ${issue.complexity}`);
  for (const m of meta) {
    console.error(`  ${m}`);
  }

  // Dependencies
  if (issue.dependencies.length > 0) {
    console.error("");
    console.error(`  ${blue("Dependencies:")}`);
    for (const dep of issue.dependencies) {
      const icon = dep.done ? green("✓") : yellow("○");
      const status = dep.done ? green("done") : yellow("pending");
      console.error(
        `    ${icon} ${dep.id} ${dim("—")} ${dep.title} ${dim("(")}${status}${dim(")")}`
      );
    }
  }

  if (issue.intent) displayIntent(issue.intent);

  console.error("");
}

/** The intent layer (ADR-0009): the epic of a leaf, the leaves of an epic. */
function displayIntent(intent: IntentDetail): void {
  const rows: string[] = [];
  if (intent.parent) {
    const p = intent.parent;
    rows.push(
      p.found
        ? `${blue("Epic:")} ${p.id} ${dim("—")} ${p.title}${p.phase ? ` ${dim(`(${p.phase})`)}` : ""}`
        : `${blue("Epic:")} ${p.id} ${yellow("(not found)")}`
    );
  }
  if (intent.leaves && intent.phase) {
    rows.push(`${blue("Phase:")} ${intent.phase}`);
  }
  if (intent.milestone) rows.push(`${blue("Milestone:")} ${intent.milestone}`);
  if (intent.progress && intent.leaves) {
    rows.push(`${blue("Leaves:")} ${progressLabel(intent.progress)}`);
  }
  if (rows.length === 0) return;

  console.error("");
  for (const row of rows) console.error(`  ${row}`);
  for (const leaf of intent.leaves ?? [])
    console.error(`    ${leafLine(leaf)}`);
}

function displaySummaries(summaries: IssueSummary[]): void {
  console.error("");
  console.error(
    `  ${yellow(bold("In Progress"))} ${dim(`(${summaries.length})`)}`
  );
  console.error("");

  for (const s of summaries) {
    const pct = s.progress;
    const colorFn = pct === 100 ? green : pct >= 50 ? yellow : blue;
    const progressStr =
      s.checklistTotal > 0
        ? `${progressBar(pct, 15)}  ${colorFn(`${s.checklistDone}/${s.checklistTotal}`)} ${colorFn(`${pct}%`)}`
        : dim("no checklist");

    console.error(`  ${cyan(s.id)}  ${cyan(bold(s.title))}`);
    console.error(
      `           ${progressStr}  ${dim(`·  ${s.effort}  ·  ${s.daysOpen}d`)}`
    );
    console.error("");
  }
}

export const showCommand = new Command("show")
  .description("Display issue detail with progress, or all in-progress issues")
  .argument("[issue-id]", "Issue ID (e.g. ISS-0028)")
  .option("--json", "Output as JSON", false)
  .action((issueId: string | undefined, opts) => {
    const cwd = process.cwd();
    const lytosDir = resolve(cwd, ".lytos");

    if (!existsSync(lytosDir)) {
      error("No .lytos/ directory found. Run `lyt init` first.");
      process.exit(2);
    }

    if (issueId) {
      // Single issue detail
      const detail = parseIssueDetail(lytosDir, issueId);
      if (!detail) {
        error(`Issue ${issueId} not found on the board.`);
        process.exit(1);
      }

      if (opts.json) {
        console.log(JSON.stringify(detail, null, 2));
      } else {
        displayDetail(detail);
      }
    } else {
      // All in-progress issues
      const summaries = getInProgressSummaries(lytosDir);

      if (opts.json) {
        console.log(JSON.stringify(summaries, null, 2));
        return;
      }

      if (summaries.length === 0) {
        console.error("");
        ok("No issues in progress.");
        console.error("");
        return;
      }

      displaySummaries(summaries);
    }
  });
