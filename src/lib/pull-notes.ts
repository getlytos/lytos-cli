/**
 * lyt pull-notes helpers — bring .lytos-only commits from origin/main
 * back onto the current branch.
 *
 * Field pattern: notes dropped from mobile land on main while the actual
 * work lives on feature branches — the branch board never sees them, and
 * repatriation used to mean hunting SHAs by eye and cherry-picking by
 * hand. These helpers do the classification; the command does the picks.
 *
 * A commit qualifies as a "note" when every file it touches lives under
 * `.lytos/`. A commit that touches `.lytos/` AND code is a real merge
 * candidate, not a repatriation — it is refused with its file list so
 * the human understands why.
 */

import { execFileSync } from "child_process";

export interface NoteCommit {
  sha: string;
  shortSha: string;
  subject: string;
  files: string[];
}

export interface PullNotesScan {
  /** Commits touching only .lytos/ — safe to cherry-pick, oldest first. */
  notes: NoteCommit[];
  /** Commits touching .lytos/ AND code — refused, listed with reasons. */
  mixed: NoteCommit[];
  /** Count of commits not touching .lytos/ at all — ignored silently. */
  codeOnly: number;
}

function git(cwd: string, args: string[], timeout = 15_000): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf-8",
    stdio: "pipe",
    timeout,
  });
}

/** True when the path belongs to the Lytos context directory. */
function isLytosPath(path: string): boolean {
  return path === ".lytos" || path.startsWith(".lytos/");
}

/**
 * List commits reachable from `origin/<main>` but not from HEAD, oldest
 * first, and classify each one by the files it touches.
 *
 * `--cherry-pick --right-only` drops commits whose patch already exists
 * on HEAD under another SHA — exactly the manual-cherry-pick history
 * this command replaces.
 */
export function scanOriginNotes(
  cwd: string,
  mainBranch = "main"
): PullNotesScan {
  const scan: PullNotesScan = { notes: [], mixed: [], codeOnly: 0 };

  const revList = git(cwd, [
    "rev-list",
    "--reverse",
    "--right-only",
    "--cherry-pick",
    `HEAD...origin/${mainBranch}`,
  ]);
  const shas = revList
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const sha of shas) {
    const subject = git(cwd, ["log", "-1", "--format=%s", sha]).trim();
    const shortSha = git(cwd, ["rev-parse", "--short", sha]).trim();
    const files = git(cwd, [
      "diff-tree",
      "--no-commit-id",
      "--name-only",
      "-r",
      "--root",
      sha,
    ])
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const commit: NoteCommit = { sha, shortSha, subject, files };
    const lytosFiles = files.filter(isLytosPath);

    if (lytosFiles.length === 0) {
      scan.codeOnly++;
    } else if (lytosFiles.length === files.length) {
      scan.notes.push(commit);
    } else {
      scan.mixed.push(commit);
    }
  }

  return scan;
}

export interface CherryPickResult {
  picked: NoteCommit[];
  /** Set when a pick failed — the pick was aborted, the tree is clean. */
  failed?: { commit: NoteCommit; message: string };
}

/**
 * Cherry-pick note commits in order with `-x` (records the origin SHA in
 * the message). On the first failure the pick is aborted so the working
 * tree stays clean, and the failure is reported to the caller.
 */
export function cherryPickNotes(
  cwd: string,
  notes: NoteCommit[]
): CherryPickResult {
  const picked: NoteCommit[] = [];

  for (const commit of notes) {
    try {
      git(cwd, ["cherry-pick", "-x", commit.sha], 30_000);
      picked.push(commit);
    } catch (err) {
      try {
        git(cwd, ["cherry-pick", "--abort"]);
      } catch {
        // No pick in progress (e.g. the failure happened before the pick
        // started) — nothing to abort.
      }
      return {
        picked,
        failed: {
          commit,
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  }

  return { picked };
}
