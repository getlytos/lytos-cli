/**
 * Integration tests for `lytos init`.
 *
 * Each test runs the actual CLI binary in a temp directory,
 * then checks the file system and output.
 */

import { describe, it, expect, afterEach } from "vitest";
import { execSync } from "child_process";
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "fs";
import { resolve, join } from "path";
import {
  createEmptyFixture,
  createNodeProjectFixture,
  type Fixture,
} from "../helpers/fixtures.js";
import { QUALITY_LIBRARY_FILES } from "../../src/lib/method-files.js";
import { leaksIn } from "../helpers/shipped-content.js";

const CLI = resolve(__dirname, "../../dist/cli.js");

function run(args: string, cwd: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`node ${CLI} ${args}`, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { stdout, stderr: "", exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: e.stdout || "",
      stderr: e.stderr || "",
      exitCode: e.status || 1,
    };
  }
}

let fixture: Fixture;

afterEach(() => {
  if (fixture) fixture.cleanup();
});

describe("lytos init", () => {
  it("creates .lytos/ directory with essential files", () => {
    fixture = createEmptyFixture();
    const result = run('init --name "Test Project" --tool none --yes', fixture.cwd);

    // Should succeed
    expect(result.exitCode).toBe(0);

    // Essential directories exist
    expect(existsSync(join(fixture.cwd, ".lytos"))).toBe(true);
    expect(existsSync(join(fixture.cwd, ".lytos", "memory", "cortex"))).toBe(true);
    expect(existsSync(join(fixture.cwd, ".lytos", "issue-board", "3-in-progress"))).toBe(true);
    expect(existsSync(join(fixture.cwd, ".lytos", "skills"))).toBe(true);
    expect(existsSync(join(fixture.cwd, ".lytos", "rules"))).toBe(true);

    // Essential files exist
    expect(existsSync(join(fixture.cwd, ".lytos", "manifest.md"))).toBe(true);
    expect(existsSync(join(fixture.cwd, ".lytos", "memory", "MEMORY.md"))).toBe(true);
    expect(existsSync(join(fixture.cwd, ".lytos", "issue-board", "BOARD.md"))).toBe(true);
  });

  it("ships the quality library the kit points at — rubrics and checklists (ISS-0155)", () => {
    fixture = createEmptyFixture();
    expect(run('init --name "Test Project" --tool none --yes', fixture.cwd).exitCode).toBe(0);

    for (const path of QUALITY_LIBRARY_FILES) {
      const written = join(fixture.cwd, ".lytos", path);
      expect(existsSync(written), path).toBe(true);
      expect(readFileSync(written, "utf-8"), path).toBe(
        readFileSync(resolve(__dirname, "../../method", path), "utf-8")
      );
    }

    // The kit that points at them is the shipped one, and its pointers resolve in the project.
    const kit = readFileSync(join(fixture.cwd, ".lytos", "quality", "kit.md"), "utf-8");
    for (const m of kit.matchAll(/\|\s*(?:rubric|checklist):([a-z0-9-]+)\s*\|/g)) {
      const found = [`quality/rubrics/${m[1]}.md`, `quality/checklists/${m[1]}.md`].some((p) =>
        existsSync(join(fixture.cwd, ".lytos", p))
      );
      expect(found, m[1]).toBe(true);
    }
  });

  it("ships the team-and-loop briefing next to the default rules (ISS-0157)", () => {
    fixture = createEmptyFixture();
    expect(run('init --name "Test Project" --tool none --yes', fixture.cwd).exitCode).toBe(0);
    const written = join(fixture.cwd, ".lytos", "rules", "team-and-loop.md");
    expect(existsSync(written)).toBe(true);
    expect(readFileSync(written, "utf-8")).toBe(
      readFileSync(resolve(__dirname, "../../method/rules/team-and-loop.md"), "utf-8")
    );
  });

  it("ships the reference loop skill next to the other task skills (ISS-0168)", () => {
    fixture = createEmptyFixture();
    expect(run('init --name "Test Project" --tool none --yes', fixture.cwd).exitCode).toBe(0);
    const written = join(fixture.cwd, ".lytos", "skills", "reference-loop", "SKILL.md");
    expect(existsSync(written)).toBe(true);
    expect(readFileSync(written, "utf-8")).toBe(
      readFileSync(resolve(__dirname, "../../method/skills/reference-loop/SKILL.md"), "utf-8")
    );
  });

  it("writes every skill file the method ships, so a skill added to method/skills cannot be left out (ISS-0168)", () => {
    fixture = createEmptyFixture();
    expect(run('init --name "Test Project" --tool none --yes', fixture.cwd).exitCode).toBe(0);
    const methodSkills = resolve(__dirname, "../../method/skills");
    const shipped = readdirSync(methodSkills, { recursive: true, withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => join(e.parentPath, e.name).slice(methodSkills.length + 1));
    expect(shipped.length).toBeGreaterThanOrEqual(10);
    for (const path of shipped) {
      const written = join(fixture.cwd, ".lytos", "skills", path);
      expect(existsSync(written), path).toBe(true);
      expect(readFileSync(written, "utf-8"), path).toBe(readFileSync(join(methodSkills, path), "utf-8"));
    }
  });

  it("installs the lytos-issue merge driver in a git repo (ISS-0093)", () => {
    fixture = createEmptyFixture();
    const { execSync } = require("child_process");
    execSync("git init -b main", { cwd: fixture.cwd, stdio: "pipe" });

    const result = run('init --name "Test Project" --tool none --yes', fixture.cwd);
    expect(result.exitCode).toBe(0);

    // .gitattributes maps issue fiches to the driver
    const attrs = readFileSync(join(fixture.cwd, ".gitattributes"), "utf-8");
    expect(attrs).toContain(".lytos/issue-board/**/*.md merge=lytos-issue");

    // git config declares the driver command
    const driver = execSync("git config --get merge.lytos-issue.driver", {
      cwd: fixture.cwd,
      encoding: "utf-8",
    }).trim();
    expect(driver).toBe("npx lyt _merge-issue %O %A %B");
  });

  it("appends the merge driver line to an existing .gitattributes without clobbering it (ISS-0093)", () => {
    fixture = createEmptyFixture();
    const { execSync } = require("child_process");
    execSync("git init -b main", { cwd: fixture.cwd, stdio: "pipe" });
    writeFileSync(join(fixture.cwd, ".gitattributes"), "*.png binary\n");

    const result = run('init --name "Test Project" --tool none --yes', fixture.cwd);
    expect(result.exitCode).toBe(0);

    const attrs = readFileSync(join(fixture.cwd, ".gitattributes"), "utf-8");
    expect(attrs).toContain("*.png binary");
    expect(attrs).toContain(".lytos/issue-board/**/*.md merge=lytos-issue");
  });

  it("generated rules declare the CLI as the interface, and session-start opens with npx lyt show (ISS-0097)", () => {
    fixture = createEmptyFixture();
    const result = run('init --name "Test Project" --tool none --yes', fixture.cwd);
    expect(result.exitCode).toBe(0);

    const rules = readFileSync(join(fixture.cwd, ".lytos", "rules", "default-rules.md"), "utf-8");
    // The dedicated section, with the verb table invoked via npx
    expect(rules).toContain("The CLI Is the Interface");
    expect(rules).toContain("npx lyt move");
    expect(rules).toContain("npx lyt show");
    // The rule in the negative
    expect(rules).toMatch(/never edit a `status:` field/i);
    // Issue locality: an issue lives in the repo of the code that closes it
    expect(rules).toContain("Issues live where they will be closed");

    const sessionStart = readFileSync(join(fixture.cwd, ".lytos", "skills", "session-start.md"), "utf-8");
    // The skill opens with the real state in one call
    const step0 = sessionStart.indexOf("npx lyt show");
    const step1 = sessionStart.indexOf("Load global context");
    expect(step0).toBeGreaterThan(-1);
    expect(step0).toBeLessThan(step1);
    // Task completion goes through the atomic verb, not a manual git mv
    expect(sessionStart).toContain("npx lyt move ISS-XXXX 4-review");
    expect(sessionStart).not.toContain("git mv .lytos/issue-board/3-in-progress");
  });

  it("pre-fills manifest with project name", () => {
    fixture = createEmptyFixture();
    run('init --name "My Awesome API" --tool none --yes', fixture.cwd);

    const manifest = readFileSync(
      join(fixture.cwd, ".lytos", "manifest.md"),
      "utf-8"
    );

    expect(manifest).toContain("# Manifest — My Awesome API");
    expect(manifest).toContain("| Name | My Awesome API |");
  });

  it("detects Node.js/TypeScript stack from package.json", () => {
    fixture = createNodeProjectFixture();
    run('init --name "Test" --tool none --yes', fixture.cwd);

    const manifest = readFileSync(
      join(fixture.cwd, ".lytos", "manifest.md"),
      "utf-8"
    );

    expect(manifest).toContain("TypeScript");
    expect(manifest).toContain("Next.js");
    expect(manifest).toContain("Vitest");
  });

  it("creates CLAUDE.md when --tool claude", () => {
    fixture = createEmptyFixture();
    run('init --name "Test" --tool claude --yes', fixture.cwd);

    expect(existsSync(join(fixture.cwd, "CLAUDE.md"))).toBe(true);

    const content = readFileSync(join(fixture.cwd, "CLAUDE.md"), "utf-8");
    expect(content).toContain("Lytos");
    expect(content).toContain("manifest.md");
  });

  it("creates .cursor/rules/lytos.mdc when --tool cursor (ISS-0050)", () => {
    fixture = createEmptyFixture();
    run('init --name "Test" --tool cursor --yes', fixture.cwd);

    const target = join(fixture.cwd, ".cursor/rules/lytos.mdc");
    expect(existsSync(target)).toBe(true);
    // Legacy flat file must not appear
    expect(existsSync(join(fixture.cwd, ".cursorrules"))).toBe(false);

    const content = readFileSync(target, "utf-8");
    // Valid YAML front-matter so Cursor picks the rule up
    expect(content).toMatch(/^---\n[\s\S]*?alwaysApply: true[\s\S]*?\n---/);
    expect(content).toContain("globs: [\"**/*\"]");
    // Body still references .lytos/
    expect(content).toContain("@.lytos/manifest.md");
  });

  it("creates AGENTS.md (uppercase) when --tool codex", () => {
    fixture = createEmptyFixture();
    run('init --name "Test" --tool codex --yes', fixture.cwd);

    // The Codex CLI reads AGENTS.md with uppercase letters. On case-sensitive
    // filesystems (Linux, CI) the exact casing is load-bearing — verify by
    // reading the directory listing, not via existsSync which is case-insensitive
    // on macOS and would pass either way.
    const entries = readdirSync(fixture.cwd);
    expect(entries).toContain("AGENTS.md");
    expect(entries).not.toContain("agents.md");
  });

  it("scaffolds .lytos/.gitignore that protects 6-private-notes/ (ISS-0049)", () => {
    fixture = createEmptyFixture();
    run('init --name "Test" --tool none --yes', fixture.cwd);

    const gitignorePath = join(fixture.cwd, ".lytos/.gitignore");
    expect(existsSync(gitignorePath)).toBe(true);
    const content = readFileSync(gitignorePath, "utf-8");
    expect(content).toContain("issue-board/6-private-notes/*");
    expect(content).toContain("!issue-board/6-private-notes/.gitkeep");

    // The folder itself exists with a .gitkeep so the ignore rule has a
    // real target and users can drop private notes in right away.
    expect(existsSync(join(fixture.cwd, ".lytos/issue-board/6-private-notes/.gitkeep"))).toBe(true);
  });

  it("scaffolds .lytos/.gitignore that excludes the derived BOARD.md (ISS-0080)", () => {
    fixture = createEmptyFixture();
    run('init --name "Test" --tool none --yes', fixture.cwd);

    const content = readFileSync(join(fixture.cwd, ".lytos/.gitignore"), "utf-8");
    // Relative to .lytos/ where this gitignore lives — not the repo-root path.
    expect(content).toContain("issue-board/BOARD.md");
  });

  it("scaffolds an issue-board README orienting GitHub visitors (ISS-0080)", () => {
    fixture = createEmptyFixture();
    run('init --name "Test" --tool none --yes', fixture.cwd);

    const readmePath = join(fixture.cwd, ".lytos/issue-board/README.md");
    expect(existsSync(readmePath)).toBe(true);
    const content = readFileSync(readmePath, "utf-8");
    expect(content).toContain("derived artifact");
    expect(content).toContain("lyt board");
  });

  it("creates .github/copilot-instructions.md when --tool copilot", () => {
    fixture = createEmptyFixture();
    run('init --name "Test" --tool copilot --yes', fixture.cwd);

    const target = join(fixture.cwd, ".github/copilot-instructions.md");
    expect(existsSync(target)).toBe(true);
    const content = readFileSync(target, "utf-8");
    expect(content).toContain("Lytos");
    expect(content).toContain(".lytos/manifest.md");
    expect(content).toContain("session-start.md");
  });

  it("creates GEMINI.md (uppercase) when --tool gemini", () => {
    fixture = createEmptyFixture();
    run('init --name "Test" --tool gemini --yes', fixture.cwd);

    const entries = readdirSync(fixture.cwd);
    expect(entries).toContain("GEMINI.md");
    expect(entries).not.toContain("gemini.md");
    const content = readFileSync(join(fixture.cwd, "GEMINI.md"), "utf-8");
    expect(content).toContain("Lytos");
    expect(content).toContain("@.lytos/manifest.md");
  });

  it("creates .windsurfrules when --tool windsurf", () => {
    fixture = createEmptyFixture();
    run('init --name "Test" --tool windsurf --yes', fixture.cwd);

    const target = join(fixture.cwd, ".windsurfrules");
    expect(existsSync(target)).toBe(true);
    const content = readFileSync(target, "utf-8");
    expect(content).toContain("Lytos");
    expect(content).toContain(".lytos/manifest.md");
    expect(content).toContain("session-start.md");
  });

  it("preserves an existing customized CLAUDE.md on --force by default (ISS-0054)", () => {
    fixture = createEmptyFixture();
    run('init --name "Test" --tool claude --yes', fixture.cwd);

    const bridgePath = join(fixture.cwd, "CLAUDE.md");
    writeFileSync(bridgePath, "# Custom CLAUDE bridge\n\nProject-specific instructions.", "utf-8");

    const result = run('init --name "Test v2" --tool claude --yes --force', fixture.cwd);

    expect(result.exitCode).toBe(0);
    const content = readFileSync(bridgePath, "utf-8");
    expect(content).toContain("Project-specific instructions.");
    expect(content).not.toContain("This project uses **Lytos**");
  });

  it("overwrites an existing customized CLAUDE.md only with --overwrite-bridges (ISS-0054)", () => {
    fixture = createEmptyFixture();
    run('init --name "Test" --tool claude --yes', fixture.cwd);

    const bridgePath = join(fixture.cwd, "CLAUDE.md");
    writeFileSync(bridgePath, "# Custom CLAUDE bridge\n\nProject-specific instructions.", "utf-8");

    const result = run(
      'init --name "Test v2" --tool claude --yes --force --overwrite-bridges',
      fixture.cwd
    );

    expect(result.exitCode).toBe(0);
    const content = readFileSync(bridgePath, "utf-8");
    expect(content).toContain("This project uses **Lytos**");
    expect(content).not.toContain("Project-specific instructions.");
  });

  it("preserves an existing nested bridge file on --force by default (ISS-0054)", () => {
    fixture = createEmptyFixture();
    run('init --name "Test" --tool copilot --yes', fixture.cwd);

    const bridgePath = join(fixture.cwd, ".github/copilot-instructions.md");
    writeFileSync(bridgePath, "# Custom Copilot bridge\n\nRepo-specific instructions.", "utf-8");

    const result = run('init --name "Test v2" --tool copilot --yes --force', fixture.cwd);

    expect(result.exitCode).toBe(0);
    const content = readFileSync(bridgePath, "utf-8");
    expect(content).toContain("Repo-specific instructions.");
    expect(content).not.toContain("This project uses **Lytos**");
  });

  it("does not create tool config when --tool none", () => {
    fixture = createEmptyFixture();
    run('init --name "Test" --tool none --yes', fixture.cwd);

    expect(existsSync(join(fixture.cwd, "CLAUDE.md"))).toBe(false);
    expect(existsSync(join(fixture.cwd, ".cursorrules"))).toBe(false);
    expect(existsSync(join(fixture.cwd, ".cursor/rules/lytos.mdc"))).toBe(false);
    expect(existsSync(join(fixture.cwd, "GEMINI.md"))).toBe(false);
    expect(existsSync(join(fixture.cwd, ".windsurfrules"))).toBe(false);
    expect(existsSync(join(fixture.cwd, ".github/copilot-instructions.md"))).toBe(false);
    const entries = readdirSync(fixture.cwd);
    expect(entries).not.toContain("AGENTS.md");
    expect(entries).not.toContain("agents.md");
  });

  it("scaffolds multiple bridges when --tool is a CSV (ISS-0053)", () => {
    fixture = createEmptyFixture();
    const result = run(
      'init --name "Test" --tool claude,cursor,copilot --yes',
      fixture.cwd
    );

    expect(result.exitCode).toBe(0);
    expect(existsSync(join(fixture.cwd, "CLAUDE.md"))).toBe(true);
    expect(existsSync(join(fixture.cwd, ".cursor", "rules", "lytos.mdc"))).toBe(true);
    expect(existsSync(join(fixture.cwd, ".github", "copilot-instructions.md"))).toBe(true);
    // Unrequested tools stay absent
    expect(existsSync(join(fixture.cwd, "AGENTS.md"))).toBe(false);
    expect(existsSync(join(fixture.cwd, "GEMINI.md"))).toBe(false);
    expect(existsSync(join(fixture.cwd, ".windsurfrules"))).toBe(false);
  });

  it("scaffolds every bridge when --all-tools (ISS-0053)", () => {
    fixture = createEmptyFixture();
    const result = run('init --name "Test" --all-tools --yes', fixture.cwd);

    expect(result.exitCode).toBe(0);
    expect(existsSync(join(fixture.cwd, "CLAUDE.md"))).toBe(true);
    expect(existsSync(join(fixture.cwd, ".cursor", "rules", "lytos.mdc"))).toBe(true);
    expect(existsSync(join(fixture.cwd, "AGENTS.md"))).toBe(true);
    expect(existsSync(join(fixture.cwd, ".github", "copilot-instructions.md"))).toBe(true);
    expect(existsSync(join(fixture.cwd, "GEMINI.md"))).toBe(true);
    expect(existsSync(join(fixture.cwd, ".windsurfrules"))).toBe(true);
  });

  it("tolerates whitespace and dedupes in --tool CSV (ISS-0053)", () => {
    fixture = createEmptyFixture();
    const result = run(
      'init --name "Test" --tool " claude , cursor , claude " --yes',
      fixture.cwd
    );

    expect(result.exitCode).toBe(0);
    expect(existsSync(join(fixture.cwd, "CLAUDE.md"))).toBe(true);
    expect(existsSync(join(fixture.cwd, ".cursor", "rules", "lytos.mdc"))).toBe(true);
  });

  it("exits 2 when --tool contains an unknown value (ISS-0053)", () => {
    fixture = createEmptyFixture();
    const result = run(
      'init --name "Test" --tool claude,not-a-tool --yes',
      fixture.cwd
    );

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("Unknown --tool");
    // No partial scaffold — .lytos/ should not exist
    expect(existsSync(join(fixture.cwd, ".lytos"))).toBe(false);
  });

  it("treats 'none' in a mixed CSV as a no-op and still writes the others (ISS-0053)", () => {
    fixture = createEmptyFixture();
    const result = run(
      'init --name "Test" --tool none,claude --yes',
      fixture.cwd
    );

    expect(result.exitCode).toBe(0);
    expect(existsSync(join(fixture.cwd, "CLAUDE.md"))).toBe(true);
  });

  it("fails if .lytos/ already exists", () => {
    fixture = createEmptyFixture();
    // First init
    run('init --name "Test" --tool none --yes', fixture.cwd);
    // Second init should fail
    const result = run('init --name "Test" --tool none --yes', fixture.cwd);

    expect(result.exitCode).toBe(2);
  });

  it("succeeds with --force when .lytos/ already exists", () => {
    fixture = createEmptyFixture();
    run('init --name "Test" --tool none --yes', fixture.cwd);
    const result = run('init --name "Test v2" --tool none --yes --force', fixture.cwd);

    expect(result.exitCode).toBe(0);

    const manifest = readFileSync(
      join(fixture.cwd, ".lytos", "manifest.md"),
      "utf-8"
    );
    expect(manifest).toContain("Test v2");
  });

  it("generates English manifest with --lang en", () => {
    fixture = createEmptyFixture();
    run('init --name "Test" --tool none --lang en --yes', fixture.cwd);

    const manifest = readFileSync(
      join(fixture.cwd, ".lytos", "manifest.md"),
      "utf-8"
    );

    // English section headers and stack labels
    expect(manifest).toContain("Why this project exists");
    expect(manifest).toContain("Tech stack");
    expect(manifest).toContain("| Language |");
    expect(manifest).toContain("| Framework |");
    expect(manifest).toContain("| Database |");
    expect(manifest).toContain("| Tests |");
    expect(manifest).not.toContain("Pourquoi ce projet existe");
  });

  it("generates French manifest with --lang fr (including stack labels)", () => {
    fixture = createEmptyFixture();
    run('init --name "Test" --tool none --lang fr --yes', fixture.cwd);

    const manifest = readFileSync(
      join(fixture.cwd, ".lytos", "manifest.md"),
      "utf-8"
    );

    // French section headers
    expect(manifest).toContain("Pourquoi ce projet existe");
    expect(manifest).toContain("Stack technique");
    // French stack row labels (the bug this test pins)
    expect(manifest).toContain("| Langage |");
    expect(manifest).toContain("| Base de données |");
    // English labels must not leak into French manifest
    expect(manifest).not.toContain("| Language |");
    expect(manifest).not.toContain("| Database |");
    expect(manifest).not.toContain("Why this project exists");
  });

  it("generates French memory with --lang fr", () => {
    fixture = createEmptyFixture();
    run('init --name "Test" --tool none --lang fr --yes', fixture.cwd);

    const memory = readFileSync(
      join(fixture.cwd, ".lytos", "memory", "MEMORY.md"),
      "utf-8"
    );
    expect(memory).toContain("Mémoire");
  });

  it("creates cortex files with example content", () => {
    fixture = createEmptyFixture();
    run('init --name "Test" --tool none --yes', fixture.cwd);

    const arch = readFileSync(
      join(fixture.cwd, ".lytos", "memory", "cortex", "architecture.md"),
      "utf-8"
    );
    expect(arch).toContain("Architecture");
    expect(arch).toContain("Example to adapt or remove");
  });

  it("detects Python stack from requirements.txt", () => {
    fixture = createEmptyFixture();
    writeFileSync(
      join(fixture.cwd, "requirements.txt"),
      "fastapi==0.110.0\nsqlalchemy==2.0.0\npytest==8.0.0\n"
    );
    run('init --name "Test" --tool none --yes', fixture.cwd);

    const manifest = readFileSync(
      join(fixture.cwd, ".lytos", "manifest.md"),
      "utf-8"
    );
    expect(manifest).toContain("Python");
    expect(manifest).toContain("FastAPI");
    expect(manifest).toContain("Pytest");
  });
});

describe("lytos init — the optional design answer (ISS-0158)", () => {
  const BASE = '--name "Test Project" --tool none --lang en --profile developer';
  const config = (cwd: string): string => readFileSync(join(cwd, ".lytos", "config.yml"), "utf-8");
  const register = (cwd: string): string => join(cwd, ".lytos", "design", "registry.md");

  /**
   * Run the binary the way a pipe or CI does — stdin is not a terminal, nothing to
   * answer with — and keep stderr even on success (the plain helper drops it).
   */
  function runNoTty(args: string, cwd: string, env: Record<string, string> = {}) {
    const { spawnSync } = require("child_process");
    const argv = (args.match(/(?:[^\s"]+|"[^"]*")+/g) ?? []).map((a: string) => a.replace(/^"|"$/g, ""));
    const result = spawnSync("node", [CLI, ...argv], {
      cwd,
      encoding: "utf-8",
      input: "",
      env: { ...process.env, ...env },
      timeout: 20000,
    });
    return { stdout: result.stdout || "", stderr: result.stderr || "", exitCode: result.status ?? 0 };
  }

  it("--design claude-design records the answer and creates the register from the generic template", () => {
    fixture = createEmptyFixture();
    const r = run(`init ${BASE} --design claude-design --yes`, fixture.cwd);
    expect(r.exitCode).toBe(0);
    expect(config(fixture.cwd)).toContain("design: claude-design");
    expect(existsSync(register(fixture.cwd))).toBe(true);
    expect(readFileSync(register(fixture.cwd), "utf-8")).toBe(
      readFileSync(resolve(__dirname, "../../method/design/registry.md"), "utf-8")
    );
  });

  it.each(["none", "other"])("--design %s records the answer and generates nothing", (choice) => {
    fixture = createEmptyFixture();
    expect(run(`init ${BASE} --design ${choice} --yes`, fixture.cwd).exitCode).toBe(0);
    expect(config(fixture.cwd)).toContain(`design: ${choice}`);
    expect(existsSync(join(fixture.cwd, ".lytos", "design"))).toBe(false);
  });

  it("defaults to none under --yes, with nothing generated", () => {
    fixture = createEmptyFixture();
    expect(run(`init ${BASE} --yes`, fixture.cwd).exitCode).toBe(0);
    expect(config(fixture.cwd)).toContain("design: none");
    expect(existsSync(join(fixture.cwd, ".lytos", "design"))).toBe(false);
  });

  it("asks nothing and answers none with no terminal, even without --yes", () => {
    fixture = createEmptyFixture();
    const r = runNoTty(`init ${BASE}`, fixture.cwd);
    expect(r.exitCode).toBe(0);
    expect(r.stderr).not.toMatch(/Claude Design/i);
    expect(config(fixture.cwd)).toContain("design: none");
    expect(existsSync(join(fixture.cwd, ".lytos", "design"))).toBe(false);
  });

  it("asks nothing in CI", () => {
    fixture = createEmptyFixture();
    const r = runNoTty(`init ${BASE}`, fixture.cwd, { CI: "true" });
    expect(r.exitCode).toBe(0);
    expect(r.stderr).not.toMatch(/Claude Design/i);
    expect(config(fixture.cwd)).toContain("design: none");
  });

  it("still honours --design with no terminal", () => {
    fixture = createEmptyFixture();
    expect(runNoTty(`init ${BASE} --design claude-design`, fixture.cwd, { CI: "true" }).exitCode).toBe(0);
    expect(existsSync(register(fixture.cwd))).toBe(true);
  });

  it("exits 2 on an unknown value, naming the valid ones, and creates nothing", () => {
    fixture = createEmptyFixture();
    const r = run(`init ${BASE} --design figma --yes`, fixture.cwd);
    expect(r.exitCode).toBe(2);
    expect(r.stderr).toContain('Unknown --design "figma"');
    expect(r.stderr).toContain("claude-design, other, none");
    expect(existsSync(join(fixture.cwd, ".lytos"))).toBe(false);
  });

  it("refuses a bad --design before asking or detecting anything", () => {
    fixture = createEmptyFixture();
    const r = runNoTty("init --design figma", fixture.cwd);
    expect(r.exitCode).toBe(2);
    expect(r.stderr).toContain('Unknown --design "figma"');
    expect(r.stderr).not.toContain("Detecting project stack");
    expect(existsSync(join(fixture.cwd, ".lytos"))).toBe(false);
  });

  it("--dry-run writes nothing", () => {
    fixture = createEmptyFixture();
    expect(run(`init ${BASE} --design claude-design --dry-run --yes`, fixture.cwd).exitCode).toBe(0);
    expect(existsSync(join(fixture.cwd, ".lytos", "config.yml"))).toBe(false);
    expect(existsSync(register(fixture.cwd))).toBe(false);
  });

  it("lists --design in --help", () => {
    fixture = createEmptyFixture();
    const r = run("init --help", fixture.cwd);
    expect(r.stdout).toContain("--design <design>");
    expect(r.stdout).toContain("lyt init --design claude-design");
  });

  describe("is never a brake", () => {
    function project(design: string): string {
      const f = createEmptyFixture();
      expect(run(`init ${BASE} --design ${design} --yes`, f.cwd).exitCode).toBe(0);
      return f.cwd;
    }

    it("doctor, lint and gates say exactly the same with claude-design as with none", () => {
      const none = project("none");
      const claude = project("claude-design");
      try {
        // doctor's `filesChecked` counts the register itself (one more markdown file);
        // what must not move is what it FINDS.
        const findings = (cwd: string) => {
          const d = JSON.parse(run("doctor --json", cwd).stdout);
          return { findings: d.findings, errors: d.errors, warnings: d.warnings, infos: d.infos, score: d.score };
        };
        expect(findings(claude)).toEqual(findings(none));
        expect(JSON.parse(run("lint --json", claude).stdout)).toEqual(JSON.parse(run("lint --json", none).stdout));
        // `gates` prints to stderr, which the plain helper drops on success.
        const matrix = (cwd: string) => runNoTty("gates", cwd).stderr;
        expect(matrix(claude)).not.toBe("");
        expect(matrix(claude)).toBe(matrix(none));
        // ...and neither doctor nor lint mentions the design answer at all.
        for (const cwd of [none, claude]) {
          for (const args of ["doctor --json", "lint --json"]) {
            expect(run(args, cwd).stdout, args).not.toMatch(/design/i);
          }
        }
      } finally {
        rmSync(none, { recursive: true, force: true });
        rmSync(claude, { recursive: true, force: true });
        fixture = createEmptyFixture();
      }
    });

    it("never touches an existing register: init --force keeps it, whatever the answer", () => {
      fixture = createEmptyFixture();
      expect(run(`init ${BASE} --design claude-design --yes`, fixture.cwd).exitCode).toBe(0);
      const mine = "# My register\n\n- https://example.invalid/artifact — v12\n";
      writeFileSync(register(fixture.cwd), mine);

      // A scripted re-init with no answer: the register is untouched.
      let r = run(`init ${BASE} --force --yes`, fixture.cwd);
      expect(r.exitCode).toBe(0);
      expect(readFileSync(register(fixture.cwd), "utf-8")).toBe(mine);
      expect(config(fixture.cwd)).toMatch(/^design: (none|claude-design|other)$/m);

      // Asking for it again does not overwrite it either, and says so.
      r = runNoTty(`init ${BASE} --force --design claude-design --yes`, fixture.cwd);
      expect(readFileSync(register(fixture.cwd), "utf-8")).toBe(mine);
      expect(r.stderr).toContain("Kept existing");

      // An explicit "none" records the new answer and still deletes nothing.
      r = run(`init ${BASE} --force --design none --yes`, fixture.cwd);
      expect(config(fixture.cwd)).toContain("design: none");
      expect(readFileSync(register(fixture.cwd), "utf-8")).toBe(mine);
    });

    it("refuses to write the register through a symbolic link (dangling or not)", () => {
      fixture = createEmptyFixture();
      const { mkdirSync, symlinkSync } = require("fs");
      const outside = join(fixture.cwd, "outside-target.md");
      // A dangling link where the register would go: existsSync says "absent", a write would create the target.
      expect(run(`init ${BASE} --design none --yes`, fixture.cwd).exitCode).toBe(0);
      mkdirSync(join(fixture.cwd, ".lytos", "design"), { recursive: true });
      symlinkSync(outside, register(fixture.cwd));
      const r = runNoTty(`init ${BASE} --force --design claude-design --yes`, fixture.cwd);
      expect(r.exitCode).toBe(0);
      expect(r.stderr).toMatch(/not written.*symbolic link|symbolic link.*not written/);
      expect(existsSync(outside)).toBe(false);
    });

    it("a second init without --force is refused and changes nothing, as before", () => {
      fixture = createEmptyFixture();
      expect(run(`init ${BASE} --design claude-design --yes`, fixture.cwd).exitCode).toBe(0);
      const before = readFileSync(register(fixture.cwd), "utf-8");
      const r = run(`init ${BASE} --design none --yes`, fixture.cwd);
      expect(r.exitCode).toBe(2);
      expect(r.stderr).toContain("already exists");
      expect(config(fixture.cwd)).toContain("design: claude-design");
      expect(readFileSync(register(fixture.cwd), "utf-8")).toBe(before);
    });
  });

  describe("the register template is generic", () => {
    const template = readFileSync(resolve(__dirname, "../../method/design/registry.md"), "utf-8");

    it("carries the structure: links, nature, current version, versions and cards, rules", () => {
      for (const part of ["Link:", "Nature:", "Current version:", "| Version | Content | Cards |", "## Rules of this register"]) {
        expect(template).toContain(part);
      }
      // Four rules, as the project it was modeled on keeps them.
      expect(template.match(/^\d\. /gm)).toHaveLength(4);
    });

    it("holds no real link and no date, and nothing private", () => {
      expect(template).not.toMatch(/https?:\/\//);
      expect(template).not.toMatch(/claude\.ai\/artifact/);
      expect(template).not.toMatch(/20\d\d-\d\d-\d\d/);
      // Generic checks, plus the private terms a maintainer may provide locally; no names are kept here.
      expect(leaksIn(template)).toEqual([]);
    });
  });
});
