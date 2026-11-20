/**
 * The add-only half of `lyt upgrade` (ISS-0159): the quality library, and what
 * the project's kit lacks.
 *
 * The library — rubrics and checklists — serves the project's kit, and a project
 * adapts its rubrics to its own architecture. So it is ADD-ONLY: a missing file
 * is added, one that exists is never rewritten, not even by `--force`. The kit
 * itself is linked to the project's stack and is not in any list `upgrade`
 * writes: it is only compared, and the gates it lacks are named.
 *
 * Nothing here is written through a symbolic link (`safe-write.ts`).
 *
 * Zero dependencies.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { QUALITY_LIBRARY_FILES } from "./method-files.js";
import { missingBundledGates } from "./quality.js";
import { symlinkOnPath } from "./safe-write.js";
import { yellow } from "./output.js";

export interface LibraryResult {
  /** Files that were missing and were added (or would be, on a dry run). */
  added: string[];
  /** Files identical to the bundled version. */
  upToDate: number;
  /** Files the project modified: left alone. */
  ownedByProject: number;
  /** Files not written because a symbolic link is on their path. */
  behindLink: Array<{ path: string; link: string }>;
}

/** Add the library files a project lacks. Never rewrites one that exists. */
export function deliverLibrary(
  lytosDir: string,
  methodDir: string,
  dryRun: boolean
): LibraryResult {
  const result: LibraryResult = {
    added: [],
    upToDate: 0,
    ownedByProject: 0,
    behindLink: [],
  };

  for (const relPath of QUALITY_LIBRARY_FILES) {
    const bundledPath = join(methodDir, relPath);
    if (!existsSync(bundledPath)) continue;
    const localPath = join(lytosDir, relPath);

    // First: a dangling link reads as "absent", and a write would create its target.
    const link = symlinkOnPath(localPath, lytosDir);
    if (link) {
      result.behindLink.push({ path: relPath, link });
      continue;
    }

    const bundled = readFileSync(bundledPath, "utf-8");
    if (!existsSync(localPath)) {
      if (!dryRun) {
        mkdirSync(dirname(localPath), { recursive: true });
        writeFileSync(localPath, bundled, "utf-8");
      }
      result.added.push(relPath);
    } else if (readFileSync(localPath, "utf-8") === bundled) {
      result.upToDate++;
    } else {
      result.ownedByProject++;
    }
  }
  return result;
}

/**
 * Where a project reads the bundled kit: the tag of the installed version, not a
 * branch that moves on and stops matching what it installed.
 */
export function bundledKitUrl(version: string): string {
  return `https://github.com/getlytos/lytos-cli/blob/v${version}/method/quality/kit.md`;
}

/**
 * The ids of the bundled gates the project's kit lacks, or [] when the project
 * has no kit (nothing to compare) or has them all.
 */
export function kitGatesMissing(lytosDir: string, methodDir: string): string[] {
  const localKit = join(lytosDir, "quality", "kit.md");
  const bundledKit = join(methodDir, "quality", "kit.md");
  if (!existsSync(localKit) || !existsSync(bundledKit)) return [];
  return missingBundledGates(
    readFileSync(localKit, "utf-8"),
    readFileSync(bundledKit, "utf-8")
  ).map((g) => g.id);
}

/** The line for a file `upgrade` refused to write because a link is on its path. */
export function notWrittenLine(relPath: string, link: string): string {
  return `  ${yellow("!")} ${relPath} not written: ${link} is a symbolic link, and upgrade does not write through one`;
}
