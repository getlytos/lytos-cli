/**
 * Git hooks — install and manage hooks for Lytos projects.
 *
 * Installs a pre-commit hook that enforces branch naming convention.
 * Model-agnostic: works with any LLM, any AI tool, or human workflows.
 * The hook is a shell script — zero dependencies, instant execution.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from "fs";
import { join } from "path";

const LYTOS_HOOK_START = "# --- lytos pre-commit hook start ---";
const LYTOS_HOOK_END = "# --- lytos pre-commit hook end ---";

const HOOK_SCRIPT = `${LYTOS_HOOK_START}
# Enforce branch naming convention: type/ISS-XXXX-slug
# Installed by lyt init — do not edit between markers.
# Bypass with: git commit --no-verify

# Skip in CI
if [ "\${CI:-}" = "true" ]; then
  exit 0
fi

# Allow merge commits (no branch check needed)
if git rev-parse MERGE_HEAD > /dev/null 2>&1; then
  exit 0
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

# Allow initial commit (detached HEAD or no commits yet)
if [ -z "$BRANCH" ] || [ "$BRANCH" = "HEAD" ]; then
  exit 0
fi

# Block direct commits on main/dev/master
case "$BRANCH" in
  main|dev|master)
    echo ""
    echo "  ✗ Direct commit on '$BRANCH' is not allowed."
    echo ""
    echo "  Lytos requires a branch per issue."
    echo "  Run: lyt start ISS-XXXX"
    echo ""
    echo "  To bypass this check: git commit --no-verify"
    echo ""
    exit 1
    ;;
esac

# Verify branch follows type/ISS-XXXX-* pattern
if ! echo "$BRANCH" | grep -qE '^(feat|fix|refactor|chore|docs|test|style|perf)/ISS-[0-9]+-'; then
  echo ""
  echo "  ✗ Branch '$BRANCH' doesn't follow Lytos naming convention."
  echo ""
  echo "  Expected: type/ISS-XXXX-description"
  echo "  Example:  feat/ISS-0042-add-payment"
  echo ""
  echo "  Run: lyt start ISS-XXXX"
  echo "  To bypass: git commit --no-verify"
  echo ""
  exit 1
fi
${LYTOS_HOOK_END}`;

/**
 * Install the Lytos pre-commit hook in a git repository.
 *
 * - If no .git/ exists, returns "no-git"
 * - If hook doesn't exist, creates it
 * - If hook exists but has no Lytos section, appends
 * - If hook exists with Lytos section, replaces it
 * - Returns the action taken
 */
export function installPreCommitHook(
  cwd: string,
  dryRun: boolean = false
): "installed" | "updated" | "no-git" | "dry-run" {
  const gitDir = join(cwd, ".git");
  if (!existsSync(gitDir)) return "no-git";

  if (dryRun) return "dry-run";

  const hooksDir = join(gitDir, "hooks");
  if (!existsSync(hooksDir)) {
    mkdirSync(hooksDir, { recursive: true });
  }

  const hookPath = join(hooksDir, "pre-commit");

  if (!existsSync(hookPath)) {
    // No hook exists — create from scratch
    writeFileSync(hookPath, `#!/bin/sh\n\n${HOOK_SCRIPT}\n`, "utf-8");
    chmodSync(hookPath, 0o755);
    return "installed";
  }

  // Hook exists — check if it already has Lytos section
  const existing = readFileSync(hookPath, "utf-8");

  if (existing.includes(LYTOS_HOOK_START)) {
    // Replace existing Lytos section
    const before = existing.split(LYTOS_HOOK_START)[0];
    const after = existing.split(LYTOS_HOOK_END)[1] || "";
    writeFileSync(hookPath, `${before}${HOOK_SCRIPT}${after}`, "utf-8");
    chmodSync(hookPath, 0o755);
    return "updated";
  }

  // Append to existing hook
  writeFileSync(hookPath, `${existing}\n\n${HOOK_SCRIPT}\n`, "utf-8");
  chmodSync(hookPath, 0o755);
  return "installed";
}
