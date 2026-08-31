/**
 * lyt park ISS-XXXX --reason <code> — pull an issue out of the flow when the
 * autonomous loop must not guess (ADR-0004 §3, ISS-0100).
 *
 * Lytos's rule "don't interpret silently — ask if ambiguous" cannot mean "ask"
 * inside an autonomous loop (there is no human turn). It is inverted into an
 * obligation to HALT, not guess: on any ambiguity the agent parks the issue
 * with a machine-set reason and the loop moves on. Parking is a first-class
 * exit, not a failure.
 *
 * lyt unpark ISS-XXXX — return a parked issue to the sprint pool.
 */

import { Command } from "commander";
import { existsSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import {
  locateIssue,
  moveIssue,
  regenerateBoard,
  today,
} from "../lib/issue-ops.js";
import {
  ok,
  info,
  warn,
  error,
  bold,
  cyan,
  green,
  yellow,
  dim,
} from "../lib/output.js";

/** Closed taxonomy of park reasons (ADR-0004 §3). */
export const PARK_REASONS = [
  "ambiguous-spec",
  "missing-dependency",
  "gate-failed",
  "budget-exhausted",
  "human-judgment-required",
  "external-blocker",
] as const;

const PARKED_DIR = "parked";
/** Where an unparked issue returns — back into the sprint pool. */
const UNPARK_TARGET = "2-sprint";

export const parkCommand = new Command("park")
  .description(
    "Park an issue out of the flow with a reason — the loop halts instead of guessing"
  )
  .argument("<issue-id>", "Issue ID (e.g. ISS-0042)")
  .requiredOption(
    "--reason <code>",
    `Why it is parked (${PARK_REASONS.join(", ")})`
  )
  .option("--json", "Output result as JSON", false)
  .on("--help", () => {
    console.log("");
    console.log("Reasons (closed taxonomy):");
    for (const r of PARK_REASONS) console.log(`  ${r}`);
    console.log("");
    console.log("Examples:");
    console.log("  lyt park ISS-0042 --reason ambiguous-spec");
    console.log("  lyt park ISS-0042 --reason gate-failed --json");
  })
  .action((issueId: string, opts: { reason: string; json?: boolean }) => {
    const cwd = process.cwd();
    const lytosDir = resolve(cwd, ".lytos");

    if (!existsSync(lytosDir)) {
      error("No .lytos/ directory found. Run `lyt init` first.");
      process.exit(2);
    }

    const reason = opts.reason;
    if (!(PARK_REASONS as readonly string[]).includes(reason)) {
      const message = `Unknown reason "${reason}". Valid reasons: ${PARK_REASONS.join(", ")}.`;
      if (opts.json) {
        console.log(
          JSON.stringify({
            status: "error",
            reason: "unknown-reason",
            value: reason,
            valid: PARK_REASONS,
            message,
          })
        );
      } else {
        error(message);
      }
      process.exit(1);
    }

    const issue = locateIssue(lytosDir, issueId);
    if (!issue) {
      if (opts.json) {
        console.log(
          JSON.stringify({
            status: "error",
            reason: "not-found",
            message: `Issue ${issueId} not found on the board.`,
          })
        );
      } else {
        error(`Issue ${issueId} not found on the board.`);
      }
      process.exit(1);
    }

    if (issue.dir === PARKED_DIR) {
      if (opts.json) {
        console.log(JSON.stringify({ status: "already-parked", id: issueId }));
        return;
      }
      warn(`${issueId} is already parked.`);
      process.exit(0);
    }

    // The parked/ side-state may not exist yet — create it on demand.
    mkdirSync(join(lytosDir, "issue-board", PARKED_DIR), { recursive: true });

    const from = issue.dir;
    moveIssue(lytosDir, issue, PARKED_DIR, {
      park_reason: reason,
      parked_at: today(),
      updated: today(),
    });
    regenerateBoard(lytosDir);

    if (opts.json) {
      console.log(
        JSON.stringify({ status: "parked", id: issueId, from, reason }, null, 2)
      );
      return;
    }

    console.error("");
    ok(
      `${cyan(bold(issueId))} parked ${dim(`(${from} →`)} ${yellow(PARKED_DIR)}${dim(")")}`
    );
    info(`Reason: ${yellow(reason)}`);
    info("Board regenerated");
    console.error("");
  });

export const unparkCommand = new Command("unpark")
  .description("Return a parked issue to the sprint pool")
  .argument("<issue-id>", "Issue ID (e.g. ISS-0042)")
  .option("--json", "Output result as JSON", false)
  .action((issueId: string, opts: { json?: boolean }) => {
    const cwd = process.cwd();
    const lytosDir = resolve(cwd, ".lytos");

    if (!existsSync(lytosDir)) {
      error("No .lytos/ directory found. Run `lyt init` first.");
      process.exit(2);
    }

    const issue = locateIssue(lytosDir, issueId);
    if (!issue) {
      if (opts.json) {
        console.log(
          JSON.stringify({
            status: "error",
            reason: "not-found",
            message: `Issue ${issueId} not found on the board.`,
          })
        );
      } else {
        error(`Issue ${issueId} not found on the board.`);
      }
      process.exit(1);
    }

    if (issue.dir !== PARKED_DIR) {
      const message = `${issueId} is not parked (it is in ${issue.dir}).`;
      if (opts.json) {
        console.log(
          JSON.stringify({
            status: "error",
            reason: "not-parked",
            stage: issue.dir,
            message,
          })
        );
      } else {
        error(message);
      }
      process.exit(1);
    }

    // Clear the park metadata on the way out.
    delete issue.frontmatter.park_reason;
    delete issue.frontmatter.parked_at;

    moveIssue(lytosDir, issue, UNPARK_TARGET, { updated: today() });
    regenerateBoard(lytosDir);

    if (opts.json) {
      console.log(
        JSON.stringify(
          { status: "unparked", id: issueId, to: UNPARK_TARGET },
          null,
          2
        )
      );
      return;
    }

    console.error("");
    ok(`${cyan(bold(issueId))} unparked ${dim("→")} ${green(UNPARK_TARGET)}`);
    info("Board regenerated");
    console.error("");
  });
