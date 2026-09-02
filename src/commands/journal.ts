/**
 * lyt journal — the derived logbook (ISS-0124).
 *
 * Derived from closed issues, like BOARD.md (ADR-0002). Prints to stdout by
 * default — markdown, or `--json` for the App — and writes `.lytos/JOURNAL.md`
 * with `--write`, gitignored the way BOARD.md is: regenerated, never written by
 * hand, never committed.
 *
 * Writing is opt-in rather than the default because a read has no business
 * touching the working tree. `lyt board` writes because the board *is* its
 * output; the journal's is the narrative, and a file is one of the ways to
 * read it.
 */

import { Command } from "commander";
import { existsSync, writeFileSync } from "fs";
import { resolve, join } from "path";
import { buildJournal, renderJournal } from "../lib/journal.js";
import { error, ok, cyan, dim } from "../lib/output.js";

export const journalCommand = new Command("journal")
  .description(
    "Derived logbook: the why of closed issues, chronological, linked (read-only)"
  )
  .option("--json", "Output as JSON", false)
  .option(
    "--write",
    "Also regenerate .lytos/JOURNAL.md (derived, gitignored like BOARD.md)",
    false
  )
  .action((opts: { json?: boolean; write?: boolean }) => {
    const cwd = process.cwd();
    const lytosDir = resolve(cwd, ".lytos");

    if (!existsSync(lytosDir)) {
      error("No .lytos/ directory found. Run `lyt init` first.");
      process.exit(2);
    }

    const groups = buildJournal(lytosDir);
    const markdown = renderJournal(groups);

    if (opts.write) {
      const target = join(lytosDir, "JOURNAL.md");
      writeFileSync(target, markdown, "utf-8");
      if (!opts.json)
        ok(
          `${cyan("JOURNAL.md")} regenerated ${dim(`(${groups.length} period(s))`)}`
        );
    }

    console.log(opts.json ? JSON.stringify(groups, null, 2) : markdown);
  });
