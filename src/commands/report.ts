/**
 * lyt report ISS-XXXX — the review packet for an issue (ADR-0004 §7, ISS-0103).
 *
 * Read-only. Markdown by default (doubt-first), `--json` for the App.
 */

import { Command } from "commander";
import { existsSync } from "fs";
import { resolve } from "path";
import { locateIssue } from "../lib/issue-ops.js";
import { buildPacket, renderPacket } from "../lib/report.js";
import { error } from "../lib/output.js";

export const reportCommand = new Command("report")
  .description("Print the review packet for an issue (doubt-first, read-only)")
  .argument("<issue-id>", "Issue ID (e.g. ISS-0042)")
  .option("--json", "Output the packet as JSON", false)
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
        console.log(JSON.stringify({ status: "error", reason: "not-found", message: `Issue ${issueId} not found.` }));
      } else {
        error(`Issue ${issueId} not found on the board.`);
      }
      process.exit(1);
    }

    const packet = buildPacket(lytosDir, issue);

    if (opts.json) {
      console.log(JSON.stringify(packet, null, 2));
    } else {
      // The packet is a document — it goes to stdout, not stderr.
      console.log(renderPacket(packet));
    }
  });
