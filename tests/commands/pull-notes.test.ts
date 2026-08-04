/**
 * Integration tests for `lyt pull-notes`.
 *
 * Each test builds a real git topology: a bare origin, a working clone
 * on a feature branch, and commits pushed to origin/main that the
 * branch has not seen. Covers the three fiche scenarios: pure notes
 * repatriated, mixed commit refused, nothing to repatriate.
 */

import { describe, it, expect, afterEach } from "vitest";
import { resolve, join } from "path";
import { mkdirSync, writeFileSync, mkdtempSync, rmSync, existsSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { execSync, spawnSync } from "child_process";
import { createEmptyFixture, type Fixture } from "../helpers/fixtures.js";

const CLI = resolve(__dirname, "../../dist/cli.js");

function run(args: string, cwd: string): { stdout: string; stderr: string; exitCode: number } {
  const result = spawnSync("node", [CLI, ...args.split(" ")], {
    cwd,
    encoding: "utf-8",
  });
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    exitCode: result.status ?? 0,
  };
}

function sh(cmd: string, cwd: string): string {
  return execSync(cmd, { cwd, encoding: "utf-8", stdio: "pipe" });
}

/**
 * Build the base fixture: a repo with .lytos/, a bare origin, main
 * pushed, and a feature branch checked out. Returns the origin path
 * (cleaned up in afterEach alongside the fixture).
 */
function createPullNotesFixture(cwd: string): string {
  const board = join(cwd, ".lytos", "issue-board");
  for (const dir of ["1-backlog", "3-in-progress", "4-review", "5-done"]) {
    mkdirSync(join(board, dir), { recursive: true });
  }
  writeFileSync(join(cwd, "app.js"), "console.log('v1');\n");
  writeFileSync(
    join(board, "1-backlog", "ISS-0001-existing.md"),
    `---\nid: ISS-0001\ntitle: "Existing"\ntype: feat\npriority: P2-normal\neffort: S\nstatus: 1-backlog\ndepends: []\ncreated: 2026-08-01\n---\n\n# ISS-0001 — Existing\n`
  );

  sh("git init -b main", cwd);
  sh("git config user.email 'test@test.com'", cwd);
  sh("git config user.name 'Test'", cwd);
  sh("git add -A && git commit -m 'init' --no-gpg-sign", cwd);

  const origin = mkdtempSync(join(tmpdir(), "lytos-pn-origin-"));
  sh(`git init --bare -b main "${origin}"`, cwd);
  sh(`git remote add origin "${origin}"`, cwd);
  sh("git push -u origin main", cwd);

  // The work lives on a branch.
  sh("git checkout -b feat/some-work", cwd);
  writeFileSync(join(cwd, "feature.js"), "console.log('feature');\n");
  sh("git add -A && git commit -m 'feat: work on branch' --no-gpg-sign", cwd);

  return origin;
}

/**
 * Push commits onto origin/main through a temporary clone, so the
 * fixture branch is genuinely "missing" them. `mutate` receives the
 * clone path and must return commit messages it created.
 */
function pushToOriginMain(originPath: string, mutate: (clone: string) => void): void {
  const clone = mkdtempSync(join(tmpdir(), "lytos-pn-clone-"));
  try {
    sh(`git clone "${originPath}" .`, clone);
    sh("git config user.email 'mobile@test.com'", clone);
    sh("git config user.name 'Mobile'", clone);
    mutate(clone);
    sh("git push origin main", clone);
  } finally {
    rmSync(clone, { recursive: true, force: true });
  }
}

let fixture: Fixture;
let originPath: string | null = null;

afterEach(() => {
  if (fixture) fixture.cleanup();
  if (originPath) {
    rmSync(originPath, { recursive: true, force: true });
    originPath = null;
  }
});

describe("lyt pull-notes", () => {
  it("exits 2 when no .lytos/ exists", () => {
    fixture = createEmptyFixture();
    const result = run("pull-notes", fixture.cwd);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("No .lytos/");
  });

  it("errors politely when there is no origin remote", () => {
    fixture = createEmptyFixture();
    mkdirSync(join(fixture.cwd, ".lytos", "issue-board", "1-backlog"), { recursive: true });
    sh("git init -b main", fixture.cwd);
    const result = run("pull-notes", fixture.cwd);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("origin");
  });

  it("reports nothing to repatriate when origin/main has no new .lytos commits", () => {
    fixture = createEmptyFixture();
    originPath = createPullNotesFixture(fixture.cwd);

    const result = run("pull-notes", fixture.cwd);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("Nothing to repatriate");
  });

  it("cherry-picks pure .lytos commits in order with -x and regenerates the board", () => {
    fixture = createEmptyFixture();
    originPath = createPullNotesFixture(fixture.cwd);

    pushToOriginMain(originPath, (repo) => {
      const noteDir = join(repo, ".lytos", "issue-board", "1-backlog");
      mkdirSync(noteDir, { recursive: true });
      writeFileSync(
        join(noteDir, "ISS-0801-first-note.md"),
        `---\nid: ISS-0801\ntitle: "First note"\ntype: note\npriority: P3-low\neffort: XS\nstatus: 1-backlog\ndepends: []\ncreated: 2026-08-03\n---\n\n# ISS-0801 — First note\n`
      );
      sh("git add -A && git commit -m 'note: premiere note mobile' --no-gpg-sign", repo);
      writeFileSync(
        join(noteDir, "ISS-0802-second-note.md"),
        `---\nid: ISS-0802\ntitle: "Second note"\ntype: note\npriority: P3-low\neffort: XS\nstatus: 1-backlog\ndepends: []\ncreated: 2026-08-04\n---\n\n# ISS-0802 — Second note\n`
      );
      sh("git add -A && git commit -m 'note: deuxieme note mobile' --no-gpg-sign", repo);
    });

    const result = run("pull-notes", fixture.cwd);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("2 note commits cherry-picked");

    // Files landed on the branch
    expect(existsSync(join(fixture.cwd, ".lytos/issue-board/1-backlog/ISS-0801-first-note.md"))).toBe(true);
    expect(existsSync(join(fixture.cwd, ".lytos/issue-board/1-backlog/ISS-0802-second-note.md"))).toBe(true);

    // Cherry-picked in order, with -x traceability
    const log = sh("git log --format='%s%n%b' -4", fixture.cwd);
    expect(log).toContain("premiere note");
    expect(log).toContain("deuxieme note");
    expect(log).toContain("cherry picked from commit");
    const firstIdx = log.indexOf("premiere");
    const secondIdx = log.indexOf("deuxieme");
    // git log is newest-first: the second note must appear before the first
    expect(secondIdx).toBeLessThan(firstIdx);

    // Board regenerated with the new notes
    const boardMd = readFileSync(join(fixture.cwd, ".lytos/issue-board/BOARD.md"), "utf-8");
    expect(boardMd).toContain("ISS-0801");
  });

  it("refuses mixed commits (code + .lytos) with the offending files listed", () => {
    fixture = createEmptyFixture();
    originPath = createPullNotesFixture(fixture.cwd);

    pushToOriginMain(originPath, (repo) => {
      const noteDir = join(repo, ".lytos", "issue-board", "1-backlog");
      mkdirSync(noteDir, { recursive: true });
      writeFileSync(join(noteDir, "NOTE-0003-mixed.md"), "---\nid: NOTE-0003\ntitle: \"Mixed\"\nstatus: 1-backlog\n---\n\n# NOTE-0003\n");
      writeFileSync(join(repo, "hotfix.js"), "console.log('hotfix');\n");
      sh("git add -A && git commit -m 'mixed: note plus hotfix' --no-gpg-sign", repo);
    });

    const result = run("pull-notes", fixture.cwd);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("refused");
    expect(result.stderr).toContain("hotfix.js");

    // Nothing was picked
    expect(existsSync(join(fixture.cwd, ".lytos/issue-board/1-backlog/NOTE-0003-mixed.md"))).toBe(false);
    expect(existsSync(join(fixture.cwd, "hotfix.js"))).toBe(false);
  });

  it("picks the pure notes and still lists the mixed refusals in the same run", () => {
    fixture = createEmptyFixture();
    originPath = createPullNotesFixture(fixture.cwd);

    pushToOriginMain(originPath, (repo) => {
      const noteDir = join(repo, ".lytos", "issue-board", "1-backlog");
      mkdirSync(noteDir, { recursive: true });
      writeFileSync(join(noteDir, "NOTE-0004-pure.md"), "---\nid: NOTE-0004\ntitle: \"Pure\"\nstatus: 1-backlog\n---\n\n# NOTE-0004\n");
      sh("git add -A && git commit -m 'note: pure' --no-gpg-sign", repo);
      writeFileSync(join(noteDir, "NOTE-0005-tangled.md"), "---\nid: NOTE-0005\ntitle: \"Tangled\"\nstatus: 1-backlog\n---\n\n# NOTE-0005\n");
      writeFileSync(join(repo, "tangle.js"), "console.log('tangle');\n");
      sh("git add -A && git commit -m 'mixed: tangled' --no-gpg-sign", repo);
    });

    const result = run("pull-notes", fixture.cwd);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("1 note commit cherry-picked");
    expect(result.stderr).toContain("refused");
    expect(existsSync(join(fixture.cwd, ".lytos/issue-board/1-backlog/NOTE-0004-pure.md"))).toBe(true);
    expect(existsSync(join(fixture.cwd, ".lytos/issue-board/1-backlog/NOTE-0005-tangled.md"))).toBe(false);
  });

  it("--dry-run lists the candidates without touching the tree", () => {
    fixture = createEmptyFixture();
    originPath = createPullNotesFixture(fixture.cwd);

    pushToOriginMain(originPath, (repo) => {
      const noteDir = join(repo, ".lytos", "issue-board", "1-backlog");
      mkdirSync(noteDir, { recursive: true });
      writeFileSync(join(noteDir, "NOTE-0006-preview.md"), "---\nid: NOTE-0006\ntitle: \"Preview\"\nstatus: 1-backlog\n---\n\n# NOTE-0006\n");
      sh("git add -A && git commit -m 'note: a previsualiser' --no-gpg-sign", repo);
    });

    const headBefore = sh("git rev-parse HEAD", fixture.cwd).trim();
    const result = run("pull-notes --dry-run", fixture.cwd);
    const headAfter = sh("git rev-parse HEAD", fixture.cwd).trim();

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("a previsualiser");
    expect(result.stderr).toContain("Dry run");
    expect(headBefore).toBe(headAfter);
    expect(existsSync(join(fixture.cwd, ".lytos/issue-board/1-backlog/NOTE-0006-preview.md"))).toBe(false);
  });

  it("ignores commits already repatriated by a manual cherry-pick", () => {
    fixture = createEmptyFixture();
    originPath = createPullNotesFixture(fixture.cwd);

    pushToOriginMain(originPath, (repo) => {
      const noteDir = join(repo, ".lytos", "issue-board", "1-backlog");
      mkdirSync(noteDir, { recursive: true });
      writeFileSync(join(noteDir, "NOTE-0007-manual.md"), "---\nid: NOTE-0007\ntitle: \"Manual\"\nstatus: 1-backlog\n---\n\n# NOTE-0007\n");
      sh("git add -A && git commit -m 'note: deja rapatriee' --no-gpg-sign", repo);
    });

    // Human already repatriated it by hand (without -x).
    sh("git fetch origin main", fixture.cwd);
    sh("git cherry-pick origin/main", fixture.cwd);

    const result = run("pull-notes", fixture.cwd);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("Nothing to repatriate");
  });
});
