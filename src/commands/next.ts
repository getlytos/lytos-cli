/**
 * lyt next — the next loop-eligible issue in the sprint (ADR-0004 §1, ISS-0099).
 *
 * Read-only: it selects and explains, it does not transition. Orchestration
 * (calling `lyt start` behind it) stays with the wrapper / the App — the CLI
 * never runs the loop.
 */

import { Command } from "commander";
import { existsSync } from "fs";
import { resolve } from "path";
import { selectNext } from "../lib/next.js";
import { ok, warn, error, bold, cyan, green, yellow, blue, dim } from "../lib/output.js";

export const nextCommand = new Command("next")
  .description("Show the next loop-eligible issue in the sprint (read-only)")
  .option("--json", "Output as JSON", false)
  .on("--help", () => {
    console.log("");
    console.log("An issue is loop-eligible when it is in the sprint, its dependencies");
    console.log("are done, and its Definition of done has at least one verify: auto item.");
    console.log("An all-'verify: human' DoD is for a human, not the loop.");
  })
  .action((opts: { json?: boolean }) => {
    const cwd = process.cwd();
    const lytosDir = resolve(cwd, ".lytos");

    if (!existsSync(lytosDir)) {
      error("No .lytos/ directory found. Run `lyt init` first.");
      process.exit(2);
    }

    const result = selectNext(lytosDir);

    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.error("");
    if (result.pick) {
      const p = result.pick;
      const counts = `${p.dod.machine} auto${p.dod.human > 0 ? ` · ${p.dod.human} human` : ""}`;
      ok(`Next: ${cyan(bold(p.id))} ${dim("—")} ${cyan(bold(p.title))}`);
      console.error(`  ${blue("Priority:")} ${p.priority}  ${dim("·")}  ${blue("Effort:")} ${p.effort}  ${dim("·")}  ${blue("DoD:")} ${counts}`);
      console.error(`  ${dim(`→ start it with`)} ${green(`lyt start ${p.id}`)}`);
      if (result.eligible.length > 1) {
        console.error(`  ${dim(`(${result.eligible.length - 1} other eligible: ${result.eligible.slice(1).map((e) => e.id).join(", ")})`)}`);
      }
    } else {
      warn("No loop-eligible issue in the sprint.");
      if (result.blocked.length > 0) {
        console.error("");
        for (const b of result.blocked) {
          console.error(`  ${yellow("○")} ${cyan(b.id)} ${dim("—")} ${b.title}`);
          console.error(`    ${dim(`${b.reason}: ${b.detail}`)}`);
        }
      } else {
        console.error(`  ${dim("The sprint is empty — commit issues with `lyt move ISS-X 2-sprint`.")}`);
      }
    }
    console.error("");
  });
