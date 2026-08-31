/**
 * lyt pull-notes — repatriate .lytos-only commits from origin/main onto
 * the current branch.
 *
 * Notes dropped on main (mobile capture, planning sessions) stay
 * invisible to the branch board until someone hunts the SHAs by eye.
 * This command lists the commits of origin/main absent from HEAD that
 * touch ONLY `.lytos/`, cherry-picks them in order with `-x`, and
 * regenerates the board. Commits that also touch code are refused with
 * their file list — those belong to a merge, not a repatriation.
 */

import { Command } from "commander";
import { existsSync } from "fs";
import { resolve } from "path";
import { execFileSync } from "child_process";
import {
  scanOriginNotes,
  cherryPickNotes,
  type NoteCommit,
} from "../lib/pull-notes.js";
import { regenerateBoard } from "../lib/issue-ops.js";
import {
  ok,
  info,
  warn,
  error,
  bold,
  cyan,
  green,
  yellow,
  dim,
} from "../lib/output.js";

function ensureGitContext(cwd: string, mainBranch: string): string | null {
  try {
    execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
      cwd,
      stdio: "pipe",
    });
  } catch {
    return "Not a git repository — nothing to pull notes from.";
  }
  try {
    execFileSync("git", ["remote", "get-url", "origin"], {
      cwd,
      stdio: "pipe",
    });
  } catch {
    return "No `origin` remote — nothing to pull notes from.";
  }
  // Best-effort fetch so origin/main is fresh; offline is not fatal.
  try {
    execFileSync("git", ["fetch", "--quiet", "origin", mainBranch], {
      cwd,
      stdio: "pipe",
      timeout: 15_000,
    });
  } catch {
    warn(
      `Could not fetch origin/${mainBranch} — using the last known origin state.`
    );
  }
  try {
    execFileSync("git", ["rev-parse", "--verify", `origin/${mainBranch}`], {
      cwd,
      stdio: "pipe",
    });
  } catch {
    return `origin/${mainBranch} does not exist — nothing to pull notes from.`;
  }
  return null;
}

function printCommitLine(c: NoteCommit, marker: string): void {
  console.error(`  ${marker} ${cyan(bold(c.shortSha))} ${c.subject}`);
}

function printMixedRefusals(mixed: NoteCommit[]): void {
  console.error("");
  warn(
    `${mixed.length} commit${mixed.length > 1 ? "s" : ""} refused — touching code as well as .lytos/ (repatriation is for notes; these need a merge):`
  );
  for (const c of mixed) {
    printCommitLine(c, yellow("✗"));
    for (const f of c.files.filter((f) => !f.startsWith(".lytos"))) {
      console.error(`      ${dim(f)}`);
    }
  }
}

export const pullNotesCommand = new Command("pull-notes")
  .description(
    "Cherry-pick .lytos-only commits from origin/main onto the current branch, then regenerate the board"
  )
  .option(
    "--dry-run",
    "List what would be cherry-picked, change nothing",
    false
  )
  .option("--main <branch>", "Name of the main branch on origin", "main")
  .on("--help", () => {
    console.log("");
    console.log("Examples:");
    console.log(
      "  lyt pull-notes             # cherry-pick every pending note commit"
    );
    console.log(
      "  lyt pull-notes --dry-run   # list them without touching the tree"
    );
    console.log("");
    console.log(
      "A note commit touches ONLY .lytos/. Commits mixing .lytos/ and"
    );
    console.log("code are refused and listed — merge those branches instead.");
  })
  .action((opts: { dryRun?: boolean; main?: string }) => {
    const cwd = process.cwd();
    const lytosDir = resolve(cwd, ".lytos");
    const mainBranch = opts.main || "main";

    if (!existsSync(lytosDir)) {
      error("No .lytos/ directory found. Run `lyt init` first.");
      process.exit(2);
    }

    const contextError = ensureGitContext(cwd, mainBranch);
    if (contextError) {
      error(contextError);
      process.exit(1);
    }

    let scan;
    try {
      scan = scanOriginNotes(cwd, mainBranch);
    } catch (err) {
      error(
        `Could not scan origin/${mainBranch}: ${err instanceof Error ? err.message : String(err)}`
      );
      process.exit(1);
    }

    if (scan.notes.length === 0 && scan.mixed.length === 0) {
      info(
        `No .lytos-only commits on origin/${mainBranch} missing from HEAD. Nothing to repatriate.`
      );
      return;
    }

    if (scan.notes.length > 0) {
      console.error("");
      info(
        `${scan.notes.length} note commit${scan.notes.length > 1 ? "s" : ""} on origin/${mainBranch} missing from HEAD:`
      );
      for (const c of scan.notes) {
        printCommitLine(c, green("+"));
      }
    }

    if (scan.mixed.length > 0) {
      printMixedRefusals(scan.mixed);
    }

    if (opts.dryRun) {
      console.error("");
      info("Dry run — no cherry-pick performed.");
      return;
    }

    if (scan.notes.length === 0) {
      // Only mixed commits — the refusal above is the whole answer.
      console.error("");
      process.exit(1);
    }

    const result = cherryPickNotes(cwd, scan.notes);

    if (result.picked.length > 0) {
      regenerateBoard(lytosDir);
    }

    console.error("");
    if (result.failed) {
      error(
        `Cherry-pick of ${result.failed.commit.shortSha} failed and was aborted — ` +
          `${result.picked.length} of ${scan.notes.length} picked before it. Resolve manually: ` +
          `git cherry-pick -x ${result.failed.commit.shortSha}`
      );
      process.exit(1);
    }

    ok(
      `${result.picked.length} note commit${result.picked.length > 1 ? "s" : ""} cherry-picked (-x) onto the current branch`
    );
    info("Board regenerated");
    console.error("");
  });
