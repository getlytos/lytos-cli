/**
 * lyt budget — non-interactive budget guard for the loop (ADR-0004 §8, ISS-0102).
 *
 * Aggregates the pipeline's cost_usd and issue count, compares to a ceiling
 * (flags, or budget_usd / budget_issues in sprint.md), and exits non-zero when
 * breached so a wrapper / CI can stop the loop. Read-only.
 */

import { Command } from "commander";
import { existsSync } from "fs";
import { resolve } from "path";
import { computeBudget, readSprintCeiling } from "../lib/budget.js";
import {
  ok,
  info,
  warn,
  error,
  bold,
  green,
  yellow,
  dim,
} from "../lib/output.js";

function parseNum(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export const budgetCommand = new Command("budget")
  .description(
    "Aggregate pipeline cost vs a ceiling — non-zero exit when breached"
  )
  .option("--max-usd <amount>", "Ceiling on total cost_usd")
  .option("--max-issues <count>", "Ceiling on issue count")
  .option(
    "--all",
    "Scope the whole board instead of the in-flight pipeline",
    false
  )
  .option("--json", "Output as JSON", false)
  .on("--help", () => {
    console.log("");
    console.log(
      "Ceiling resolution: --max-* flags override budget_usd / budget_issues in sprint.md."
    );
    console.log(
      "Scope (default): 2-sprint, 3-in-progress, 4-review, parked. --all widens it."
    );
    console.log("");
    console.log("Examples:");
    console.log("  lyt budget --max-usd 50");
    console.log("  lyt budget --max-issues 20 --json");
  })
  .action(
    (opts: {
      maxUsd?: string;
      maxIssues?: string;
      all?: boolean;
      json?: boolean;
    }) => {
      const cwd = process.cwd();
      const lytosDir = resolve(cwd, ".lytos");

      if (!existsSync(lytosDir)) {
        error("No .lytos/ directory found. Run `lyt init` first.");
        process.exit(2);
      }

      // Flags override sprint.md.
      const fromSprint = readSprintCeiling(lytosDir);
      const maxUsd = parseNum(opts.maxUsd) ?? fromSprint.maxUsd;
      const maxIssues = parseNum(opts.maxIssues) ?? fromSprint.maxIssues;

      const report = computeBudget(lytosDir, {
        maxUsd,
        maxIssues,
        all: opts.all,
      });

      if (opts.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.error("");
        const totals = `${bold(`$${report.costUsd.toFixed(2)}`)} ${dim("·")} ${report.issues} issue(s) ${dim(`(${opts.all ? "board" : "pipeline"})`)}`;
        if (!report.hasCeiling) {
          info(`Spend: ${totals}`);
          warn(
            "No ceiling set — pass --max-usd / --max-issues or add budget_usd / budget_issues to sprint.md."
          );
        } else if (report.overBudget) {
          error(`Over budget: ${totals}`);
          for (const b of report.breaches)
            console.error(`  ${yellow("!")} ${b}`);
        } else {
          ok(`Within budget: ${totals}`);
          if (report.maxUsd !== null)
            console.error(
              `  ${green("✓")} ${dim(`cost ≤ $${report.maxUsd.toFixed(2)}`)}`
            );
          if (report.maxIssues !== null)
            console.error(
              `  ${green("✓")} ${dim(`issues ≤ ${report.maxIssues}`)}`
            );
        }
        console.error("");
      }

      // Non-zero only when a ceiling is set AND breached — the loop's stop signal.
      if (report.overBudget) process.exit(1);
    }
  );
