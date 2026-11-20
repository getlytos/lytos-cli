/**
 * lyt exchanges — the index of the open design exchanges (ISS-0169, ADR-0009 §4).
 *
 * Read-only and offline: it reads the entries under
 * `.lytos/design/exchanges/<epic>/NNN-<slug>.md` and prints one line per OPEN
 * entry. The index is derived on every call, like BOARD.md (ADR-0002) — there is
 * no file to write, to edit by hand or to commit — so a resolved entry drops out
 * of it by changing its `status`. An agent reads the card, then this index, then
 * only the entries it needs.
 *
 * It exists for projects whose `.lytos/config.yml` says `design: claude-design`.
 * For any other project it says so and changes nothing: it must never be a brake.
 *
 * Exit codes: 0 listed (or not in use), 1 an entry is malformed, 2 no `.lytos/`.
 */

import { Command } from "commander";
import { existsSync } from "fs";
import { resolve } from "path";
import type { DesignChoice } from "../lib/design.js";
import { readDesign } from "../lib/design-config.js";
import {
  EXCHANGES_DIR,
  EXCHANGE_FROM,
  EXCHANGE_STATUSES,
  EXCHANGE_TYPES,
  MAX_BODY_WORDS,
  renderIndex,
  type ExchangeScan,
} from "../lib/exchanges.js";
import { scanExchanges } from "../lib/exchanges-scan.js";
import { error, info, warn, dim } from "../lib/output.js";

const EXIT_MALFORMED = 1;
const EXIT_NO_LYTOS = 2;

function printNotInUse(design: DesignChoice, json: boolean): void {
  if (json) {
    const scan: ExchangeScan = { open: [], resolved: 0, problems: [] };
    console.log(
      JSON.stringify({ status: "not-in-use", design, ...scan }, null, 2)
    );
    return;
  }
  info(
    `Design exchanges are not in use here: design is "${design}" in .lytos/config.yml (they apply when it is claude-design). Nothing to list.`
  );
}

export const exchangesCommand = new Command("exchanges")
  .description(
    "List the open design exchanges between design and code (read-only; for design: claude-design projects)"
  )
  .option("--json", "Output as JSON", false)
  .on("--help", () => {
    console.log("");
    console.log(
      `An entry is a small file: .lytos/${EXCHANGES_DIR}/<epic>/NNN-<slug>.md`
    );
    console.log(
      "  frontmatter: id, epic, milestone (optional), from, type, status, refs (optional)"
    );
    console.log(`  from:   ${EXCHANGE_FROM.join(" | ")}`);
    console.log(`  type:   ${EXCHANGE_TYPES.join(" | ")}`);
    console.log(`  status: ${EXCHANGE_STATUSES.join(" | ")}`);
    console.log(`  body:   at most ${MAX_BODY_WORDS} words`);
    console.log("");
    console.log(
      "Only open entries are listed. The index is derived on every call and never written:"
    );
    console.log(
      "resolve an entry by setting status: resolved. A malformed entry is reported, never dropped."
    );
    console.log(
      "With design: none (or no design key) the command says so and changes nothing."
    );
    console.log("");
    console.log("Examples:");
    console.log("  lyt exchanges");
    console.log("  lyt exchanges --json");
  })
  .action((opts: { json?: boolean }) => {
    const lytosDir = resolve(process.cwd(), ".lytos");
    if (!existsSync(lytosDir)) {
      error("No .lytos/ directory found. Run `lyt init` first.");
      process.exit(EXIT_NO_LYTOS);
    }

    const design = readDesign(lytosDir);
    if (design !== "claude-design") {
      printNotInUse(design, Boolean(opts.json));
      return;
    }

    const scan = scanExchanges(lytosDir);
    if (opts.json) {
      console.log(JSON.stringify({ status: "ok", design, ...scan }, null, 2));
    } else {
      console.log(renderIndex(scan));
      for (const p of scan.problems) {
        warn(`${p.file} ${dim("—")} ${p.message}`);
      }
    }
    if (scan.problems.length > 0) process.exit(EXIT_MALFORMED);
  });
