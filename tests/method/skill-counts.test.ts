/**
 * The skill counts the method states cannot drift from the skills it ships
 * (ISS-0179).
 *
 * Two texts said "9 procedures" and "8 task skills" after a ninth task skill
 * (`reference-loop`) shipped: the briefing `lyt init` prints, and the list in
 * `skills/session-start.md`. Both are derived here from the files under
 * `method/skills/`, so adding a skill without updating them fails the build.
 */

import { describe, it, expect, afterEach } from "vitest";
import { existsSync, readFileSync, readdirSync } from "fs";
import { spawnSync } from "child_process";
import { join, resolve } from "path";
import { createEmptyFixture, type Fixture } from "../helpers/fixtures.js";

const root = process.cwd();
const read = (p: string): string => readFileSync(join(root, p), "utf-8");
const CLI = resolve(root, "dist/cli.js");

/** The task skills in a skills folder: one folder with a SKILL.md each. */
function taskSkillsIn(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(dir, e.name, "SKILL.md")))
    .map((e) => e.name)
    .sort();
}

/** The task skills the method ships. */
const shippedTaskSkills = (): string[] => taskSkillsIn(join(root, "method/skills"));

/** The names the session-start skill lists as task skills, in its "Task skills" paragraph. */
function listedTaskSkills(sessionStart: string): string[] {
  const sentence = sessionStart.match(/Lytos task skills \(([^)]*)\)/);
  return [...(sentence?.[1] ?? "").matchAll(/`([a-z-]+)`/g)].map((m) => m[1]).sort();
}

/** The number a briefing gives for `.lytos/skills/`, in English or in French. */
function briefedCount(stderr: string): number | null {
  const m = stderr.match(/\.lytos\/skills\/\s+<- (\d+) (?:operational procedures|procédures opérationnelles)/);
  return m ? Number(m[1]) : null;
}

/** Every skill file a project holds: the flat session-start, plus one SKILL.md per task skill. */
const skillFilesOf = (dir: string): number =>
  (existsSync(join(dir, "session-start.md")) ? 1 : 0) + taskSkillsIn(dir).length;

describe("the skills the method ships", () => {
  it("are session-start plus the task skills, and there are more than the eight of 1.6", () => {
    const names = shippedTaskSkills();
    expect(names).toContain("reference-loop");
    expect(names.length).toBeGreaterThanOrEqual(9);
    expect(existsSync(join(root, "method/skills/session-start.md"))).toBe(true);
  });
});

describe("skills/session-start.md lists the task skills that ship", () => {
  const list = listedTaskSkills(read("method/skills/session-start.md"));

  it("names every shipped task skill, reference-loop included, and no other", () => {
    expect(list).toEqual(shippedTaskSkills());
  });

  it("is the copy this repo runs on", () => {
    expect(read(".lytos/skills/session-start.md")).toBe(read("method/skills/session-start.md"));
  });

  it("is caught when a skill is missing from the list, or one that does not exist is listed", () => {
    const text = read("method/skills/session-start.md");
    expect(listedTaskSkills(text.replace(", `reference-loop`", ""))).not.toEqual(shippedTaskSkills());
    expect(listedTaskSkills(text.replace("`api-design`", "`api-design`, `no-such-skill`"))).not.toEqual(
      shippedTaskSkills()
    );
  });
});

describe("the briefing `lyt init` prints counts the skills it writes", () => {
  let fixture: Fixture;
  afterEach(() => fixture?.cleanup());

  function init(lang: string): { stderr: string; skills: number } {
    fixture = createEmptyFixture();
    const r = spawnSync(
      "node",
      [CLI, "init", "--yes", "--tool", "none", "--lang", lang, "--name", "sample"],
      { cwd: fixture.cwd, encoding: "utf-8" }
    );
    expect(r.status).toBe(0);
    return { stderr: r.stderr, skills: skillFilesOf(join(fixture.cwd, ".lytos", "skills")) };
  }

  it.each([["en"], ["fr"]])("says the number of skill files init wrote, in %s", (lang) => {
    const { stderr, skills } = init(lang);
    expect(briefedCount(stderr)).toBe(skills);
    expect(skills).toBe(shippedTaskSkills().length + 1);
  });

  it("is caught when the number is stale", () => {
    const { stderr, skills } = init("en");
    const stale = stderr.replace(`<- ${skills} operational`, `<- ${skills - 1} operational`);
    expect(briefedCount(stale)).not.toBe(skills);
    expect(briefedCount("no briefing here")).toBeNull();
  });
});
