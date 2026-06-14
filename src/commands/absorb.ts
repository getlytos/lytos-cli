/**
 * lyt absorb — merge the AI-wrapper session journal into an issue's schema v2
 * audit fields (phase 4 of schema v2, ADR-0003).
 *
 * Reads `.lytos/.runtime/session.jsonl`, aggregates it for the active issue,
 * and writes `ai_implementer` / `ai_reviewer` / tokens / cost / skills_used.
 * Idempotent (SET semantics). Dry-run shows the delta without writing.
 */

import { Command } from "commander";
import { existsSync, readdirSync } from "fs";
import { resolve, join } from "path";
import { execFileSync } from "child_process";
import { locateIssue, moveIssue } from "../lib/issue-ops.js";
import { readJournal, absorbPlan, type AbsorbResult } from "../lib/absorb.js";
import { type Frontmatter } from "../lib/frontmatter.js";
import { ok, info, warn, error, bold, cyan, green, dim } from "../lib/output.js";

const ISSUE_ID_RE = /ISS-\d{4}/i;

/** Current git branch name, or null when not in a git repo. */
function currentBranch(): string | null {
  try {
    return execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      encoding: "utf-8",
      stdio: "pipe",
    }).trim() || null;
  } catch {
    return null;
  }
}

/** The single in-progress issue ID, or null when zero or many. */
function loneInProgressIssue(lytosDir: string): string | null {
  const dir = join(lytosDir, "issue-board", "3-in-progress");
  if (!existsSync(dir)) return null;
  const ids = readdirSync(dir)
    .filter((f) => f.startsWith("ISS-") && f.endsWith(".md"))
    .map((f) => (f.match(ISSUE_ID_RE)?.[0] ?? "").toUpperCase())
    .filter(Boolean);
  return ids.length === 1 ? ids[0] : null;
}

/** Resolve the active issue: explicit arg → branch name → lone in-progress. */
function resolveActiveIssue(lytosDir: string, explicit?: string): string | null {
  if (explicit) return explicit.toUpperCase();

  const branch = currentBranch();
  const fromBranch = branch?.match(ISSUE_ID_RE)?.[0];
  if (fromBranch) return fromBranch.toUpperCase();

  return loneInProgressIssue(lytosDir);
}

function printReport(result: AbsorbResult, applied: boolean): void {
  console.error("");
  console.error(`  ${cyan(bold(`Absorb ${result.issue}${applied ? "" : " (dry-run)"}`))}`);
  console.error("");

  const entries = Object.entries(result.delta);
  if (entries.length === 0) {
    info("Journal has nothing to absorb for this issue.");
    console.error("");
    return;
  }

  for (const [key, value] of entries) {
    if (Array.isArray(value)) {
      console.error(`    ${green("+")} ${key}: [${value.join(", ")}]`);
    } else if (typeof value === "object" && value !== null) {
      console.error(`    ${green("+")} ${key}:`);
      for (const [k, v] of Object.entries(value)) {
        console.error(`        ${k}: ${v}`);
      }
    } else {
      console.error(`    ${green("+")} ${key}: ${value}`);
    }
  }

  console.error("");
  console.error(
    `  ${result.linesUsed} journal line${result.linesUsed === 1 ? "" : "s"} used${
      result.malformed > 0 ? dim(` · ${result.malformed} malformed skipped`) : ""
    }`
  );
  console.error("");
}

export const absorbCommand = new Command("absorb")
  .description("Merge the AI-wrapper session journal into an issue's audit fields (dry-run by default)")
  .argument("[issue-id]", "Issue to absorb into (default: resolved from branch or in-progress)")
  .option("--apply", "Write the changes (default is a dry run)", false)
  .option("--json", "Output the result as JSON", false)
  .on("--help", () => {
    console.log("");
    console.log("Examples:");
    console.log("  lyt absorb                 # dry-run on the active issue");
    console.log("  lyt absorb --apply         # write audit fields to the active issue");
    console.log("  lyt absorb ISS-0076 --apply");
  })
  .action((issueArg: string | undefined, opts) => {
    const cwd = process.cwd();
    const lytosDir = resolve(cwd, ".lytos");

    if (!existsSync(lytosDir)) {
      error("No .lytos/ directory found. Run `lyt init` first.");
      process.exit(2);
    }

    const issueId = resolveActiveIssue(lytosDir, issueArg);
    if (!issueId) {
      error(
        "Could not resolve the active issue. Pass one explicitly: `lyt absorb ISS-XXXX` " +
          "(no ISS-#### in the branch name and not exactly one issue in 3-in-progress/)."
      );
      process.exit(1);
    }

    const issue = locateIssue(lytosDir, issueId);
    if (!issue) {
      error(`Issue ${issueId} not found on the board.`);
      process.exit(1);
    }

    const journal = readJournal(lytosDir);
    if (journal === null) {
      if (opts.json) {
        console.log(JSON.stringify({ issue: issueId, delta: {}, linesUsed: 0, malformed: 0, applied: false }));
        return;
      }
      warn(`No journal at .lytos/.runtime/session.jsonl — nothing to absorb for ${issueId}.`);
      process.exit(0);
    }

    const result = absorbPlan(journal, issueId);
    const hasChanges = Object.keys(result.delta).length > 0;

    let applied = false;
    if (opts.apply && hasChanges) {
      moveIssue(lytosDir, issue, issue.dir, { ...result.delta, updated: today() } as Frontmatter);
      applied = true;
    }

    if (opts.json) {
      console.log(JSON.stringify({ ...result, applied }, null, 2));
      return;
    }

    printReport(result, applied);

    if (applied) {
      ok(`Absorbed journal into ${cyan(bold(issueId))}`);
      console.error("");
    } else if (hasChanges) {
      info("Dry run — no files changed. Re-run with --apply to write.");
      console.error("");
    }
  });

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
