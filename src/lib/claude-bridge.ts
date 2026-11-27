/**
 * Does a project use the Claude Code bridge? (ISS-0191)
 *
 * `lyt upgrade` writes pointer skills only into a project that does.
 *
 * Read-only. Zero dependencies.
 */

import { dirname, join, resolve } from "path";
import { readIfFile } from "./read-if-file.js";
import { isPointerOf, listTaskSkills, pointerPath } from "./skill-pointers.js";

const INSTRUCTION_FILES = ["CLAUDE.md", join(".claude", "CLAUDE.md")];

/** An `@path.md` import. It follows a space or starts the line: an address does not. */
const IMPORT = /(?:^|\s)@([\w./-]+\.md)\b/g;

/**
 * Does this instruction file lead Claude to `.lytos/`, by itself or through a
 * file it imports (a common one-line `@AGENTS.md`)? One level of import.
 */
function leadsToLytos(path: string): boolean {
  const content = readIfFile(path);
  if (content === null) return false;
  if (content.includes(".lytos/")) return true;
  return [...content.matchAll(IMPORT)].some(([, target]) =>
    readIfFile(resolve(dirname(path), target))?.includes(".lytos/")
  );
}

/**
 * Yes when its instructions for Claude lead to `.lytos/`, or when it already
 * holds a generated pointer.
 */
export function hasClaudeBridge(cwd: string): boolean {
  if (INSTRUCTION_FILES.some((file) => leadsToLytos(join(cwd, file)))) {
    return true;
  }
  return listTaskSkills(join(cwd, ".lytos")).skills.some(({ name }) => {
    const content = readIfFile(join(cwd, pointerPath(name)));
    return content !== null && isPointerOf(content, name);
  });
}
