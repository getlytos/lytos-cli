/**
 * What the reviews of ISS-0191 found: files the system refuses, an imported
 * bridge, the advice for ignored pointers, and the description copy.
 */

import { describe, it, expect, afterEach } from "vitest";
import { execFileSync, spawnSync } from "child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { descriptionEntry } from "../../src/lib/skill-pointers.js";
import {
  addSkill,
  claudeSkills,
  cleanupProjects,
  emptyDir,
  pointer,
  project,
  read,
  run,
  source,
} from "../helpers/skill-project.js";

afterEach(cleanupProjects);

describe("a bad file stops one pointer, not the run (found in review)", () => {
  it.each([
    [
      "a SKILL.md that is a directory",
      (cwd: string) => mkdirSync(source(cwd, "weird"), { recursive: true }),
      /"weird": its SKILL\.md cannot be read/,
    ],
    [
      "a directory where a pointer goes",
      (cwd: string) => {
        rmSync(pointer(cwd, "testing"));
        mkdirSync(pointer(cwd, "testing"));
      },
      /lytos-testing\/SKILL\.md not written/,
    ],
    [
      "a file where .claude/skills goes",
      (cwd: string) => {
        rmSync(claudeSkills(cwd), { recursive: true });
        writeFileSync(claudeSkills(cwd), "mine\n");
      },
      /lytos-testing\/SKILL\.md not written/,
    ],
  ])("survives %s and says so", (_label, breakIt, message) => {
    const cwd = project();
    breakIt(cwd);
    writeFileSync(join(cwd, "AGENTS.md"), "Read .lytos/manifest.md.\n");

    const result = run("upgrade", cwd);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toMatch(message);
    // The run went on to its last steps.
    expect(result.stderr).toContain("no order to read the task skills");
    expect(result.stderr).not.toContain("    at ");
  });

  it("survives a directory named CLAUDE.md", () => {
    const cwd = project();
    rmSync(join(cwd, "CLAUDE.md"));
    mkdirSync(join(cwd, "CLAUDE.md"));

    const result = run("upgrade", cwd);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).not.toContain("    at ");
  });

  it("reads a SKILL.md that starts with a byte order mark", () => {
    const cwd = project();
    addSkill(
      cwd,
      "billing-rules",
      "name: billing-rules\ndescription: Use when touching invoices."
    );
    writeFileSync(
      source(cwd, "billing-rules"),
      `\uFEFF${read(source(cwd, "billing-rules"))}`
    );

    expect(run("upgrade", cwd).exitCode).toBe(0);
    expect(read(pointer(cwd, "billing-rules"))).toContain(
      "description: Use when touching invoices."
    );
  });
});

describe("a CLAUDE.md that imports the bridge is a Claude bridge (found in review)", () => {
  it.each([
    ["CLAUDE.md", "@AGENTS.md\n"],
    [".claude/CLAUDE.md", "Project notes, see @../AGENTS.md\n"],
  ])("follows an import from %s", (file, content) => {
    const cwd = project("codex");
    mkdirSync(join(cwd, ".claude"), { recursive: true });
    writeFileSync(join(cwd, file), content);

    expect(run("upgrade", cwd).exitCode).toBe(0);
    expect(existsSync(pointer(cwd, "testing"))).toBe(true);
  });

  it("does not follow an import into a file that is no Lytos bridge", () => {
    const cwd = project("none");
    writeFileSync(join(cwd, "NOTES.md"), "Use tabs.\n");
    writeFileSync(
      join(cwd, "CLAUDE.md"),
      "@NOTES.md\n@missing.md\nmail me@example.md\n"
    );

    expect(run("upgrade", cwd).exitCode).toBe(0);
    expect(existsSync(join(cwd, ".claude"))).toBe(false);
  });
});

describe("the advice for ignored pointers works as printed (found in review)", () => {
  /** The ignore lines the CLI printed, as a person would copy them. */
  const printedLines = (stderr: string): string[] =>
    stderr
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => /^!?\/?\.claude\//.test(l));

  const isIgnored = (cwd: string, path: string): boolean =>
    spawnSync("git", ["check-ignore", "-q", "--", path], { cwd }).status === 0;

  /** Personal files, at the project root and in a nested package. */
  const PERSONAL = [
    ".claude/settings.local.json",
    ".claude/skills/mine/SKILL.md",
    "pkg/.claude/settings.local.json",
    "pkg/.claude/skills/theirs/SKILL.md",
  ];

  it.each([
    [".claude/"],
    [".claude"],
    ["**/.claude/"],
    [".claude/*"],
    [".claude/**"],
  ])(
    "un-ignores the pointers, and nothing that was ignored besides, under the rule %s",
    (rule) => {
      const cwd = emptyDir();
      execFileSync("git", ["init", "-q"], { cwd });
      writeFileSync(join(cwd, ".gitignore"), `${rule}\n`);
      const lines = printedLines(run("init --yes --tool claude", cwd).stderr);
      expect(lines.length).toBeGreaterThan(0);
      const before = PERSONAL.filter((path) => isIgnored(cwd, path));

      writeFileSync(join(cwd, ".gitignore"), `${rule}\n${lines.join("\n")}\n`);

      expect(isIgnored(cwd, ".claude/skills/lytos-testing/SKILL.md")).toBe(
        false
      );
      expect(PERSONAL.filter((path) => isIgnored(cwd, path))).toEqual(before);
      expect(run("upgrade", cwd).stderr).not.toContain(
        "git ignores the pointers"
      );
    }
  );

  it("works for a project in a subfolder, from that folder's .gitignore", () => {
    const repo = emptyDir();
    execFileSync("git", ["init", "-q"], { cwd: repo });
    writeFileSync(join(repo, ".gitignore"), ".claude/\n");
    const app = join(repo, "app");
    mkdirSync(app);
    const lines = printedLines(run("init --yes --tool claude", app).stderr);

    writeFileSync(join(app, ".gitignore"), `${lines.join("\n")}\n`);

    expect(isIgnored(repo, "app/.claude/skills/lytos-testing/SKILL.md")).toBe(
      false
    );
    expect(isIgnored(repo, "app/.claude/settings.local.json")).toBe(true);
    expect(isIgnored(repo, ".claude/settings.local.json")).toBe(true);
    expect(isIgnored(repo, "app/sub/.claude/settings.local.json")).toBe(true);
  });
});

describe("descriptionEntry copies the description as written", () => {
  it.each([
    ["a quoted scalar", 'description: "Use when: invoicing."'],
    [
      "a block scalar",
      "description: >\n  Use when invoicing.\n\n  And when refunding.",
    ],
  ])("keeps %s", (_label, entry) => {
    expect(
      descriptionEntry(`---\nname: x\n${entry}\nlicense: MIT\n---\nbody`)
    ).toBe(entry);
  });

  it("reads a file with CRLF line endings", () => {
    expect(
      descriptionEntry("---\r\nname: x\r\ndescription: Yes.\r\n---\r\n")
    ).toBe("description: Yes.");
  });

  it.each([
    ["no frontmatter", "# Skill\n"],
    ["no description", "---\nname: x\n---\n"],
    ["an empty one", '---\ndescription: ""\n---\n'],
  ])("is null with %s", (_label, content) => {
    expect(descriptionEntry(content)).toBeNull();
  });
});
