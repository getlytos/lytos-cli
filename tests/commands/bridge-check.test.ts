/**
 * `lyt upgrade` says which bridge files never order the reading of the task
 * skills, and rewrites none of them (ISS-0191).
 */

import { describe, it, expect, afterEach } from "vitest";
import { spawnSync } from "child_process";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { createEmptyFixture, type Fixture } from "../helpers/fixtures.js";

const CLI = resolve(__dirname, "../../dist/cli.js");
const WARNING = "no order to read the task skills";

/** A bridge as 1.7.0 wrote it: it names session-start and no task skill. */
const OLD_BRIDGE =
  "# Project\n\nRead .lytos/manifest.md, then .lytos/skills/session-start.md.\n";

const BRIDGE_FILES = [
  "CLAUDE.md",
  "AGENTS.md",
  "GEMINI.md",
  ".windsurfrules",
  ".cursorrules",
  ".cursor/rules/lytos.mdc",
  ".github/copilot-instructions.md",
];

function run(args: string, cwd: string): { stderr: string; exitCode: number } {
  const result = spawnSync("node", [CLI, ...args.split(" ").filter(Boolean)], {
    cwd,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 20000,
  });
  return { stderr: result.stderr || "", exitCode: result.status ?? 1 };
}

let fixture: Fixture;

afterEach(() => fixture?.cleanup());

function project(tool = "none"): string {
  fixture = createEmptyFixture();
  const init = tool === "all" ? "--all-tools" : `--tool ${tool}`;
  expect(run(`init --yes ${init}`, fixture.cwd).exitCode).toBe(0);
  return fixture.cwd;
}

function write(cwd: string, file: string, content: string): void {
  mkdirSync(dirname(join(cwd, file)), { recursive: true });
  writeFileSync(join(cwd, file), content);
}

/** The line that names the files, without the section printed after it. */
const warningLine = (stderr: string): string =>
  stderr.split("\n").find((line) => line.includes(WARNING)) ?? "";

describe("lyt upgrade and the bridge files", () => {
  it.each(BRIDGE_FILES)("names an old %s and leaves it byte for byte", (file) => {
    const cwd = project();
    write(cwd, file, OLD_BRIDGE);

    for (const args of ["upgrade", "upgrade --force", "upgrade --dry-run"]) {
      const result = run(args, cwd);
      expect(result.exitCode, args).toBe(0);
      expect(warningLine(result.stderr), args).toContain(file);
      expect(readFileSync(join(cwd, file), "utf-8"), args).toBe(OLD_BRIDGE);
    }
  });

  it("prints the section to add", () => {
    const cwd = project();
    write(cwd, "AGENTS.md", OLD_BRIDGE);

    const { stderr } = run("upgrade", cwd);
    expect(stderr).toContain("## Task skills");
    expect(stderr).toContain(".lytos/skills/<name>/SKILL.md");
  });

  it("says nothing about the bridges init writes today", () => {
    const cwd = project("all");
    expect(run("upgrade", cwd).stderr).not.toContain(WARNING);
  });

  it("stops once the printed section is pasted in", () => {
    const cwd = project();
    write(cwd, "AGENTS.md", OLD_BRIDGE);
    const printed = run("upgrade", cwd).stderr;
    const section = printed.slice(printed.indexOf("## Task skills"));

    write(cwd, "AGENTS.md", `${OLD_BRIDGE}\n${section}`);
    expect(run("upgrade", cwd).stderr).not.toContain(WARNING);
  });

  it("ignores a file that is not a Lytos bridge", () => {
    const cwd = project();
    write(cwd, "AGENTS.md", "# Notes\n\nUse tabs.\n");
    expect(run("upgrade", cwd).stderr).not.toContain(WARNING);
  });

  it("is content when one of the two Claude files carries the order", () => {
    const cwd = project("claude");
    write(cwd, ".claude/CLAUDE.md", OLD_BRIDGE);
    expect(run("upgrade", cwd).stderr).not.toContain(WARNING);
  });

  it("names only the files that lack it", () => {
    const cwd = project("claude");
    write(cwd, "AGENTS.md", OLD_BRIDGE);

    const line = warningLine(run("upgrade", cwd).stderr);
    expect(line).toContain("AGENTS.md");
    expect(line).not.toContain("CLAUDE.md");
  });

  it("does not trip on a directory where a bridge file would be", () => {
    const cwd = project();
    mkdirSync(join(cwd, "GEMINI.md"));
    expect(run("upgrade", cwd).exitCode).toBe(0);
  });
});
