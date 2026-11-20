/**
 * Simple YAML frontmatter parser.
 *
 * Handles the subset of YAML used in Lytos issues:
 *   - scalars (strings, dates, numbers stored as strings)
 *   - simple inline lists ([a, b])
 *   - one-level nested objects (required by frontmatter schema v2:
 *     ai_implementer, ai_reviewer, validation — see ADR-0001)
 *
 * Out of scope: multi-line scalars, anchors, deep nesting, lists of objects.
 * Keeping this dependency-free is a manifest-level constraint.
 */

export type FrontmatterValue = string | string[] | { [k: string]: string };

export interface Frontmatter {
  [key: string]: FrontmatterValue;
}

function stripQuotes(s: string): string {
  return s.replace(/^["']|["']$/g, "");
}

function parseInlineList(raw: string): string[] {
  return raw
    .slice(1, -1)
    .split(",")
    .map((v) => stripQuotes(v.trim()))
    .filter((v) => v.length > 0);
}

/**
 * The frontmatter block: an opening `---` line, then everything up to the FIRST
 * line that starts with `---`. One expression for the parser and for every
 * writer that has to cut a card in two (`bodyOf`), so they cannot disagree on
 * where the frontmatter ends: a line that merely ENDS in `---` closes nothing.
 */
const FRONTMATTER_BLOCK = /^---\s*\n([\s\S]*?)\n---/;

export function parseFrontmatter(content: string): Frontmatter | null {
  const match = content.match(FRONTMATTER_BLOCK);
  if (!match) return null;

  const frontmatter: Frontmatter = {};
  const lines = match[1].split("\n");

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Skip blank lines, comment lines, and stray indented lines at top level
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      i++;
      continue;
    }
    const isIndented = /^\s/.test(line);
    if (isIndented) {
      i++;
      continue;
    }

    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) {
      i++;
      continue;
    }

    const key = line.slice(0, colonIndex).trim();
    const rawValue = line.slice(colonIndex + 1).trim();

    // Empty value followed by indented lines → nested object (schema v2).
    if (rawValue === "" && i + 1 < lines.length && /^\s/.test(lines[i + 1])) {
      const obj: { [k: string]: string } = {};
      let j = i + 1;
      while (j < lines.length) {
        const sub = lines[j];
        const subTrim = sub.trim();
        if (subTrim === "" || subTrim.startsWith("#")) {
          j++;
          continue;
        }
        if (!/^\s/.test(sub)) break;
        const subColon = sub.indexOf(":");
        if (subColon === -1) {
          j++;
          continue;
        }
        const subKey = sub.slice(0, subColon).trim();
        const subRaw = sub.slice(subColon + 1).trim();
        obj[subKey] = stripQuotes(subRaw);
        j++;
      }
      frontmatter[key] = obj;
      i = j;
      continue;
    }

    if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
      frontmatter[key] = parseInlineList(rawValue);
    } else {
      frontmatter[key] = stripQuotes(rawValue);
    }
    i++;
  }

  return frontmatter;
}

/**
 * The frontmatter block cut at its closing fence: `head` runs from the opening
 * `---` through the line break that precedes the closing one, `rest` is
 * everything after the three closing dashes (the end of that line, then the
 * body). Null when there is no block. For a writer that must put a field in
 * front of the closing fence and leave every other byte where it was; same
 * closing line as `parseFrontmatter`.
 */
export function splitFrontmatter(
  content: string
): { head: string; rest: string } | null {
  const match = content.match(FRONTMATTER_BLOCK);
  if (!match) return null;
  const end = (match.index ?? 0) + match[0].length;
  return { head: content.slice(0, end - 3), rest: content.slice(end) };
}

/**
 * The body of a card: what follows the closing `---` line of its frontmatter,
 * without the blank lines right after it. Empty when there is no closing line.
 *
 * The closing line is the one `parseFrontmatter` stops at, and the rest of that
 * line goes with it. Every writer that rewrites a card (`lyt move`, `start`,
 * `claim`, `review`) puts `serializeFrontmatter(...) + "\n" + bodyOf(content)`
 * back, so cutting anywhere else corrupts the card (ISS-0175).
 */
export function bodyOf(content: string): string {
  const match = content.match(FRONTMATTER_BLOCK);
  if (!match) return "";
  const afterDashes = content.slice((match.index ?? 0) + match[0].length);
  const newline = afterDashes.indexOf("\n");
  if (newline === -1) return "";
  return afterDashes.slice(newline + 1).replace(/^(?:[ \t]*\r?\n)+/, "");
}

function quoteIfNeeded(value: string): string {
  // An empty string must stay quoted: `key: ` (colon, space, nothing) is
  // ambiguous trailing whitespace, not a value — `key: ""` round-trips
  // cleanly and is what parseFrontmatter() expects back (ISS-0150).
  if (value === "") return '""';
  const needsQuotes = value.includes(":") || value.includes("#");
  return needsQuotes ? `"${value}"` : value;
}

export function serializeFrontmatter(data: Frontmatter): string {
  const lines = ["---"];

  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      lines.push(
        value.length === 0 ? `${key}: []` : `${key}: [${value.join(", ")}]`
      );
    } else if (typeof value === "object" && value !== null) {
      lines.push(`${key}:`);
      for (const [subKey, subValue] of Object.entries(value)) {
        lines.push(`  ${subKey}: ${quoteIfNeeded(subValue)}`);
      }
    } else {
      lines.push(`${key}: ${quoteIfNeeded(value)}`);
    }
  }

  lines.push("---");
  return lines.join("\n");
}
