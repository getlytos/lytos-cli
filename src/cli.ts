import { Command } from "commander";
import { execSync } from "child_process";
import { createRequire } from "module";
import { initCommand } from "./commands/init.js";
import { boardCommand } from "./commands/board.js";
import { archiveCommand } from "./commands/archive.js";
import { reviewCommand } from "./commands/review.js";
import { lintCommand } from "./commands/lint.js";
import { doctorCommand } from "./commands/doctor.js";
import { showCommand } from "./commands/show.js";
import { startCommand } from "./commands/start.js";
import { moveCommand } from "./commands/move.js";
import { parkCommand, unparkCommand } from "./commands/park.js";
import { nextCommand } from "./commands/next.js";
import { budgetCommand } from "./commands/budget.js";
import { pullNotesCommand } from "./commands/pull-notes.js";
import { closeCommand } from "./commands/close.js";
import { claimCommand, unclaimCommand } from "./commands/claim.js";
import { migrateFrontmatterCommand } from "./commands/migrate-frontmatter.js";
import { absorbCommand } from "./commands/absorb.js";
import { mergeIssueDriverCommand } from "./commands/merge-issue.js";
import { upgradeCommand } from "./commands/upgrade.js";
import { ok, error, bold, cyan, green } from "./lib/output.js";

const require = createRequire(import.meta.url);
const { version: VERSION } = require("../package.json");

const program = new Command();

program
  .name("lyt")
  .description(
    "CLI tool for Lytos — a human-first method for working with AI agents"
  )
  .version(VERSION);

program.on("--help", () => {
  console.log("");
  console.log("Examples:");
  console.log("  lyt init --tool claude");
  console.log("  lyt init --tool claude,cursor,copilot");
  console.log("  lyt init --all-tools");
  console.log("  lyt board");
  console.log("  lyt board --all");
  console.log("  lyt start ISS-0053");
  console.log("  lyt move ISS-0053 4-review");
  console.log("  lyt close ISS-0053");
  console.log("  lyt close --dry-run");
  console.log("  lyt pull-notes --dry-run   # preview .lytos-only commits to repatriate from origin/main");
  console.log("  lyt upgrade --dry-run");
  console.log("  lyt review                 # list pending reviews");
  console.log("  lyt review ISS-0053        # print the audit prompt (use a FRESH AI session, ideally a different vendor)");
  console.log("  lyt migrate-frontmatter    # dry-run: backfill schema v2 fields on existing issues");
  console.log("  lyt absorb                 # dry-run: merge the AI session journal into the active issue");
  console.log("");
  console.log("  Loop primitives (ADR-0004) — the CLI exposes them; the wrapper/App orchestrate:");
  console.log("  lyt next                   # the next loop-eligible issue in the sprint (read-only)");
  console.log("  lyt park ISS-0053 --reason ambiguous-spec   # halt instead of guessing");
  console.log("  lyt unpark ISS-0053        # return a parked issue to the sprint");
  console.log("  lyt budget --max-usd 50    # aggregate pipeline cost vs a ceiling (non-zero exit when breached)");
  console.log("");
  console.log('Use "lyt <command> --help" for command-specific options and arguments.');
});

program.addCommand(initCommand);
program.addCommand(boardCommand);
program.addCommand(archiveCommand);
program.addCommand(reviewCommand);
program.addCommand(lintCommand);
program.addCommand(doctorCommand);
program.addCommand(showCommand);
program.addCommand(startCommand);
program.addCommand(moveCommand);
program.addCommand(parkCommand);
program.addCommand(unparkCommand);
program.addCommand(nextCommand);
program.addCommand(budgetCommand);
program.addCommand(pullNotesCommand);
program.addCommand(closeCommand);
program.addCommand(claimCommand);
program.addCommand(unclaimCommand);
program.addCommand(migrateFrontmatterCommand);
program.addCommand(absorbCommand);
// Hidden: called by git as a merge driver, never by hand.
program.addCommand(mergeIssueDriverCommand, { hidden: true });
program.addCommand(upgradeCommand);

program
  .command("update")
  .description("Update lytos-cli to the latest version")
  .action(() => {
    console.error(`\n  ${cyan(bold("Updating lytos-cli..."))}\n`);
    try {
      execSync("npm install -g lytos-cli@latest", { stdio: "inherit" });
      const newVersion = execSync("lyt --version", { encoding: "utf-8" }).trim();
      console.error("");
      ok(`Updated to ${green(newVersion)}`);
    } catch {
      error("Update failed. Try manually: npm install -g lytos-cli@latest");
      process.exit(1);
    }
  });

program.parse();
