/**
 * Install / verify the `lytos-issue` git merge driver (ISS-0093).
 *
 * Two pieces, both required:
 *   1. `.gitattributes` at the repo root maps issue files to the driver.
 *   2. Local git config tells git which command implements it.
 *
 * `lyt init` installs both; `lyt doctor` verifies both. The config half
 * is per-clone (git config is not versioned), which is exactly why
 * doctor keeps checking it on every machine.
 */

import { existsSync, readFileSync, writeFileSync, appendFileSync } from "fs";
import { join } from "path";
import { execFileSync } from "child_process";

export const MERGE_DRIVER_NAME = "lytos-issue";
export const GITATTRIBUTES_LINE = `.lytos/issue-board/**/*.md merge=${MERGE_DRIVER_NAME}`;
export const MERGE_DRIVER_COMMAND = "npx lyt _merge-issue %O %A %B";

export type MergeDriverInstallResult =
  | "installed"
  | "already"
  | "no-git"
  | "dry-run"
  | "error";

function isGitRepo(cwd: string): boolean {
  // A plain worktree has a .git directory; a linked worktree has a .git file.
  return existsSync(join(cwd, ".git"));
}

function hasAttributesLine(cwd: string): boolean {
  const path = join(cwd, ".gitattributes");
  if (!existsSync(path)) return false;
  return readFileSync(path, "utf-8")
    .split("\n")
    .some((line) => line.trim() === GITATTRIBUTES_LINE);
}

function configuredDriver(cwd: string): string | null {
  try {
    return execFileSync(
      "git",
      ["config", "--get", `merge.${MERGE_DRIVER_NAME}.driver`],
      { cwd, encoding: "utf-8", stdio: "pipe" }
    ).trim();
  } catch {
    return null; // unset (git exits 1) or git unavailable
  }
}

/**
 * Install the merge driver: the .gitattributes mapping + the git config
 * entry. Idempotent — reruns of `lyt init` leave an installed driver alone.
 */
export function installMergeDriver(
  cwd: string,
  dryRun: boolean
): MergeDriverInstallResult {
  if (!isGitRepo(cwd)) return "no-git";
  if (dryRun) return "dry-run";

  const attributesOk = hasAttributesLine(cwd);
  const configOk = configuredDriver(cwd) === MERGE_DRIVER_COMMAND;
  if (attributesOk && configOk) return "already";

  try {
    if (!attributesOk) {
      const path = join(cwd, ".gitattributes");
      const header =
        "# Lytos: structural merge for issue fiches — frontmatter field by field,\n# body as the ordered union of ## sections (see `lyt _merge-issue`).\n";
      if (!existsSync(path)) {
        writeFileSync(path, header + GITATTRIBUTES_LINE + "\n", "utf-8");
      } else {
        const existing = readFileSync(path, "utf-8");
        const separator =
          existing.endsWith("\n") || existing === "" ? "" : "\n";
        appendFileSync(
          path,
          `${separator}${header}${GITATTRIBUTES_LINE}\n`,
          "utf-8"
        );
      }
    }
    if (!configOk) {
      execFileSync(
        "git",
        ["config", `merge.${MERGE_DRIVER_NAME}.driver`, MERGE_DRIVER_COMMAND],
        { cwd, stdio: "pipe" }
      );
      execFileSync(
        "git",
        [
          "config",
          `merge.${MERGE_DRIVER_NAME}.name`,
          "Lytos issue-fiche structural merge",
        ],
        { cwd, stdio: "pipe" }
      );
    }
    return "installed";
  } catch {
    return "error";
  }
}

export interface MergeDriverCheck {
  gitRepo: boolean;
  attributesOk: boolean;
  configOk: boolean;
}

/** Verify both halves of the driver installation (used by `lyt doctor`). */
export function checkMergeDriver(cwd: string): MergeDriverCheck {
  if (!isGitRepo(cwd)) {
    return { gitRepo: false, attributesOk: false, configOk: false };
  }
  return {
    gitRepo: true,
    attributesOk: hasAttributesLine(cwd),
    configOk: configuredDriver(cwd) !== null,
  };
}
