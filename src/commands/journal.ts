/**
 * lyt journal — the derived logbook (ISS-0124).
 *
 * Read-only, derived from closed issues (like BOARD.md, ADR-0002). Prints to
 * stdout (markdown by default, `--json` for the App); if you want a file, redirect
 * — a persisted JOURNAL.md would be gitignored like BOARD.md.
 */

import { Command } from "commander";
import { existsSync } from "fs";
import { resolve } from "path";
import { buildJournal, renderJournal } from "../lib/journal.js";
import { error } from "../lib/output.js";

export const journalCommand = new Command("journal")
  .description(
    "Derived logbook: the why of closed issues, chronological, linked (read-only)"
  )
  .option("--json", "Output as JSON", false)
  .action((opts: { json?: boolean }) => {
    const cwd = process.cwd();
    const lytosDir = resolve(cwd, ".lytos");

    if (!existsSync(lytosDir)) {
      error("No .lytos/ directory found. Run `lyt init` first.");
      process.exit(2);
    }

    const groups = buildJournal(lytosDir);
    console.log(
      opts.json ? JSON.stringify(groups, null, 2) : renderJournal(groups)
    );
  });
