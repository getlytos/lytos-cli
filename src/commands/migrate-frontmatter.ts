/**
 * lyt migrate-frontmatter — backfill schema_version + lifecycle dates on
 * existing issues (phase 5 of schema v2, ADR-0001).
 *
 * Dry-run by default: prints what each issue would gain and changes nothing.
 * `--apply` writes the changes. Idempotent — re-running is a no-op.
 */

import { Command } from "commander";
import { existsSync } from "fs";
import { resolve } from "path";
import { execFileSync } from "child_process";
import {
  planMigration,
  applyMigration,
  type GitDateResolver,
  type MigrationPlan,
} from "../lib/migrate.js";
import { ok, info, warn, error, bold, cyan, green, dim } from "../lib/output.js";

/**
 * Git-backed date resolver. Both lookups are best-effort: any git failure
 * (not a repo, no history, squash merge) returns null so the caller records an
 * explicit skip rather than faking a date.
 */
function createGitResolver(): GitDateResolver {
  return {
    firstAdded(absPath: string): string | null {
      try {
        const out = execFileSync(
          "git",
          ["log", "--follow", "--diff-filter=A", "--format=%ad", "--date=short", "--", absPath],
          { encoding: "utf-8", stdio: "pipe" }
        );
        const lines = out.split("\n").map((s) => s.trim()).filter(Boolean);
        // git log is newest-first; the oldest add (file's first existence) is last.
        return lines.length > 0 ? lines[lines.length - 1] : null;
      } catch {
        return null;
      }
    },
    lastTouched(absPath: string): string | null {
      try {
        const out = execFileSync(
          "git",
          ["log", "-1", "--format=%ad", "--date=short", "--", absPath],
          { encoding: "utf-8", stdio: "pipe" }
        );
        return out.trim() || null;
      } catch {
        return null;
      }
    },
  };
}

function printReport(plan: MigrationPlan, applied: boolean): void {
  console.error("");
  console.error(`  ${cyan(bold(applied ? "Migrate frontmatter" : "Migrate frontmatter (dry-run)"))}`);
  console.error("");

  for (const m of plan.migrations) {
    if (!m.changed && m.skipped.length === 0) continue;

    console.error(`  ${cyan(m.id)} ${dim(m.file)}`);
    for (const a of m.added) {
      console.error(`    ${green("+")} ${a.field}: ${a.value}`);
    }
    for (const s of m.skipped) {
      console.error(`    ${dim(`~ ${s.field}: skipped (${s.reason})`)}`);
    }
  }

  console.error("");
  console.error(
    `  ${plan.scanned} issues scanned${dim(" · ")}${plan.toMigrate} to migrate${dim(" · ")}${plan.alreadyCurrent} already current`
  );
  console.error("");

  if (applied) {
    ok(`Migrated ${green(String(plan.toMigrate))} issue${plan.toMigrate === 1 ? "" : "s"}`);
  } else if (plan.toMigrate > 0) {
    info("Dry run — no files changed. Re-run with --apply to write.");
  } else {
    ok("Nothing to migrate — every issue is already on schema v2.");
  }
  console.error("");
}

export const migrateFrontmatterCommand = new Command("migrate-frontmatter")
  .description("Backfill schema_version + lifecycle dates on existing issues (dry-run by default)")
  .option("--apply", "Write the changes (default is a dry run)", false)
  .option("--json", "Output the plan as JSON", false)
  .option("--include-archive", "Also migrate issues under issue-board/archive/", false)
  .on("--help", () => {
    console.log("");
    console.log("Examples:");
    console.log("  lyt migrate-frontmatter                  # dry run — show what would change");
    console.log("  lyt migrate-frontmatter --apply          # write the changes");
    console.log("  lyt migrate-frontmatter --include-archive --apply");
  })
  .action((opts) => {
    const cwd = process.cwd();
    const lytosDir = resolve(cwd, ".lytos");

    if (!existsSync(lytosDir)) {
      error("No .lytos/ directory found. Run `lyt init` first.");
      process.exit(2);
    }

    const plan = planMigration(
      lytosDir,
      { includeArchive: opts.includeArchive },
      createGitResolver()
    );

    let written = 0;
    if (opts.apply) {
      written = applyMigration(lytosDir, plan);
    }

    if (opts.json) {
      console.log(
        JSON.stringify(
          {
            applied: Boolean(opts.apply),
            written,
            scanned: plan.scanned,
            toMigrate: plan.toMigrate,
            alreadyCurrent: plan.alreadyCurrent,
            migrations: plan.migrations,
          },
          null,
          2
        )
      );
      return;
    }

    printReport(plan, Boolean(opts.apply));
    if (!opts.apply && plan.toMigrate > 0) {
      warn("Run again with --apply once the diff looks right.");
    }
  });
