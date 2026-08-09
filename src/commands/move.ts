/**
 * lyt move ISS-XXXX <stage> — the generic, atomic transition.
 *
 * `lyt start` and `lyt close` own their two ends of the lifecycle; every
 * other transition (backlog → sprint, in-progress → review, …) had to be
 * done by hand: edit the frontmatter, `git mv`, regenerate the board.
 * This command makes any of those a single atomic verb.
 *
 * Stages that already have a richer dedicated verb are refused so their
 * guardrails cannot be bypassed:
 *   - 3-in-progress → use `lyt start` (branch, assignee, origin check)
 *   - 5-done        → use `lyt close` (checklist gate, commits capture)
 */

import { Command } from "commander";
import { existsSync } from "fs";
import { resolve } from "path";
import {
  locateIssue,
  moveIssue,
  regenerateBoard,
  checkOriginFresh,
  currentGitUser,
  today,
} from "../lib/issue-ops.js";
import { ok, info, warn, error, bold, cyan, green } from "../lib/output.js";

/** Stages `lyt move` accepts as a target. */
const MOVABLE_STAGES = ["0-icebox", "1-backlog", "2-sprint", "4-review"];

/** Stages owned by a dedicated verb — refused with a pointer to it. */
const RESERVED_STAGES: Record<string, string> = {
  "3-in-progress": "lyt start",
  "5-done": "lyt close",
  "parked": "lyt park",
};

const ALL_STAGES = [...MOVABLE_STAGES, ...Object.keys(RESERVED_STAGES)].sort();

export const moveCommand = new Command("move")
  .description("Move an issue to another stage — update status, move the file, regenerate the board")
  .argument("<issue-id>", "Issue ID (e.g. ISS-0029)")
  .argument("<stage>", `Target stage (${MOVABLE_STAGES.join(", ")})`)
  .option("--force", "Move even when origin is ahead or the issue is claimed on origin", false)
  .option("--json", "Output result as JSON", false)
  .on("--help", () => {
    console.log("");
    console.log("Examples:");
    console.log("  lyt move ISS-0053 4-review     # work done, awaiting audit");
    console.log("  lyt move ISS-0053 2-sprint     # commit it to the sprint");
    console.log("  lyt move ISS-0053 1-backlog    # send it back to the backlog");
    console.log("  lyt move ISS-0053 4-review --json");
    console.log("");
    console.log("Stages with a dedicated verb are refused on purpose:");
    console.log("  3-in-progress → lyt start   (branch, assignee, origin check)");
    console.log("  5-done        → lyt close   (checklist gate, commits capture)");
  })
  .action((issueId: string, stage: string, opts: { force?: boolean; json?: boolean }) => {
    const cwd = process.cwd();
    const lytosDir = resolve(cwd, ".lytos");

    if (!existsSync(lytosDir)) {
      error("No .lytos/ directory found. Run `lyt init` first.");
      process.exit(2);
    }

    // Reserved stages: the dedicated verb carries guardrails this
    // generic transition must not silently bypass.
    if (RESERVED_STAGES[stage]) {
      const verb = RESERVED_STAGES[stage];
      const message = `Moving to ${stage} has a dedicated verb — use \`${verb} ${issueId}\` instead.`;
      if (opts.json) {
        console.log(JSON.stringify({ status: "error", reason: "reserved-stage", stage, use: verb, message }));
      } else {
        error(message);
      }
      process.exit(1);
    }

    if (!MOVABLE_STAGES.includes(stage)) {
      const message = `Unknown stage "${stage}". Valid stages: ${ALL_STAGES.join(", ")}.`;
      if (opts.json) {
        console.log(JSON.stringify({ status: "error", reason: "unknown-stage", stage, message }));
      } else {
        error(message);
      }
      process.exit(1);
    }

    const issue = locateIssue(lytosDir, issueId);
    if (!issue) {
      if (opts.json) {
        console.log(JSON.stringify({ status: "error", reason: "not-found", message: `Issue ${issueId} not found on the board.` }));
      } else {
        error(`Issue ${issueId} not found on the board.`);
      }
      process.exit(1);
    }

    // No-op: already there.
    if (issue.dir === stage) {
      if (opts.json) {
        console.log(JSON.stringify({ status: "already-there", id: issueId, stage }));
        return;
      }
      warn(`${issueId} is already in ${stage}.`);
      process.exit(0);
    }

    // Same origin-freshness check as `lyt start` — a move is a board
    // mutation too, and racing a stale origin corrupts the shared state.
    if (!opts.force) {
      const check = checkOriginFresh(lytosDir, issueId, currentGitUser());
      if (check.status === "behind" || check.status === "diverged" || check.status === "already-claimed") {
        if (opts.json) {
          console.log(JSON.stringify({ status: "error", reason: check.status, message: check.message }));
        } else {
          error(check.message!);
        }
        process.exit(1);
      }
      if (check.status === "offline" && !opts.json) {
        warn(check.message!);
      }
    }

    const from = issue.dir;
    moveIssue(lytosDir, issue, stage, { updated: today() });
    regenerateBoard(lytosDir);

    if (opts.json) {
      console.log(JSON.stringify({ status: "moved", id: issueId, from, to: stage }, null, 2));
      return;
    }

    console.error("");
    ok(`${cyan(bold(issueId))} moved: ${from} → ${green(stage)}`);
    info("Board regenerated");
    console.error("");
  });
