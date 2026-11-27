/**
 * Does the project's bridge file order the agent to read the task skills?
 * (ISS-0191)
 *
 * A bridge file belongs to the project once written, and `lyt upgrade` never
 * rewrites one. A project that already had its bridge therefore never receives
 * the order. `upgrade` says which files lack it and prints the section to add.
 *
 * Read-only. Zero dependencies.
 */

import { join } from "path";
import { readIfFile } from "./read-if-file.js";
import { TASK_SKILLS_MARKER } from "./templates.js";

/**
 * The files each tool reads. Within a group, one file carrying the order is
 * enough: the tool loads them together.
 */
const BRIDGE_GROUPS: ReadonlyArray<readonly string[]> = [
  ["CLAUDE.md", ".claude/CLAUDE.md"],
  [".cursor/rules/lytos.mdc", ".cursorrules"],
  ["AGENTS.md"],
  [".github/copilot-instructions.md"],
  ["GEMINI.md"],
  [".windsurfrules"],
];

/**
 * The marker, alone on its line. Whether a sentence orders the reading, forbids
 * it or only mentions the skills cannot be told from the text, so no wording is
 * guessed at: an unmarked bridge is reported.
 */
const hasMarker = (content: string): boolean =>
  content.split("\n").some((line) => line.trim() === TASK_SKILLS_MARKER);

/**
 * The bridge files that point at `.lytos/` and whose tool is never told to read
 * the task skills. A file that does not mention `.lytos/` is not a Lytos bridge
 * and is not reported.
 */
export function bridgesWithoutSkillsOrder(cwd: string): string[] {
  return BRIDGE_GROUPS.flatMap((group) => {
    const bridges = group
      .map((file) => ({ file, content: readIfFile(join(cwd, file)) }))
      .filter(({ content }) => content?.includes(".lytos/"));
    const ordered = bridges.some(({ content }) => hasMarker(content as string));
    return ordered ? [] : bridges.map(({ file }) => file);
  });
}
