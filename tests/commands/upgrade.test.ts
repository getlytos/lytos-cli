/**
 * Integration tests for `lyt upgrade`.
 *
 * Covers: fresh .lytos/ (everything up to date), modified file with --force,
 * missing file auto-added, --dry-run listing, no .lytos/ → exit 2.
 */

import { describe, it, expect, afterEach } from "vitest";
import { spawnSync } from "child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, unlinkSync, rmSync, symlinkSync } from "fs";
import { resolve, join } from "path";
import { createEmptyFixture, type Fixture } from "../helpers/fixtures.js";
import { QUALITY_LIBRARY_FILES } from "../../src/lib/method-files.js";

const CLI = resolve(__dirname, "../../dist/cli.js");

function run(args: string, cwd: string): { stdout: string; stderr: string; exitCode: number } {
  const result = spawnSync("node", [CLI, ...args.split(" ").filter(Boolean)], {
    cwd,
    encoding: "utf-8",
  });
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    exitCode: result.status ?? 0,
  };
}

let fixture: Fixture;

afterEach(() => {
  if (fixture) fixture.cleanup();
});

describe("lyt upgrade", () => {
  it("exits 2 when no .lytos/ directory exists", () => {
    fixture = createEmptyFixture();
    const result = run("upgrade --dry-run", fixture.cwd);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("No .lytos/");
  });

  it("reports all files up to date after fresh init", () => {
    fixture = createEmptyFixture();
    run("init --yes", fixture.cwd);

    const result = run("upgrade --dry-run", fixture.cwd);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("up to date");
    // No "(differs)" when nothing differs
    expect(result.stderr).not.toContain("(differs)");
  });

  it("reports a missing file as new in --dry-run", () => {
    fixture = createEmptyFixture();
    run("init --yes", fixture.cwd);

    // Delete one upgradeable file
    const skillPath = join(
      fixture.cwd,
      ".lytos",
      "skills",
      "session-start.md"
    );
    unlinkSync(skillPath);

    const result = run("upgrade --dry-run", fixture.cwd);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("skills/session-start.md");
    expect(result.stderr).toContain("(new)");

    // --dry-run does not write
    expect(existsSync(skillPath)).toBe(false);
  });

  it("--force overwrites a modified file", () => {
    fixture = createEmptyFixture();
    run("init --yes", fixture.cwd);

    const lytosMd = join(fixture.cwd, ".lytos", "LYTOS.md");
    const original = readFileSync(lytosMd, "utf-8");
    writeFileSync(lytosMd, "USER MODIFIED CONTENT", "utf-8");

    const result = run("upgrade --force", fixture.cwd);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("LYTOS.md");
    expect(result.stderr).toContain("updated");

    const after = readFileSync(lytosMd, "utf-8");
    expect(after).toBe(original);
  });

  it("--force adds a missing file and writes it", () => {
    fixture = createEmptyFixture();
    run("init --yes", fixture.cwd);

    const skillPath = join(
      fixture.cwd,
      ".lytos",
      "skills",
      "session-start.md"
    );
    unlinkSync(skillPath);

    const result = run("upgrade --force", fixture.cwd);
    expect(result.exitCode).toBe(0);
    expect(existsSync(skillPath)).toBe(true);
    expect(result.stderr).toContain("(new)");
  });

  it("recreates a missing 6-private-notes/.gitkeep (legacy project)", () => {
    fixture = createEmptyFixture();
    run("init --yes", fixture.cwd);

    // Simulate a project that pre-dates the 6-private-notes column:
    // wipe the folder entirely, including its .gitkeep.
    const privateNotesDir = join(
      fixture.cwd,
      ".lytos",
      "issue-board",
      "6-private-notes"
    );
    rmSync(privateNotesDir, { recursive: true, force: true });
    expect(existsSync(privateNotesDir)).toBe(false);

    const result = run("upgrade --force", fixture.cwd);
    expect(result.exitCode).toBe(0);

    const gitkeep = join(privateNotesDir, ".gitkeep");
    expect(existsSync(gitkeep)).toBe(true);
    expect(result.stderr).toContain("issue-board/6-private-notes/.gitkeep");
  });

  it("--dry-run reports missing kanban .gitkeeps without writing them", () => {
    fixture = createEmptyFixture();
    run("init --yes", fixture.cwd);

    const privateNotesDir = join(
      fixture.cwd,
      ".lytos",
      "issue-board",
      "6-private-notes"
    );
    rmSync(privateNotesDir, { recursive: true, force: true });

    const result = run("upgrade --dry-run", fixture.cwd);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("issue-board/6-private-notes/.gitkeep");
    expect(existsSync(privateNotesDir)).toBe(false);
  });

  it("never touches manifest.md when it has been modified", () => {
    fixture = createEmptyFixture();
    run("init --yes", fixture.cwd);

    const manifest = join(fixture.cwd, ".lytos", "manifest.md");
    const userContent = "# My personal manifest\n\nCustom notes.";
    writeFileSync(manifest, userContent, "utf-8");

    run("upgrade --force", fixture.cwd);

    const after = readFileSync(manifest, "utf-8");
    expect(after).toBe(userContent);
  });

  it("--migrate-cursor moves legacy .cursorrules to .cursor/rules/lytos.mdc (ISS-0050)", () => {
    fixture = createEmptyFixture();
    run("init --yes --tool none", fixture.cwd);

    const legacy = join(fixture.cwd, ".cursorrules");
    const modern = join(fixture.cwd, ".cursor", "rules", "lytos.mdc");
    const legacyContent = "# Our project rules\n\nAlways use Tailwind, never CSS modules.\n";
    writeFileSync(legacy, legacyContent, "utf-8");

    const result = run("upgrade --migrate-cursor --force", fixture.cwd);
    expect(result.exitCode).toBe(0);

    // Legacy file removed, modern file written
    expect(existsSync(legacy)).toBe(false);
    expect(existsSync(modern)).toBe(true);

    const migrated = readFileSync(modern, "utf-8");
    // Wrapped in the modern front-matter
    expect(migrated).toMatch(/^---\n[\s\S]*?alwaysApply: true[\s\S]*?\n---\n/);
    // Original content preserved verbatim in the body
    expect(migrated).toContain("Always use Tailwind, never CSS modules.");
  });

  it("--migrate-cursor with --dry-run leaves everything in place (ISS-0050)", () => {
    fixture = createEmptyFixture();
    run("init --yes --tool none", fixture.cwd);

    const legacy = join(fixture.cwd, ".cursorrules");
    const modern = join(fixture.cwd, ".cursor", "rules", "lytos.mdc");
    writeFileSync(legacy, "legacy content\n", "utf-8");

    const result = run("upgrade --migrate-cursor --dry-run", fixture.cwd);
    expect(result.exitCode).toBe(0);
    expect(existsSync(legacy)).toBe(true);
    expect(existsSync(modern)).toBe(false);
    expect(result.stderr).toContain("would migrate");
  });

  it("--migrate-cursor with both files present refuses to touch either (ISS-0050)", () => {
    fixture = createEmptyFixture();
    run("init --yes --tool cursor", fixture.cwd);

    // Modern path is already there after `init --tool cursor`; add a legacy
    // file on top so we simulate a half-migrated project.
    const legacy = join(fixture.cwd, ".cursorrules");
    const modern = join(fixture.cwd, ".cursor", "rules", "lytos.mdc");
    writeFileSync(legacy, "legacy content\n", "utf-8");
    const modernBefore = readFileSync(modern, "utf-8");

    const result = run("upgrade --migrate-cursor --force", fixture.cwd);
    expect(result.exitCode).toBe(0);

    // Neither file was touched
    expect(existsSync(legacy)).toBe(true);
    expect(readFileSync(legacy, "utf-8")).toBe("legacy content\n");
    expect(readFileSync(modern, "utf-8")).toBe(modernBefore);
    // Warning surfaces the conflict
    expect(result.stderr).toContain("both present");
  });

  it("--migrate-cursor is a no-op when no legacy .cursorrules exists (ISS-0050)", () => {
    fixture = createEmptyFixture();
    run("init --yes --tool none", fixture.cwd);

    const result = run("upgrade --migrate-cursor --force", fixture.cwd);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("No legacy .cursorrules");
  });

  it("--migrate-cursor is idempotent — running twice is safe (ISS-0050)", () => {
    fixture = createEmptyFixture();
    run("init --yes --tool none", fixture.cwd);

    const legacy = join(fixture.cwd, ".cursorrules");
    const modern = join(fixture.cwd, ".cursor", "rules", "lytos.mdc");
    writeFileSync(legacy, "first run content\n", "utf-8");

    const first = run("upgrade --migrate-cursor --force", fixture.cwd);
    expect(first.exitCode).toBe(0);
    const afterFirst = readFileSync(modern, "utf-8");

    // Second run: legacy is gone, modern is untouched, no error
    const second = run("upgrade --migrate-cursor --force", fixture.cwd);
    expect(second.exitCode).toBe(0);
    expect(second.stderr).toContain("No legacy .cursorrules");
    expect(readFileSync(modern, "utf-8")).toBe(afterFirst);
  });

  it("warns about a legacy .cursorrules even when --migrate-cursor is omitted (ISS-0050)", () => {
    fixture = createEmptyFixture();
    run("init --yes --tool none", fixture.cwd);

    // Seed a legacy file without the modern path — the project is on the
    // deprecated Cursor convention but the user ran a plain `lyt upgrade`.
    writeFileSync(join(fixture.cwd, ".cursorrules"), "legacy body\n", "utf-8");

    const result = run("upgrade --force", fixture.cwd);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("Legacy .cursorrules detected");
    expect(result.stderr).toContain("--migrate-cursor");
    // Legacy file is left in place — the warning is informational only.
    expect(existsSync(join(fixture.cwd, ".cursorrules"))).toBe(true);
  });

  it("does not warn about .cursorrules when the modern path already exists (ISS-0050)", () => {
    fixture = createEmptyFixture();
    run("init --yes --tool none", fixture.cwd);

    // Both files present is the migrated-but-stale case — handled
    // separately by --migrate-cursor's "both-present" branch.
    writeFileSync(join(fixture.cwd, ".cursorrules"), "legacy body\n", "utf-8");
    const modernDir = join(fixture.cwd, ".cursor", "rules");
    mkdirSync(modernDir, { recursive: true });
    writeFileSync(join(modernDir, "lytos.mdc"), "modern body\n", "utf-8");

    const result = run("upgrade --force", fixture.cwd);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).not.toContain("Legacy .cursorrules detected");
  });
});

describe("lyt upgrade — what is the project's own (ISS-0159)", () => {
  const METHOD = resolve(__dirname, "../../method");
  const lytos = (cwd: string, p: string): string => join(cwd, ".lytos", p);
  const bundled = (p: string): string => readFileSync(join(METHOD, p), "utf-8");

  /**
   * A kit the way a real project leaves it after linking it to its stack: the `tool`
   * cells hold real commands, one row it does not need is gone, one of its own is added.
   */
  function linkKit(cwd: string): { kit: string; stack: string } {
    const shipped = bundled("quality/kit.md");
    const linked = shipped
      .split("\n")
      .filter((l) => !l.startsWith("| ds-conformance |") && !l.startsWith("| perf-budget |"))
      .map((l) => {
        if (l.startsWith("| tests-unit |")) return "| tests-unit | gate | low,medium,high | `npm test` (Vitest, then the static suite) |";
        if (l.startsWith("| typecheck |")) return "| typecheck | gate | low,medium,high | `npm run typecheck` |";
        if (l.startsWith("| lint |")) return "| lint | gate | low,medium,high | `npx eslint .` |";
        if (l.startsWith("| secrets-scan |")) return "| secrets-scan | gate | low,medium,high | `gitleaks detect --redact` |";
        if (l.startsWith("| e2e |")) return "| e2e | gate | high | `npm run test:e2e` |";
        if (l.startsWith("| red-team |")) return "| red-team | reviewer | high | rubric:red-team |\n| permissions | gate | medium,high | `npx vitest run permissions` |";
        return l;
      })
      .join("\n");
    const stack = '---\nlockfile: "package-lock.json"\ndocs_source: "docs/vendor"\n---\n\n# Stack contract\n\n## Allowed dependencies\n\n- commander\n';
    writeFileSync(lytos(cwd, "quality/kit.md"), linked, "utf-8");
    writeFileSync(lytos(cwd, "quality/stack.md"), stack, "utf-8");
    return { kit: linked, stack };
  }

  function freshProject(): string {
    fixture = createEmptyFixture();
    expect(run("init --yes --tool none", fixture.cwd).exitCode).toBe(0);
    return fixture.cwd;
  }

  it("never overwrites a kit linked to the stack, nor its stack contract — with --force, without it, or on a dry run", () => {
    const cwd = freshProject();
    const { kit, stack } = linkKit(cwd);

    for (const args of ["upgrade --force", "upgrade", "upgrade --dry-run"]) {
      const result = run(args, cwd);
      expect(result.exitCode, args).toBe(0);
      expect(readFileSync(lytos(cwd, "quality/kit.md"), "utf-8"), `${args}: kit.md`).toBe(kit);
      expect(readFileSync(lytos(cwd, "quality/stack.md"), "utf-8"), `${args}: stack.md`).toBe(stack);
    }
  });

  it("keeps every gate binding of a linked project exactly as the project wrote it", () => {
    const cwd = freshProject();
    linkKit(cwd);
    const before = readFileSync(lytos(cwd, "quality/kit.md"), "utf-8");
    run("upgrade --force", cwd);
    const after = readFileSync(lytos(cwd, "quality/kit.md"), "utf-8");
    // The linked commands are still there, the dropped rows are still dropped, the added row is still added.
    expect(after).toContain("| tests-unit | gate | low,medium,high | `npm test` (Vitest, then the static suite) |");
    expect(after).toContain("| permissions | gate | medium,high |");
    expect(after).not.toContain("| ds-conformance |");
    expect(after).not.toContain("<your test command");
    expect(after).toBe(before);
  });

  it("adds the library files a project lacks, prints them as new, and a second run adds nothing", () => {
    const cwd = freshProject();
    rmSync(lytos(cwd, "quality/rubrics"), { recursive: true, force: true });
    rmSync(lytos(cwd, "quality/checklists"), { recursive: true, force: true });

    const first = run("upgrade --force", cwd);
    expect(first.exitCode).toBe(0);
    for (const path of QUALITY_LIBRARY_FILES) {
      expect(first.stderr, path).toContain(path);
      expect(readFileSync(lytos(cwd, path), "utf-8"), path).toBe(bundled(path));
    }
    expect(first.stderr).toContain("(new)");

    const second = run("upgrade --force", cwd);
    expect(second.stderr).not.toContain("(new)");
    expect(second.stderr).toContain("Already up to date");
  });

  it("--dry-run lists the missing library files and writes none of them", () => {
    const cwd = freshProject();
    rmSync(lytos(cwd, "quality/rubrics"), { recursive: true, force: true });
    const result = run("upgrade --dry-run", cwd);
    expect(result.stderr).toContain("quality/rubrics/cost-review.md");
    expect(result.stderr).toContain("(new)");
    expect(existsSync(lytos(cwd, "quality/rubrics"))).toBe(false);
  });

  it("leaves a rubric or a checklist the project modified alone — even with --force — and says so", () => {
    const cwd = freshProject();
    const mine = "# Rubric: security\n\nOur own grid: tenant isolation, and nothing else.\n";
    const mineList = "# Human list: product intent\n\n- the founder signs\n";
    writeFileSync(lytos(cwd, "quality/rubrics/security.md"), mine);
    writeFileSync(lytos(cwd, "quality/checklists/intent.md"), mineList);
    const untouched = readFileSync(lytos(cwd, "quality/rubrics/ux.md"), "utf-8");

    const result = run("upgrade --force", cwd);
    expect(result.exitCode).toBe(0);
    expect(readFileSync(lytos(cwd, "quality/rubrics/security.md"), "utf-8")).toBe(mine);
    expect(readFileSync(lytos(cwd, "quality/checklists/intent.md"), "utf-8")).toBe(mineList);
    expect(readFileSync(lytos(cwd, "quality/rubrics/ux.md"), "utf-8")).toBe(untouched);
    expect(result.stderr).toMatch(/2 quality library file\(s\) differ from the bundled version and were left alone/);
    expect(result.stderr).not.toContain("quality/rubrics/security.md (updated)");
  });

  it("names the bundled kit gates the project's kit lacks, and writes nothing", () => {
    const cwd = freshProject();
    const { kit } = linkKit(cwd);
    const result = run("upgrade --dry-run", cwd);
    expect(result.stderr).toContain("quality/kit.md is yours");
    // The link names the version that is installed, not a branch that moves on.
    const version = JSON.parse(readFileSync(resolve(__dirname, "../../package.json"), "utf-8")).version;
    expect(result.stderr).toContain(`github.com/getlytos/lytos-cli/blob/v${version}/method/quality/kit.md`);
    expect(result.stderr).not.toContain("blob/main");
    // `ds-conformance` and `perf-budget` were dropped on purpose but are still named: the
    // line is informational and says to ignore what was dropped deliberately.
    expect(result.stderr).toContain("ds-conformance");
    expect(result.stderr).toContain("perf-budget");
    // What the project has is not named as missing.
    const hint = result.stderr.split("\n").find((l) => l.includes("not in your kit")) ?? "";
    expect(hint).not.toContain("tests-unit");
    expect(hint).not.toContain("permissions");
    expect(readFileSync(lytos(cwd, "quality/kit.md"), "utf-8")).toBe(kit);
  });

  it("stays silent about the kit when it already holds every bundled gate", () => {
    const cwd = freshProject();
    const result = run("upgrade --dry-run", cwd);
    expect(result.stderr).not.toContain("quality/kit.md is yours");
    expect(result.stderr).not.toContain("not in your kit");
  });

  it("stays silent about the kit when the project has none", () => {
    const cwd = freshProject();
    rmSync(lytos(cwd, "quality/kit.md"));
    const result = run("upgrade --dry-run", cwd);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).not.toContain("not in your kit");
    expect(existsSync(lytos(cwd, "quality/kit.md"))).toBe(false);
  });

  it("never touches the register, the config, the manifest or the memory", () => {
    fixture = createEmptyFixture();
    expect(run("init --yes --tool none --design claude-design", fixture.cwd).exitCode).toBe(0);
    const cwd = fixture.cwd;
    const mine: Record<string, string> = {
      "design/registry.md": "# Register\n\n- v12, https://example.invalid/a\n",
      "config.yml": "language: fr\nprofile: lead\ndesign: claude-design\n",
      "manifest.md": "# My manifest\n",
      "memory/MEMORY.md": "# My memory\n",
    };
    for (const [path, content] of Object.entries(mine)) writeFileSync(lytos(cwd, path), content);

    expect(run("upgrade --force", cwd).exitCode).toBe(0);
    for (const [path, content] of Object.entries(mine)) {
      expect(readFileSync(lytos(cwd, path), "utf-8"), path).toBe(content);
    }
  });

  it("treats rules/team-and-loop.md like the other rules: a missing one is added, a changed one is replaced only with --force", () => {
    const cwd = freshProject();
    const path = lytos(cwd, "rules/team-and-loop.md");
    unlinkSync(path);
    expect(run("upgrade --force", cwd).stderr).toContain("rules/team-and-loop.md");
    expect(readFileSync(path, "utf-8")).toBe(bundled("rules/team-and-loop.md"));

    writeFileSync(path, "changed\n");
    expect(run("upgrade --dry-run", cwd).stderr).toContain("rules/team-and-loop.md");
    expect(readFileSync(path, "utf-8")).toBe("changed\n");
    run("upgrade --force", cwd);
    expect(readFileSync(path, "utf-8")).toBe(bundled("rules/team-and-loop.md"));
  });

  it("delivers the reference loop skill like the other task skills: added when missing, replaced only with --force (ISS-0168)", () => {
    const cwd = freshProject();
    const path = lytos(cwd, "skills/reference-loop/SKILL.md");

    // A project initialised before the skill existed gets it without being asked.
    rmSync(join(cwd, ".lytos", "skills", "reference-loop"), { recursive: true });
    expect(run("upgrade --dry-run", cwd).stderr).toContain("skills/reference-loop/SKILL.md");
    expect(existsSync(path)).toBe(false);
    const added = run("upgrade", cwd);
    expect(added.exitCode).toBe(0);
    expect(added.stderr).toContain("skills/reference-loop/SKILL.md");
    expect(readFileSync(path, "utf-8")).toBe(bundled("skills/reference-loop/SKILL.md"));

    // A project that adapted it keeps its copy unless it forces.
    writeFileSync(path, "my own loop\n");
    expect(run("upgrade --dry-run", cwd).stderr).toContain("(differs)");
    expect(readFileSync(path, "utf-8")).toBe("my own loop\n");
    run("upgrade --force", cwd);
    expect(readFileSync(path, "utf-8")).toBe(bundled("skills/reference-loop/SKILL.md"));
  });
});

describe("lyt upgrade — with no terminal, and through symbolic links (ISS-0159)", () => {
  const METHOD = resolve(__dirname, "../../method");
  const lytos = (cwd: string, p: string): string => join(cwd, ".lytos", p);
  const bundled = (p: string): string => readFileSync(join(METHOD, p), "utf-8");

  /** `lyt upgrade < /dev/null`: stdin is closed, so nobody can answer a question. */
  function runClosed(args: string, cwd: string, env: Record<string, string> = {}) {
    const result = spawnSync("node", [CLI, ...args.split(" ").filter(Boolean)], {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...env },
      timeout: 20000,
    });
    return { stdout: result.stdout || "", stderr: result.stderr || "", exitCode: result.status ?? 0 };
  }

  function freshProject(): string {
    fixture = createEmptyFixture();
    expect(run("init --yes --tool none", fixture.cwd).exitCode).toBe(0);
    return fixture.cwd;
  }

  it("delivers the library, answers every replacement question no, says so, and exits 0", () => {
    const cwd = freshProject();
    rmSync(lytos(cwd, "quality/checklists"), { recursive: true, force: true });
    const mine = "my own task template\n";
    writeFileSync(lytos(cwd, "issue-board/templates/issue-task.md"), mine);
    writeFileSync(lytos(cwd, "skills/session-start.md"), "my own session start\n");

    const r = runClosed("upgrade", cwd);
    expect(r.exitCode).toBe(0);

    // The library was delivered, and before any question was asked.
    expect(readFileSync(lytos(cwd, "quality/checklists/a11y.md"), "utf-8")).toBe(bundled("quality/checklists/a11y.md"));
    expect(r.stderr).toContain("quality/checklists/a11y.md");
    expect(r.stderr.indexOf("quality/checklists/a11y.md")).toBeLessThan(r.stderr.indexOf("issue-board/templates/issue-task.md"));

    // Each replacement question is answered no, out loud, with the way to force it.
    expect(readFileSync(lytos(cwd, "issue-board/templates/issue-task.md"), "utf-8")).toBe(mine);
    expect(readFileSync(lytos(cwd, "skills/session-start.md"), "utf-8")).toBe("my own session start\n");
    for (const file of ["issue-board/templates/issue-task.md", "skills/session-start.md"]) {
      const line = r.stderr.split("\n").find((l) => l.includes(file) && /kept/.test(l)) ?? "";
      expect(line, file).toMatch(/no terminal/);
      expect(line, file).toContain("--force");
    }

    // The recap is printed: the run did not stop at the first question.
    expect(r.stderr).toContain("Method files upgraded");
    expect(r.stderr).toMatch(/\d+ added/);
    expect(r.stderr).toMatch(/2 skipped/);
  });

  it("never asks in CI either, and --force still replaces", () => {
    const cwd = freshProject();
    writeFileSync(lytos(cwd, "issue-board/templates/issue-task.md"), "mine\n");
    const ci = runClosed("upgrade", cwd, { CI: "true" });
    expect(ci.stderr).toContain("kept");
    expect(readFileSync(lytos(cwd, "issue-board/templates/issue-task.md"), "utf-8")).toBe("mine\n");

    const forced = runClosed("upgrade --force", cwd, { CI: "true" });
    expect(forced.exitCode).toBe(0);
    expect(readFileSync(lytos(cwd, "issue-board/templates/issue-task.md"), "utf-8")).toBe(bundled("issue-board/templates/issue-task.md"));
  });

  it("a dry run with no terminal is unchanged", () => {
    const cwd = freshProject();
    writeFileSync(lytos(cwd, "issue-board/templates/issue-task.md"), "mine\n");
    const r = runClosed("upgrade --dry-run", cwd);
    expect(r.exitCode).toBe(0);
    expect(r.stderr).toContain("(differs)");
  });

  describe("never writes through a symbolic link", () => {
    it("skips a dangling link, a linked directory and a link standing in for a method file — and creates nothing outside .lytos/", () => {
      const cwd = freshProject();
      const outside = join(cwd, "outside");
      mkdirSync(outside);
      // 1. a dangling link where a library file would go: existsSync says "absent", a write would create the target
      unlinkSync(lytos(cwd, "quality/rubrics/ux.md"));
      symlinkSync(join(outside, "ux-target.md"), lytos(cwd, "quality/rubrics/ux.md"));
      // 2. a whole directory replaced by a link
      rmSync(lytos(cwd, "quality/checklists"), { recursive: true, force: true });
      symlinkSync(outside, lytos(cwd, "quality/checklists"));
      // 3. an upgradeable method file that is a dangling link
      unlinkSync(lytos(cwd, "rules/team-and-loop.md"));
      symlinkSync(join(outside, "team-target.md"), lytos(cwd, "rules/team-and-loop.md"));

      const r = run("upgrade --force", cwd);
      expect(r.exitCode).toBe(0);
      expect(readdirSync(outside)).toEqual([]);
      for (const where of ["quality/rubrics/ux.md", "quality/checklists", "rules/team-and-loop.md"]) {
        const line = r.stderr.split("\n").find((l) => l.includes(where) && /symbolic link/.test(l)) ?? "";
        expect(line, where).toMatch(/not written/);
      }
    });

    it("does not overwrite the real file behind a link, even with --force", () => {
      const cwd = freshProject();
      const target = join(cwd, "outside-real.md");
      writeFileSync(target, "somebody else's file\n");
      rmSync(lytos(cwd, "rules/default-rules.md"));
      symlinkSync(target, lytos(cwd, "rules/default-rules.md"));
      const r = run("upgrade --force", cwd);
      expect(r.exitCode).toBe(0);
      expect(readFileSync(target, "utf-8")).toBe("somebody else's file\n");
      expect(r.stderr).toMatch(/rules\/default-rules\.md not written/);
    });
  });
});
