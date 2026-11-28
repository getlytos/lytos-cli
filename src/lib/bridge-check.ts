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
import { bodyOf, splitFrontmatter } from "./frontmatter.js";
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

/** A line that opens or closes a fenced code block, with its fence. */
const FENCE = /^ {0,3}(`{3,}|~{3,})/;

/**
 * Is the marker there as a line of its own? Whether a sentence orders the
 * reading, forbids it or only mentions the skills cannot be told from the text,
 * so no wording is guessed at. A marker that is shown rather than set does not
 * count: in a fenced block, closed or not, or indented as code. Nor does one in
 * the YAML header, which is data about the file.
 */
function hasMarker(content: string): boolean {
  const text = content.replace(/^\uFEFF/, "");
  const body = splitFrontmatter(text) ? bodyOf(text) : text;
  let fence: string | null = null;
  for (const line of body.split(/\r?\n/)) {
    const found = line.match(FENCE)?.[1];
    if (fence) {
      // Only the same character, at least as long, closes a block.
      if (found?.startsWith(fence)) fence = null;
    } else if (found) {
      fence = found;
    } else if (line.replace(/^ {0,3}/, "").trimEnd() === TASK_SKILLS_MARKER) {
      return true;
    }
  }
  return false;
}

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
