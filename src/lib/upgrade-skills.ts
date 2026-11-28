/**
 * What `lyt upgrade` does so that the task skills get read (ISS-0191).
 *
 * One thing is written outside `.lytos/`: for a project with the Claude Code
 * bridge, the pointer skills in `.claude/skills/lytos-*`, added when missing and
 * rewritten when they drifted. A file `lyt` did not generate is never rewritten.
 * The bridge files are never touched: one that carries no marker of the order to
 * read the task skills is named, with the section to add.
 *
 * Zero dependencies.
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { bridgesWithoutSkillsOrder } from "./bridge-check.js";
import { hasClaudeBridge } from "./claude-bridge.js";
import { UPGRADEABLE_FILES } from "./method-files.js";
import { cyan, dim, green, warn } from "./output.js";
import { pointerWarnings } from "./pointer-warnings.js";
import { symlinkOnPath } from "./safe-write.js";
import { syncSkillPointers, type PointerResult } from "./skill-pointers.js";
import { TASK_SKILLS_MARKER, TASK_SKILLS_SECTION } from "./templates.js";
import type { UpgradeCounts } from "./upgrade-library.js";

export interface SkillUpgradeOptions {
  cwd: string;
  methodDir: string;
  dryRun: boolean;
}

/**
 * The bundled task skills the project lacks and `upgrade` would add: name to
 * content. One behind a symbolic link will not be written, so is not counted.
 */
function missingTaskSkills(
  lytosDir: string,
  methodDir: string
): Map<string, string> {
  const missing = new Map<string, string>();
  for (const relPath of UPGRADEABLE_FILES) {
    const name = relPath.match(/^skills\/([^/]+)\/SKILL\.md$/)?.[1];
    if (!name) continue;
    const localPath = join(lytosDir, relPath);
    const bundledPath = join(methodDir, relPath);
    if (symlinkOnPath(localPath, lytosDir) || existsSync(localPath)) continue;
    if (existsSync(bundledPath)) {
      missing.set(name, readFileSync(bundledPath, "utf-8"));
    }
  }
  return missing;
}

function printPointers(pointers: PointerResult, dryRun: boolean): void {
  for (const path of pointers.added) {
    console.error(`  ${green("+")} ${dim(path)} ${dim("(new)")}`);
  }
  for (const path of pointers.refreshed) {
    console.error(
      dryRun
        ? `  ${cyan("~")} ${dim(path)} ${dim("(differs)")}`
        : `  ${green("✓")} ${dim(path)} ${dim("(updated)")}`
    );
  }
}

/**
 * Sync the pointers of a project that has the Claude Code bridge, say what
 * changed and return it as `upgrade` counts. To be run after the method files,
 * so a pointer describes each skill as they left it. A dry run added nothing:
 * the sync is told what would have been.
 */
export function upgradeSkillPointers(
  options: SkillUpgradeOptions
): UpgradeCounts {
  const { cwd, methodDir, dryRun } = options;
  if (!hasClaudeBridge(cwd)) {
    return { added: 0, updated: 0, skipped: 0, upToDate: 0 };
  }
  const pointers = syncSkillPointers(cwd, {
    dryRun,
    pending: dryRun
      ? missingTaskSkills(join(cwd, ".lytos"), methodDir)
      : undefined,
  });
  printPointers(pointers, dryRun);
  for (const message of pointerWarnings(cwd, pointers)) warn(message);

  const refreshed = pointers.refreshed.length;
  const refused =
    pointers.keptForeign.length +
    pointers.behindLink.length +
    pointers.hardLinked.length +
    pointers.failed.length;
  return {
    added: pointers.added.length,
    updated: dryRun ? 0 : refreshed,
    skipped: refused + (dryRun ? refreshed : 0),
    upToDate: pointers.upToDate.length,
  };
}

/** Name the bridge files that never order the reading, and print the section. */
export function warnSilentBridges(cwd: string): void {
  const silent = bridgesWithoutSkillsOrder(cwd);
  if (silent.length === 0) return;
  warn(
    `${silent.join(", ")}: no order to read the task skills that lyt can recognize. upgrade never rewrites a bridge file: add this section yourself. A file that already gives the order in its own words only needs the ${TASK_SKILLS_MARKER} line, alone on its line.`
  );
  console.error(`\n${TASK_SKILLS_SECTION}`);
}
