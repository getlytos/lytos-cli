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

export function parseFrontmatter(content: string): Frontmatter | null {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return null;

  const frontmatter: Frontmatter = {};
  const lines = match[1].split("\n");

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Skip blank lines, comment lines, and stray indented lines at top level
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) { i++; continue; }
    const isIndented = /^\s/.test(line);
    if (isIndented) { i++; continue; }

    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) { i++; continue; }

    const key = line.slice(0, colonIndex).trim();
    const rawValue = line.slice(colonIndex + 1).trim();

    // Empty value followed by indented lines → nested object (schema v2).
    if (rawValue === "" && i + 1 < lines.length && /^\s/.test(lines[i + 1])) {
      const obj: { [k: string]: string } = {};
      let j = i + 1;
      while (j < lines.length) {
        const sub = lines[j];
        const subTrim = sub.trim();
        if (subTrim === "" || subTrim.startsWith("#")) { j++; continue; }
        if (!/^\s/.test(sub)) break;
        const subColon = sub.indexOf(":");
        if (subColon === -1) { j++; continue; }
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

function quoteIfNeeded(value: string): string {
  const needsQuotes = value.includes(":") || value.includes("#");
  return needsQuotes ? `"${value}"` : value;
}

export function serializeFrontmatter(data: Frontmatter): string {
  const lines = ["---"];

  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      lines.push(value.length === 0 ? `${key}: []` : `${key}: [${value.join(", ")}]`);
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
