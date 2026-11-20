/**
 * lyt upgrade — update method files in .lytos/ from the bundled version.
 *
 * Compares local .lytos/ files with the bundled dist/method/ files.
 * Never touches manifest.md, memory/, or issue-board/ (except templates).
 *
 * What belongs to the project is never written (ISS-0159):
 *   - `quality/kit.md` and `quality/stack.md` are linked to the project's stack
 *     (real commands in the `tool` column, rows added and removed). They are in
 *     neither list below, so no flag can reach them; the run only says which
 *     bundled gates the kit does not have.
 *   - The quality library (rubrics, checklists) is ADD-ONLY: a missing file is
 *     added, one that exists is left alone even with --force, because a project
 *     adapts a rubric to its own architecture (`lib/upgrade-library.ts`).
 *   - Nothing is written through a symbolic link: a dangling link reads as
 *     "absent", and a write would create its target wherever it points.
 *   - With no terminal (a pipe, CI) each replacement question is answered "no"
 *     out loud, with the way to force it.
 *   - `design/registry.md`, `config.yml`, `manifest.md` and `memory/` are not
 *     method files at all.
 *   - The design exchanges guide (`design/exchanges/README.md`) is added, add-only
 *     like the library, to a project whose `config.yml` says `design:
 *     claude-design` and to no other (ISS-0169).
 */

import { Command } from "commander";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import {
  ok,
  info,
  warn,
  error,
  cyan,
  bold,
  green,
  dim,
} from "../lib/output.js";
import { KANBAN_DIRS } from "../lib/scaffold.js";
import {
  bundledKitUrl,
  deliverAdditions,
  kitGatesMissing,
  notWrittenLine,
} from "../lib/upgrade-library.js";
import { UPGRADEABLE_FILES } from "../lib/method-files.js";
import { symlinkOnPath } from "../lib/safe-write.js";
import { askConfirm, canPrompt } from "../lib/terminal.js";
import {
  migrateCursorRules,
  type CursorMigrationResult,
} from "../lib/cursor-migration.js";

const METHOD_DIR = join(dirname(fileURLToPath(import.meta.url)), "method");

const _require = createRequire(import.meta.url);
const { version: VERSION } = _require("../package.json");

export const upgradeCommand = new Command("upgrade")
  .description("Update method files in .lytos/ from the bundled version")
  .option("--force", "Overwrite all changed files without confirmation")
  .option("--dry-run", "Show what would change without applying")
  .option(
    "--migrate-cursor",
    "Migrate a legacy .cursorrules file to .cursor/rules/lytos.mdc (keeps the original content, wraps it with the modern front-matter)",
    false
  )
  .on("--help", () => {
    console.log("");
    console.log("Examples:");
    console.log("  lyt upgrade");
    console.log("  lyt upgrade --dry-run");
    console.log("  lyt upgrade --force");
    console.log("  lyt upgrade --migrate-cursor");
  })
  .action(
    async (opts: {
      force?: boolean;
      dryRun?: boolean;
      migrateCursor?: boolean;
    }) => {
      const cwd = process.cwd();
      const lytosDir = join(cwd, ".lytos");

      if (!existsSync(lytosDir)) {
        error("No .lytos/ directory found. Run `lyt init` first.");
        process.exit(2);
      }

      console.error("");
      info(
        opts.dryRun
          ? "Dry run — no files will be written."
          : "Checking method files..."
      );
      console.error("");

      let added = 0;
      let updated = 0;
      let skipped = 0;
      let upToDate = 0;

      // The library comes FIRST: it is added without asking, so no replacement
      // question below can stand between a project and it.
      const deliveries = deliverAdditions(
        lytosDir,
        METHOD_DIR,
        Boolean(opts.dryRun)
      );
      for (const [label, delivery] of deliveries) {
        for (const relPath of delivery.added) {
          console.error(`  ${green("+")} ${dim(relPath)} ${dim("(new)")}`);
        }
        for (const { path, link } of delivery.behindLink) {
          console.error(notWrittenLine(path, relative(cwd, link)));
        }
        added += delivery.added.length;
        skipped += delivery.behindLink.length;
        upToDate += delivery.upToDate;
        if (delivery.ownedByProject > 0) {
          info(
            `${delivery.ownedByProject} ${label} file(s) differ from the bundled version and were left alone — they are yours`
          );
        }
      }

      // The kit is the project's own and was not touched. Tell it what the
      // bundled kit has that it does not (informational; nothing is written).
      const missingGates = kitGatesMissing(lytosDir, METHOD_DIR);
      if (missingGates.length > 0) {
        info(
          `quality/kit.md is yours and was not touched. ${missingGates.length} gate(s) of the bundled kit are not in your kit: ${missingGates.join(", ")}`
        );
        console.error(
          `    ${dim(`Copy the rows you want from ${bundledKitUrl(VERSION)}; ignore the ones you dropped on purpose.`)}`
        );
      }

      // Nobody to answer? Then every replacement question is "no", said out loud.
      const canAsk = canPrompt(process.env, process.stdin.isTTY);

      for (const relPath of UPGRADEABLE_FILES) {
        const localPath = join(lytosDir, relPath);
        const bundledPath = join(METHOD_DIR, relPath);

        if (!existsSync(bundledPath)) continue;

        // Never through a symbolic link: checked before existsSync, which
        // calls a dangling one "absent".
        const link = symlinkOnPath(localPath, lytosDir);
        if (link) {
          console.error(notWrittenLine(relPath, relative(cwd, link)));
          skipped++;
          continue;
        }

        const bundled = readFileSync(bundledPath, "utf-8");

        if (!existsSync(localPath)) {
          // New file — add automatically
          if (!opts.dryRun) {
            mkdirSync(dirname(localPath), { recursive: true });
            writeFileSync(localPath, bundled, "utf-8");
          }
          console.error(`  ${green("+")} ${dim(relPath)} ${dim("(new)")}`);
          added++;
          continue;
        }

        const local = readFileSync(localPath, "utf-8");

        if (local === bundled) {
          upToDate++;
          continue;
        }

        // File differs
        if (opts.dryRun) {
          console.error(`  ${cyan("~")} ${dim(relPath)} ${dim("(differs)")}`);
          skipped++;
          continue;
        }

        if (opts.force) {
          writeFileSync(localPath, bundled, "utf-8");
          console.error(`  ${green("✓")} ${dim(relPath)} ${dim("(updated)")}`);
          updated++;
          continue;
        }

        if (!canAsk) {
          console.error(
            `  ${cyan("~")} ${dim(relPath)} ${dim("differs — kept: no terminal to ask on; run `lyt upgrade --force` to replace it")}`
          );
          skipped++;
          continue;
        }

        // Ask user
        process.stderr.write(
          `  ${cyan("~")} ${relPath} differs — update? [y/N] `
        );
        const confirm = await askConfirm("");
        if (confirm) {
          writeFileSync(localPath, bundled, "utf-8");
          console.error(`    ${green("✓")} updated`);
          updated++;
        } else {
          console.error(`    ${dim("skipped")}`);
          skipped++;
        }
      }

      // Ensure every Kanban folder + its .gitkeep exist. Older projects
      // (init'd before the 6-private-notes column was added, or before
      // .gitignore-protected private notes shipped) may be missing them.
      for (const dir of KANBAN_DIRS) {
        const gitkeepPath = join(lytosDir, "issue-board", dir, ".gitkeep");
        if (symlinkOnPath(gitkeepPath, lytosDir) || existsSync(gitkeepPath)) {
          continue;
        }

        if (!opts.dryRun) {
          mkdirSync(dirname(gitkeepPath), { recursive: true });
          writeFileSync(gitkeepPath, "", "utf-8");
        }
        console.error(
          `  ${green("+")} ${dim(`issue-board/${dir}/.gitkeep`)} ${dim("(new)")}`
        );
        added++;
      }

      // Surface the legacy .cursorrules even when --migrate-cursor wasn't
      // passed. Otherwise `lyt upgrade` happily reports "Already up to date"
      // while the project is still on the deprecated Cursor convention.
      if (!opts.migrateCursor && existsSync(join(cwd, ".cursorrules"))) {
        const newPath = join(cwd, ".cursor", "rules", "lytos.mdc");
        if (!existsSync(newPath)) {
          warn(
            "Legacy .cursorrules detected — Cursor now uses .cursor/rules/*.mdc. " +
              "Run `lyt upgrade --migrate-cursor` to convert it (the original content is preserved)."
          );
        }
      }

      // Optional one-shot migration: legacy .cursorrules → .cursor/rules/lytos.mdc
      let cursorResult: CursorMigrationResult | null = null;
      if (opts.migrateCursor) {
        cursorResult = migrateCursorRules(cwd, { dryRun: opts.dryRun });
        switch (cursorResult.status) {
          case "migrated":
            console.error(
              `  ${green("✓")} ${dim(".cursorrules → .cursor/rules/lytos.mdc")} ${dim("(migrated)")}`
            );
            updated++;
            break;
          case "dry-run":
            console.error(
              `  ${cyan("~")} ${dim(".cursorrules → .cursor/rules/lytos.mdc")} ${dim("(would migrate)")}`
            );
            skipped++;
            break;
          case "both-present":
            warn(
              "Legacy .cursorrules AND .cursor/rules/lytos.mdc both present — neither touched. " +
                "Review and delete the legacy file once you've reconciled any differences."
            );
            break;
          case "no-legacy":
            info("No legacy .cursorrules to migrate.");
            break;
        }
      }

      console.error("");

      if (opts.dryRun) {
        info(`${added} new · ${skipped} differ · ${upToDate} up to date`);
        info("Run `lyt upgrade` to apply changes.");
      } else {
        const parts = [];
        if (added > 0) parts.push(`${added} added`);
        if (updated > 0) parts.push(`${updated} updated`);
        if (skipped > 0) parts.push(`${skipped} skipped`);
        if (upToDate > 0) parts.push(`${upToDate} already up to date`);

        if (added === 0 && updated === 0 && skipped === 0) {
          ok(`Already up to date. ${dim(`(${upToDate} files checked)`)}`);
        } else {
          ok(cyan(bold("Method files upgraded")) + " — " + parts.join(" · "));
        }
      }
    }
  );
