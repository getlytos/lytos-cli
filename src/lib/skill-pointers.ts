/**
 * Pointer skills for Claude Code (ISS-0191).
 *
 * The task skills live in `.lytos/skills/<name>/SKILL.md`, a folder Claude Code
 * does not scan: it loads project skills from `.claude/skills/`. For each task
 * skill found on disk, a pointer is written to
 * `.claude/skills/lytos-<name>/SKILL.md`. It carries the skill's description,
 * so the tool can tell when it applies, and one instruction: read the source.
 * `.lytos/` stays the only place a skill is written.
 *
 * The `lytos-` prefix is required: a project skill replaces the bundled command
 * of the same name, and Lytos ships a `code-review`.
 *
 * Pointers rather than symbolic links: a linked file keeps the source's `name`,
 * and the CLI writes nothing through a link (`safe-write.ts`).
 *
 * A pointer is recognized by its marker. A file without it belongs to the
 * project and is never rewritten.
 *
 * Zero dependencies.
 */

import { execFileSync } from "child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "fs";
import { dirname, join, relative } from "path";
import { splitFrontmatter } from "./frontmatter.js";
import { symlinkOnPath } from "./safe-write.js";

export const POINTER_PREFIX = "lytos-";

/** The agentskills.io limit on a skill name. */
const MAX_NAME_LENGTH = 64;

/** Lowercase words joined by single hyphens: safe as a folder and as YAML. */
const SKILL_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface TaskSkill {
  /** The folder name under `.lytos/skills/`. */
  name: string;
  /** The `description` entry of its frontmatter, byte for byte, key included. */
  descriptionEntry: string;
}

export interface SkillProblem {
  name: string;
  problem: string;
}

export interface PointerResult {
  /** Paths, relative to the project root, that were (or would be) created. */
  added: string[];
  /** Generated pointers that had drifted from their source. */
  refreshed: string[];
  upToDate: string[];
  /** Files at a pointer's path that `lyt` did not generate: left alone. */
  keptForeign: string[];
  /** Pointers not written because a symbolic link is on their path. */
  behindLink: Array<{ path: string; link: string }>;
  /** Skills that got no pointer, and why. */
  invalid: SkillProblem[];
}

const normalize = (text: string): string => text.replace(/\r\n/g, "\n");

/**
 * The `description` entry of a SKILL.md frontmatter, with any indented
 * continuation lines. Copied rather than parsed and re-serialized, so quoting
 * and block scalars keep the meaning the author gave them. Null when the skill
 * has no description.
 */
export function descriptionEntry(content: string): string | null {
  const block = splitFrontmatter(normalize(content));
  if (!block) return null;

  // `head` starts with the opening fence line: the entries come after it.
  const lines = block.head.split("\n").slice(1);
  const start = lines.findIndex((line) => line.startsWith("description:"));
  if (start === -1) return null;

  let end = start + 1;
  while (end < lines.length && /^(\s+\S|\s*$)/.test(lines[end])) end++;
  const entry = lines.slice(start, end).join("\n").trimEnd();

  const value = entry.slice("description:".length).trim();
  return value === "" || value === '""' || value === "''" ? null : entry;
}

/** Turn a skill's name and SKILL.md into a pointable skill, or say why not. */
function toTaskSkill(name: string, content: string): TaskSkill | SkillProblem {
  if (!SKILL_NAME.test(name)) {
    return {
      name,
      problem: "its folder name is not lowercase words joined by hyphens",
    };
  }
  if (POINTER_PREFIX.length + name.length > MAX_NAME_LENGTH) {
    return {
      name,
      problem: `\`${POINTER_PREFIX}${name}\` is longer than ${MAX_NAME_LENGTH} characters`,
    };
  }
  const entry = descriptionEntry(content);
  if (!entry) {
    return { name, problem: "its SKILL.md has no `description`" };
  }
  return { name, descriptionEntry: entry };
}

/**
 * The task skills of a project: every folder of `.lytos/skills/` holding a
 * SKILL.md, whether the method shipped it or the project added it. Never a
 * hardcoded list.
 *
 * `pending` maps a skill name to its content for skills about to be written and
 * not on disk yet (a dry run).
 */
export function listTaskSkills(
  lytosDir: string,
  pending: ReadonlyMap<string, string> = new Map()
): { skills: TaskSkill[]; invalid: SkillProblem[] } {
  const contents = new Map(pending);
  const skillsDir = join(lytosDir, "skills");
  if (existsSync(skillsDir)) {
    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      const source = join(skillsDir, entry.name, "SKILL.md");
      if (existsSync(source)) {
        contents.set(entry.name, readFileSync(source, "utf-8"));
      }
    }
  }

  const skills: TaskSkill[] = [];
  const invalid: SkillProblem[] = [];
  for (const name of [...contents.keys()].sort()) {
    const result = toTaskSkill(name, contents.get(name) as string);
    if ("problem" in result) invalid.push(result);
    else skills.push(result);
  }
  return { skills, invalid };
}

const sourcePath = (name: string): string => `.lytos/skills/${name}/SKILL.md`;

const marker = (name: string): string =>
  `<!-- lytos:skill-pointer source=${sourcePath(name)} -->`;

export const pointerPath = (name: string): string =>
  `.claude/skills/${POINTER_PREFIX}${name}/SKILL.md`;

export function renderPointer(skill: TaskSkill): string {
  const source = sourcePath(skill.name);
  return `---
name: ${POINTER_PREFIX}${skill.name}
${skill.descriptionEntry}
---

${marker(skill.name)}

# ${POINTER_PREFIX}${skill.name}

This file is a pointer. The skill is \`${source}\`, from the project root.

1. Read that file now, in full, with your file-reading tool.
2. Follow it. It is the only source of this skill's instructions.
3. If it is missing or unreadable, say so. Do not carry on from memory.

\`lyt\` generated this file and \`lyt upgrade\` rewrites it: edit the source, never this copy.
`;
}

/**
 * Write the missing pointers and rewrite the generated ones that drifted.
 * Idempotent. Touches nothing it did not generate, and nothing behind a link.
 */
export function syncSkillPointers(
  cwd: string,
  options: { dryRun?: boolean; pending?: ReadonlyMap<string, string> } = {}
): PointerResult {
  const { skills, invalid } = listTaskSkills(
    join(cwd, ".lytos"),
    options.pending
  );
  const result: PointerResult = {
    added: [],
    refreshed: [],
    upToDate: [],
    keptForeign: [],
    behindLink: [],
    invalid,
  };

  for (const skill of skills) {
    const relPath = pointerPath(skill.name);
    const path = join(cwd, relPath);

    // First: a dangling link reads as "absent", and a write would create its target.
    const link = symlinkOnPath(path, cwd);
    if (link) {
      result.behindLink.push({ path: relPath, link: relative(cwd, link) });
      continue;
    }

    const expected = renderPointer(skill);
    const current = existsSync(path)
      ? normalize(readFileSync(path, "utf-8"))
      : null;

    if (current === expected) {
      result.upToDate.push(relPath);
      continue;
    }
    if (current !== null && !current.includes(marker(skill.name))) {
      result.keptForeign.push(relPath);
      continue;
    }
    if (!options.dryRun) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, expected, "utf-8");
    }
    (current === null ? result.added : result.refreshed).push(relPath);
  }
  return result;
}

/**
 * Does this project use the Claude Code bridge? Yes when its instructions for
 * Claude point at `.lytos/`, or when it already holds a generated pointer.
 */
export function hasClaudeBridge(cwd: string): boolean {
  const instructions = ["CLAUDE.md", join(".claude", "CLAUDE.md")];
  for (const file of instructions) {
    const path = join(cwd, file);
    if (existsSync(path) && readFileSync(path, "utf-8").includes(".lytos/")) {
      return true;
    }
  }
  return listTaskSkills(join(cwd, ".lytos")).skills.some((skill) => {
    const path = join(cwd, pointerPath(skill.name));
    return (
      existsSync(path) &&
      readFileSync(path, "utf-8").includes(marker(skill.name))
    );
  });
}

/** Does git ignore this path? False outside a repository or without git. */
function ignoredByGit(cwd: string, path: string): boolean {
  try {
    execFileSync("git", ["check-ignore", "-q", "--", path], {
      cwd,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * What a person has to be told after a sync: the pointers that could not be
 * written, and pointers git ignores — present here, absent from a fresh clone,
 * a worktree or a cloud session.
 */
export function pointerWarnings(cwd: string, result: PointerResult): string[] {
  const warnings = [
    ...result.invalid.map(
      ({ name, problem }) =>
        `No Claude Code pointer for the skill "${name}": ${problem}.`
    ),
    ...result.behindLink.map(
      ({ path, link }) =>
        `${path} not written: ${link} is a symbolic link, and lyt does not write through one.`
    ),
    ...result.keptForeign.map(
      (path) =>
        `Kept ${path}: lyt did not generate it. Claude Code will not be pointed at that Lytos skill.`
    ),
  ];

  const written = [...result.added, ...result.refreshed, ...result.upToDate];
  if (written.some((path) => ignoredByGit(cwd, path))) {
    warnings.push(
      "git ignores the pointers in .claude/skills/: a fresh clone, a worktree or a cloud session will not have them. Un-ignore .claude/skills/lytos-*/ and commit them."
    );
  }
  return warnings;
}
