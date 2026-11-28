/**
 * Throwaway projects for the tests of the task skills (ISS-0191).
 */

import { expect } from "vitest";
import { spawnSync } from "child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "fs";
import { join, resolve } from "path";
import { createEmptyFixture, type Fixture } from "./fixtures.js";

const ROOT = resolve(__dirname, "../..");
const CLI = join(ROOT, "dist/cli.js");
export const METHOD = join(ROOT, "method");

export function run(
  args: string,
  cwd: string
): { stderr: string; exitCode: number } {
  const result = spawnSync("node", [CLI, ...args.split(" ").filter(Boolean)], {
    cwd,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 20000,
  });
  return { stderr: result.stderr || "", exitCode: result.status ?? 1 };
}

let fixtures: Fixture[] = [];

/** Delete every directory made since the last call: for `afterEach`. */
export function cleanupProjects(): void {
  for (const fixture of fixtures) fixture.cleanup();
  fixtures = [];
}

export function emptyDir(): string {
  const fixture = createEmptyFixture();
  fixtures.push(fixture);
  return fixture.cwd;
}

export function project(tool = "claude"): string {
  const cwd = emptyDir();
  expect(run(`init --yes --tool ${tool}`, cwd).exitCode).toBe(0);
  return cwd;
}

export const taskSkillsIn = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(dir, e.name, "SKILL.md")))
    .map((e) => e.name)
    .sort();

export const claudeSkills = (cwd: string): string =>
  join(cwd, ".claude", "skills");
export const pointer = (cwd: string, name: string): string =>
  join(claudeSkills(cwd), `lytos-${name}`, "SKILL.md");
export const source = (cwd: string, name: string): string =>
  join(cwd, ".lytos", "skills", name, "SKILL.md");
export const read = (path: string): string => readFileSync(path, "utf-8");

export function addSkill(cwd: string, name: string, frontmatter: string): void {
  mkdirSync(join(cwd, ".lytos", "skills", name), { recursive: true });
  writeFileSync(source(cwd, name), `---\n${frontmatter}\n---\n\n# ${name}\n`);
}
