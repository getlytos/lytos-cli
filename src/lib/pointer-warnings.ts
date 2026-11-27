/**
 * What a person has to be told after the pointer skills are synced (ISS-0191).
 *
 * Read-only. Zero dependencies.
 */

import { execFileSync } from "child_process";
import type { PointerResult } from "./skill-pointers.js";

/**
 * Appended to a `.gitignore` that ignores all of `.claude/`, these let git see
 * the pointers and nothing else. Re-including the pointer folders alone does
 * nothing: git never looks inside an excluded directory. Each level has to be
 * re-included, then closed again. The last line answers a `.claude/**` rule.
 */
export const UNIGNORE_LINES: readonly string[] = [
  "!.claude/",
  ".claude/*",
  "!.claude/skills/",
  ".claude/skills/*",
  "!.claude/skills/lytos-*/",
  "!.claude/skills/lytos-*/**",
];

/** Does git ignore this path? False outside a repository or without git. */
function ignoredByGit(cwd: string, path: string): boolean {
  try {
    execFileSync("git", ["check-ignore", "-q", "--", path], {
      cwd,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * The pointers that could not be written, and pointers git ignores — present
 * here, absent from a fresh clone, a worktree or a cloud session.
 */
export function pointerWarnings(cwd: string, result: PointerResult): string[] {
  const warnings = [
    ...result.invalid.map(
      ({ name, problem }) =>
        `No Claude Code pointer for the skill "${name}": ${problem}.`
    ),
    ...result.behindLink.map(
      ({ path, link }) =>
        `${path} not written: ${link} is a symbolic link, and lyt does not write through one.`
    ),
    ...result.failed.map(
      ({ path, reason }) => `${path} not written (${reason}).`
    ),
    ...result.keptForeign.map(
      (path) =>
        `Kept ${path}: lyt did not generate it. Claude Code will not be pointed at that Lytos skill.`
    ),
  ];

  const written = [...result.added, ...result.refreshed, ...result.upToDate];
  if (written.some((path) => ignoredByGit(cwd, path))) {
    warnings.push(
      [
        "git ignores the pointers in .claude/skills/: a fresh clone, a worktree or a cloud session will not have them. If you ignore all of .claude/, add these lines at the end of .gitignore, then commit the pointers:",
        ...UNIGNORE_LINES.map((line) => `    ${line}`),
      ].join("\n")
    );
  }
  return warnings;
}
