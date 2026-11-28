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

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "fs";
import { dirname, join, relative } from "path";
import { splitFrontmatter } from "./frontmatter.js";
import { hasOtherHardLinks, symlinkOnPath } from "./safe-write.js";

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
  /** Drifted pointers not rewritten: the file has another hard link. */
  hardLinked: string[];
  /** Pointers the file system refused: a directory in the way, no permission. */
  failed: Array<{ path: string; reason: string }>;
  /** Skills that got no pointer, and why. */
  invalid: SkillProblem[];
}

/** Without a byte order mark, and with `\n` line endings. */
const normalize = (text: string): string =>
  text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");

/** The error code of a refused file operation, or its message. */
const reasonOf = (err: unknown): string =>
  (err as NodeJS.ErrnoException).code ?? (err as Error).message;

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
  const invalid: SkillProblem[] = [];
  const skillsDir = join(lytosDir, "skills");
  if (existsSync(skillsDir)) {
    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      const source = join(skillsDir, entry.name, "SKILL.md");
      if (!existsSync(source)) continue;
      try {
        contents.set(entry.name, readFileSync(source, "utf-8"));
      } catch (err) {
        contents.delete(entry.name);
        invalid.push({
          name: entry.name,
          problem: `its SKILL.md cannot be read (${reasonOf(err)})`,
        });
      }
    }
  }

  const skills: TaskSkill[] = [];
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

/**
 * Did `lyt` generate this file as the pointer to that skill? Only the place it
 * writes the marker counts: the first line of the body. A file that quotes the
 * marker anywhere else is the project's own.
 */
export function isPointerOf(content: string, name: string): boolean {
  const body = splitFrontmatter(normalize(content))?.rest.split("\n").slice(1);
  return body?.find((line) => line !== "") === marker(name);
}

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

/** Bring the pointer of one skill up to date, and record what became of it. */
function syncPointer(
  cwd: string,
  skill: TaskSkill,
  dryRun: boolean,
  result: PointerResult
): void {
  const relPath = pointerPath(skill.name);
  const path = join(cwd, relPath);

  // First: a dangling link reads as "absent", and a write would create its target.
  const link = symlinkOnPath(path, cwd);
  if (link) {
    result.behindLink.push({ path: relPath, link: relative(cwd, link) });
    return;
  }

  const expected = renderPointer(skill);
  const current = existsSync(path)
    ? normalize(readFileSync(path, "utf-8"))
    : null;

  if (current === expected) {
    result.upToDate.push(relPath);
    return;
  }
  if (current !== null && !isPointerOf(current, skill.name)) {
    result.keptForeign.push(relPath);
    return;
  }
  if (current !== null && hasOtherHardLinks(path)) {
    result.hardLinked.push(relPath);
    return;
  }
  if (!dryRun) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, expected, "utf-8");
  }
  (current === null ? result.added : result.refreshed).push(relPath);
}

/**
 * Write the missing pointers and rewrite the generated ones that drifted.
 * Idempotent. Touches nothing it did not generate, and nothing behind a link.
 * A file the system refuses costs its own pointer, not the run.
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
    hardLinked: [],
    failed: [],
    invalid,
  };

  for (const skill of skills) {
    try {
      syncPointer(cwd, skill, Boolean(options.dryRun), result);
    } catch (err) {
      result.failed.push({
        path: pointerPath(skill.name),
        reason: reasonOf(err),
      });
    }
  }
  return result;
}
