/**
 * lyt _merge-issue <base> <ours> <theirs> — hidden git merge driver.
 *
 * Invoked by git (never by hand) through the `lytos-issue` driver that
 * `lyt init` declares in .gitattributes + git config:
 *
 *   .lytos/issue-board/**\/*.md merge=lytos-issue
 *   merge.lytos-issue.driver = "npx lyt _merge-issue %O %A %B"
 *
 * Git contract: %O/%A/%B are temp files (ancestor / ours / theirs); the
 * driver writes its result to %A and exits 0 on a clean merge, non-zero
 * to leave the file in conflict (git then keeps our written content —
 * including the conflict markers we placed — in the working tree).
 */

import { Command } from "commander";
import { readFileSync, writeFileSync } from "fs";
import { mergeIssue } from "../lib/merge-issue.js";
import { warn, error } from "../lib/output.js";

export const mergeIssueDriverCommand = new Command("_merge-issue")
  .description(
    "Git merge driver for Lytos issue files (called by git, not by hand)"
  )
  .argument("<base>", "Ancestor version (%O)")
  .argument("<ours>", "Our version (%A) — the merge result is written here")
  .argument("<theirs>", "Their version (%B)")
  .action((basePath: string, oursPath: string, theirsPath: string) => {
    let base: string;
    let ours: string;
    let theirs: string;
    try {
      base = readFileSync(basePath, "utf-8");
      ours = readFileSync(oursPath, "utf-8");
      theirs = readFileSync(theirsPath, "utf-8");
    } catch (err) {
      error(
        `_merge-issue: cannot read merge inputs: ${err instanceof Error ? err.message : String(err)}`
      );
      process.exit(2);
    }

    const result = mergeIssue(base, ours, theirs);
    writeFileSync(oursPath, result.content, "utf-8");

    if (result.conflicts.length > 0) {
      for (const c of result.conflicts) {
        warn(`lytos-issue merge conflict: ${c}`);
      }
      process.exit(1);
    }
  });
