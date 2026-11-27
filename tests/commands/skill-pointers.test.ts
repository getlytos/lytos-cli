/**
 * The skills in `.lytos/skills/` are read (ISS-0191, part A).
 *
 * Two layers. A floor for every tool: the bridges and `session-start.md` order
 * the explicit reading. A bridge for Claude Code, which does not scan
 * `.lytos/skills/`: `lyt init --tool claude` and `lyt upgrade` write one pointer
 * per task skill under `.claude/skills/lytos-<name>/`.
 */

import { describe, it, expect, afterEach } from "vitest";
import { execFileSync, spawnSync } from "child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "fs";
import { join, resolve } from "path";
import { createEmptyFixture, type Fixture } from "../helpers/fixtures.js";
import { descriptionEntry } from "../../src/lib/skill-pointers.js";
import {
  claudeTemplate,
  codexTemplate,
  copilotTemplate,
  cursorRulesTemplate,
  geminiTemplate,
  windsurfTemplate,
} from "../../src/lib/templates.js";

const ROOT = resolve(__dirname, "../..");
const CLI = join(ROOT, "dist/cli.js");
const METHOD = join(ROOT, "method");

function run(args: string, cwd: string): { stderr: string; exitCode: number } {
  const result = spawnSync("node", [CLI, ...args.split(" ").filter(Boolean)], {
    cwd,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 20000,
  });
  return { stderr: result.stderr || "", exitCode: result.status ?? 1 };
}

let fixtures: Fixture[] = [];

afterEach(() => {
  for (const fixture of fixtures) fixture.cleanup();
  fixtures = [];
});

function emptyDir(): string {
  const fixture = createEmptyFixture();
  fixtures.push(fixture);
  return fixture.cwd;
}

function project(tool = "claude"): string {
  const cwd = emptyDir();
  expect(run(`init --yes --tool ${tool}`, cwd).exitCode).toBe(0);
  return cwd;
}

const taskSkillsIn = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(dir, e.name, "SKILL.md")))
    .map((e) => e.name)
    .sort();

const claudeSkills = (cwd: string): string => join(cwd, ".claude", "skills");
const pointer = (cwd: string, name: string): string =>
  join(claudeSkills(cwd), `lytos-${name}`, "SKILL.md");
const source = (cwd: string, name: string): string =>
  join(cwd, ".lytos", "skills", name, "SKILL.md");
const read = (path: string): string => readFileSync(path, "utf-8");

function addSkill(cwd: string, name: string, frontmatter: string): void {
  mkdirSync(join(cwd, ".lytos", "skills", name), { recursive: true });
  writeFileSync(source(cwd, name), `---\n${frontmatter}\n---\n\n# ${name}\n`);
}

describe("lyt init --tool claude writes the pointer skills", () => {
  it("writes one per shipped task skill, reference-loop included, and no other", () => {
    const cwd = project();
    const shipped = taskSkillsIn(join(METHOD, "skills"));

    expect(shipped).toContain("reference-loop");
    expect(readdirSync(claudeSkills(cwd)).sort()).toEqual(
      shipped.map((name) => `lytos-${name}`)
    );
  });

  it("carries the source's description and sends the agent to the source", () => {
    const cwd = project();
    for (const name of taskSkillsIn(join(cwd, ".lytos", "skills"))) {
      const content = read(pointer(cwd, name));
      expect(descriptionEntry(content), name).toBe(
        descriptionEntry(read(source(cwd, name)))
      );
      expect(content).toContain(`\nname: lytos-${name}\n`);
      expect(content).toContain(`.lytos/skills/${name}/SKILL.md`);
      expect(content).toContain("Read that file now");
    }
  });

  it("covers a skill the project added", () => {
    const cwd = project();
    addSkill(cwd, "billing-rules", "name: billing-rules\ndescription: Use when touching invoices.");

    expect(run("init --yes --force --tool claude", cwd).exitCode).toBe(0);
    expect(read(pointer(cwd, "billing-rules"))).toContain("description: Use when touching invoices.");
  });

  it("writes none for another tool", () => {
    expect(existsSync(join(project("cursor"), ".claude"))).toBe(false);
  });

  it("counts them on a dry run and writes nothing", () => {
    const count = (tool: string, cwd: string): number => {
      const result = run(`init --yes --tool ${tool} --dry-run`, cwd);
      expect(result.exitCode).toBe(0);
      return Number(result.stderr.match(/(\d+) files created/)?.[1]);
    };
    const cwd = emptyDir();
    const shipped = taskSkillsIn(join(METHOD, "skills")).length;

    // The Claude bridge is CLAUDE.md plus one pointer per task skill.
    expect(count("claude", cwd) - count("none", cwd)).toBe(1 + shipped);
    expect(readdirSync(cwd)).toEqual([]);
  });

  it("never exposes a bundled Claude Code command name", () => {
    const cwd = project();
    const bundled = ["code-review", "review", "security-review", "simplify", "init", "ship", "steward"];
    for (const folder of readdirSync(claudeSkills(cwd))) {
      const declared = read(join(claudeSkills(cwd), folder, "SKILL.md")).match(/^name: (.+)$/m)?.[1];
      expect(declared).toBe(folder);
      expect(folder.startsWith("lytos-")).toBe(true);
      expect(bundled).not.toContain(folder);
    }
  });

  it("warns when git ignores the pointers, and not otherwise", () => {
    const ignored = emptyDir();
    execFileSync("git", ["init", "-q"], { cwd: ignored });
    writeFileSync(join(ignored, ".gitignore"), ".claude/\n");
    expect(run("init --yes --tool claude", ignored).stderr).toContain("git ignores the pointers");

    const tracked = emptyDir();
    execFileSync("git", ["init", "-q"], { cwd: tracked });
    expect(run("init --yes --tool claude", tracked).stderr).not.toContain("git ignores the pointers");
  });
});

describe("lyt upgrade keeps the pointer skills", () => {
  it("adds them to a project that has the bridge and none, then changes nothing", () => {
    const cwd = project();
    rmSync(join(cwd, ".claude"), { recursive: true, force: true });
    const bridge = read(join(cwd, "CLAUDE.md"));

    const first = run("upgrade", cwd);
    expect(first.exitCode).toBe(0);
    expect(first.stderr).toContain(".claude/skills/lytos-testing/SKILL.md");
    expect(existsSync(pointer(cwd, "testing"))).toBe(true);
    expect(read(join(cwd, "CLAUDE.md"))).toBe(bridge);

    const second = run("upgrade", cwd);
    expect(second.stderr).toContain("Already up to date");
  });

  it("adds one for a skill the project added", () => {
    const cwd = project();
    addSkill(cwd, "billing-rules", "name: billing-rules\ndescription: Use when touching invoices.");

    expect(run("upgrade", cwd).exitCode).toBe(0);
    expect(existsSync(pointer(cwd, "billing-rules"))).toBe(true);
  });

  it("rewrites a description that drifted, without --force or a terminal", () => {
    const cwd = project();
    addSkill(cwd, "billing-rules", "name: billing-rules\ndescription: Old.");
    run("upgrade", cwd);
    addSkill(cwd, "billing-rules", "name: billing-rules\ndescription: New.");

    const dry = run("upgrade --dry-run", cwd);
    expect(dry.stderr).toContain("lytos-billing-rules/SKILL.md");
    expect(read(pointer(cwd, "billing-rules"))).toContain("description: Old.");

    expect(run("upgrade", cwd).exitCode).toBe(0);
    expect(read(pointer(cwd, "billing-rules"))).toContain("description: New.");
  });

  it("does not call a CRLF checkout of a pointer drifted", () => {
    const cwd = project();
    const crlf = read(pointer(cwd, "testing")).replace(/\n/g, "\r\n");
    writeFileSync(pointer(cwd, "testing"), crlf);

    expect(run("upgrade", cwd).stderr).toContain("Already up to date");
    expect(read(pointer(cwd, "testing"))).toBe(crlf);
  });

  it("announces, on a dry run, the pointer of a skill it would add", () => {
    const cwd = project();
    rmSync(join(cwd, ".lytos", "skills", "reference-loop"), { recursive: true });
    rmSync(join(claudeSkills(cwd), "lytos-reference-loop"), { recursive: true });

    expect(run("upgrade --dry-run", cwd).stderr).toContain("lytos-reference-loop/SKILL.md");
    expect(existsSync(pointer(cwd, "reference-loop"))).toBe(false);

    run("upgrade", cwd);
    expect(existsSync(pointer(cwd, "reference-loop"))).toBe(true);
  });

  it("leaves a project without the Claude bridge alone", () => {
    const cwd = project("none");
    expect(run("upgrade", cwd).exitCode).toBe(0);
    expect(existsSync(join(cwd, ".claude"))).toBe(false);
  });

  it("never rewrites a file it did not generate, even with --force", () => {
    const cwd = project();
    const mine = "---\nname: lytos-testing\ndescription: mine\n---\nmy own skill\n";
    writeFileSync(pointer(cwd, "testing"), mine);
    mkdirSync(join(claudeSkills(cwd), "my-skill"));
    writeFileSync(join(claudeSkills(cwd), "my-skill", "SKILL.md"), "untouched\n");

    const result = run("upgrade --force", cwd);
    expect(result.stderr).toContain("lyt did not generate it");
    expect(read(pointer(cwd, "testing"))).toBe(mine);
    expect(read(join(claudeSkills(cwd), "my-skill", "SKILL.md"))).toBe("untouched\n");
  });

  it("writes nothing through a linked .claude directory", () => {
    const cwd = project();
    const outside = emptyDir();
    rmSync(join(cwd, ".claude"), { recursive: true, force: true });
    symlinkSync(outside, join(cwd, ".claude"));

    const result = run("upgrade --force", cwd);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain(".claude is a symbolic link");
    expect(readdirSync(outside)).toEqual([]);
  });

  it("does not create the target of a dangling pointer link", () => {
    const cwd = project();
    const target = join(emptyDir(), "created-through-a-link.md");
    rmSync(pointer(cwd, "testing"));
    symlinkSync(target, pointer(cwd, "testing"));

    expect(run("upgrade --force", cwd).stderr).toContain("is a symbolic link");
    expect(existsSync(target)).toBe(false);
  });

  it("says which skill got no pointer, and why", () => {
    const cwd = project();
    addSkill(cwd, "no-description", "name: no-description");
    addSkill(cwd, "Bad_Name", "name: bad\ndescription: Bad folder.");

    const result = run("upgrade", cwd);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('"no-description": its SKILL.md has no `description`');
    expect(result.stderr).toContain('"Bad_Name": its folder name');
    expect(existsSync(pointer(cwd, "no-description"))).toBe(false);
    expect(existsSync(pointer(cwd, "Bad_Name"))).toBe(false);
  });
});

describe("a bad file stops one pointer, not the run (found in review)", () => {
  it.each([
    ["a SKILL.md that is a directory", (cwd: string) => mkdirSync(source(cwd, "weird"), { recursive: true }), /"weird": its SKILL\.md cannot be read/],
    ["a directory where a pointer goes", (cwd: string) => {
      rmSync(pointer(cwd, "testing"));
      mkdirSync(pointer(cwd, "testing"));
    }, /lytos-testing\/SKILL\.md not written/],
    ["a file where .claude/skills goes", (cwd: string) => {
      rmSync(claudeSkills(cwd), { recursive: true });
      writeFileSync(claudeSkills(cwd), "mine\n");
    }, /lytos-testing\/SKILL\.md not written/],
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
    addSkill(cwd, "billing-rules", "name: billing-rules\ndescription: Use when touching invoices.");
    writeFileSync(source(cwd, "billing-rules"), `\uFEFF${read(source(cwd, "billing-rules"))}`);

    expect(run("upgrade", cwd).exitCode).toBe(0);
    expect(read(pointer(cwd, "billing-rules"))).toContain("description: Use when touching invoices.");
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
    writeFileSync(join(cwd, "CLAUDE.md"), "@NOTES.md\n@missing.md\nmail me@example.md\n");

    expect(run("upgrade", cwd).exitCode).toBe(0);
    expect(existsSync(join(cwd, ".claude"))).toBe(false);
  });
});

describe("the advice for ignored pointers works as printed (found in review)", () => {
  /** The ignore lines the CLI printed, as a person would copy them. */
  const printedLines = (stderr: string): string[] =>
    stderr.split("\n").map((l) => l.trim()).filter((l) => /^!?\/?\.claude\//.test(l));

  const isIgnored = (cwd: string, path: string): boolean =>
    spawnSync("git", ["check-ignore", "-q", "--", path], { cwd }).status === 0;

  /** Personal files, at the project root and in a nested package. */
  const PERSONAL = [
    ".claude/settings.local.json",
    ".claude/skills/mine/SKILL.md",
    "pkg/.claude/settings.local.json",
    "pkg/.claude/skills/theirs/SKILL.md",
  ];

  it.each([[".claude/"], [".claude"], ["**/.claude/"], [".claude/*"], [".claude/**"]])(
    "un-ignores the pointers, and nothing that was ignored besides, under the rule %s",
    (rule) => {
      const cwd = emptyDir();
      execFileSync("git", ["init", "-q"], { cwd });
      writeFileSync(join(cwd, ".gitignore"), `${rule}\n`);
      const lines = printedLines(run("init --yes --tool claude", cwd).stderr);
      expect(lines.length).toBeGreaterThan(0);
      const before = PERSONAL.filter((path) => isIgnored(cwd, path));

      writeFileSync(join(cwd, ".gitignore"), `${rule}\n${lines.join("\n")}\n`);

      expect(isIgnored(cwd, ".claude/skills/lytos-testing/SKILL.md")).toBe(false);
      expect(PERSONAL.filter((path) => isIgnored(cwd, path))).toEqual(before);
      expect(run("upgrade", cwd).stderr).not.toContain("git ignores the pointers");
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

    expect(isIgnored(repo, "app/.claude/skills/lytos-testing/SKILL.md")).toBe(false);
    expect(isIgnored(repo, "app/.claude/settings.local.json")).toBe(true);
    expect(isIgnored(repo, ".claude/settings.local.json")).toBe(true);
    expect(isIgnored(repo, "app/sub/.claude/settings.local.json")).toBe(true);
  });
});

describe("descriptionEntry copies the description as written", () => {
  it.each([
    ["a quoted scalar", 'description: "Use when: invoicing."'],
    ["a block scalar", "description: >\n  Use when invoicing.\n\n  And when refunding."],
  ])("keeps %s", (_label, entry) => {
    expect(descriptionEntry(`---\nname: x\n${entry}\nlicense: MIT\n---\nbody`)).toBe(entry);
  });

  it("reads a file with CRLF line endings", () => {
    expect(descriptionEntry("---\r\nname: x\r\ndescription: Yes.\r\n---\r\n")).toBe("description: Yes.");
  });

  it.each([
    ["no frontmatter", "# Skill\n"],
    ["no description", "---\nname: x\n---\n"],
    ["an empty one", '---\ndescription: ""\n---\n'],
  ])("is null with %s", (_label, content) => {
    expect(descriptionEntry(content)).toBeNull();
  });
});

describe("the floor: every tool is told to read the skills", () => {
  const ctx = {} as Parameters<typeof claudeTemplate>[0];

  it.each([
    ["claude", claudeTemplate],
    ["codex", codexTemplate],
    ["cursor", cursorRulesTemplate],
    ["copilot", copilotTemplate],
    ["gemini", geminiTemplate],
    ["windsurf", windsurfTemplate],
  ])("the %s bridge orders the explicit reading", (_tool, template) => {
    const text = template(ctx);
    expect(text).toMatch(/\.lytos\/skills\/<name>\/SKILL\.md/);
    expect(text).toMatch(/do not assume your tool loads that folder on its own/i);
    expect(text).toMatch(/small (task|ones)/i);
    expect(text).toMatch(/read the frontmatter of each/i);
  });

  const sessionStart = read(join(METHOD, "skills/session-start.md"));

  it("session-start orders it on lightweight startup too", () => {
    const lightweight = sessionStart.split("#### Lightweight startup")[1].split("#### Standard startup")[0];
    expect(lightweight).toContain("read the task skills that apply");
    expect(sessionStart).toContain("At every startup, lightweight included");
  });

  it("the reference loop briefs its builder with every skill that applies", () => {
    const loop = read(join(METHOD, "skills/reference-loop/SKILL.md"));
    const brief = loop.split("**Brief.**")[1].split("\n")[0];
    expect(brief).toContain("whose `description` matches the task");
  });

  it("every skill path session-start names exists in the shipped skills", () => {
    const paths = [...sessionStart.matchAll(/\.lytos\/(skills\/[A-Za-z0-9/_.-]+\.md)/g)].map((m) => m[1]);
    expect(paths.length).toBeGreaterThan(2);
    for (const path of paths) {
      expect(existsSync(join(METHOD, path)), path).toBe(true);
    }
  });

  it("nothing shipped says a tool discovers the skills natively", () => {
    const claim = /discover[^.\n]{0,60}natively|native (skill|progressive)|via agentskills\.io progressive/i;
    const shipped = readdirSync(METHOD, { recursive: true, encoding: "utf-8" })
      .filter((p) => p.endsWith(".md"))
      .map((p) => join(METHOD, p));
    for (const path of shipped) expect(read(path), path).not.toMatch(claim);
    expect("Tools discover these skills natively").toMatch(claim);
  });
});
