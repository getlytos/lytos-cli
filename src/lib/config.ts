/**
 * `.lytos/config.yml` reader (ISS-0166) — the first code to read this file.
 *
 * Until now the file was write-only: `lyt init` records the language, the
 * profile and the design answer, and nothing read them back (ISS-0158 says so
 * on purpose: a preference must never be a brake). Reviewer independence needs
 * a few real settings, so this module reads it back, as narrowly as it can.
 *
 * What it understands (a small, indentation-based subset of YAML):
 *   - `key: value` — a scalar, quoted or not;
 *   - `key: [a, b, c]` — an inline list of scalars;
 *   - `key:` followed by deeper-indented lines — a nested map of the same
 *     things, or a block list (`- a`), up to four levels deep;
 *   - blank lines, `# comments` and a leading `---`.
 *
 * What it does not understand is never guessed at: the line is skipped and
 * reported in `ignored`, so the caller can say so. Keys nobody asked for are
 * kept in `data` and are nobody's business — a project may carry any other
 * setting in the same file. Nothing here ever writes the file, and nothing
 * throws on its content: a broken config must not break a command, it must
 * leave the defaults in force (which is the stricter side for independence).
 *
 * Zero dependencies — the manifest allows none, and the frontmatter parser
 * (one nesting level, inline lists only) is too narrow for a sectioned file.
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";

export type ConfigNode = string | string[] | ConfigMap;
export interface ConfigMap {
  [key: string]: ConfigNode;
}

export interface IgnoredLine {
  /** 1-based line number in the file. */
  line: number;
  text: string;
  reason: string;
}

export interface ParsedConfig {
  data: ConfigMap;
  ignored: IgnoredLine[];
}

export interface LoadedConfig extends ParsedConfig {
  /** Path as given to `readConfig` (inside the `.lytos/` directory). */
  path: string;
  present: boolean;
  /** The path exists but could not be read (a directory, a permission). */
  unreadable: boolean;
}

/** Deeper than this is not read: no setting of ours needs it. */
const MAX_DEPTH = 4;

interface Row {
  line: number;
  indent: number;
  text: string;
}

interface Cursor {
  rows: Row[];
  pos: number;
  ignored: IgnoredLine[];
}

const LIST_ITEM = /^-(\s|$)/;
const KEY_VALUE = /^("[^"]*"|'[^']*'|[^\s#][^#]*?)\s*:(?:\s+(.*))?$/;

/** Remove one pair of matching quotes around a value, nothing else. */
function unquote(raw: string): string {
  const text = raw.trim();
  const quoted =
    text.length >= 2 &&
    (text[0] === '"' || text[0] === "'") &&
    text[text.length - 1] === text[0];
  return quoted ? text.slice(1, -1) : text;
}

/** Cut a trailing ` # comment`, unless the `#` sits inside quotes. */
function stripComment(text: string): string {
  let quote = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === quote) quote = "";
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === "#" && (i === 0 || /\s/.test(text[i - 1]))) {
      return text.slice(0, i).trimEnd();
    }
  }
  return text.trimEnd();
}

function skip(cur: Cursor, row: Row, reason: string): void {
  cur.ignored.push({ line: row.line, text: row.text, reason });
}

/** Meaningful lines only; a tab in the indentation is refused, not guessed. */
function toRows(text: string, ignored: IgnoredLine[]): Row[] {
  const rows: Row[] = [];
  const lines = text.replace(/^﻿/, "").split("\n");
  lines.forEach((raw, i) => {
    const line = raw.replace(/\r$/, "");
    if (line.trim() === "" || line.trim().startsWith("#")) return;
    const lead = line.match(/^\s*/)![0];
    const content = stripComment(line.trim());
    if (lead.includes("\t")) {
      ignored.push({
        line: i + 1,
        text: content,
        reason: "tab indentation is not supported (use spaces)",
      });
    } else if (lead.length > 0 || (content !== "---" && content !== "...")) {
      rows.push({ line: i + 1, indent: lead.length, text: content });
    }
  });
  return rows;
}

/** `[a, "b c"]` → a list; anything else → the scalar. */
function parseValue(value: string): string | string[] {
  const text = value.trim();
  if (text.startsWith("[") && text.endsWith("]")) {
    return text
      .slice(1, -1)
      .split(",")
      .map((item) => unquote(item))
      .filter((item) => item.length > 0);
  }
  return unquote(text);
}

/** Skip every line nested under `parentIndent`, saying why. */
function skipBlock(cur: Cursor, parentIndent: number, reason: string): void {
  let row = cur.rows[cur.pos];
  while (row && row.indent > parentIndent) {
    skip(cur, row, reason);
    cur.pos++;
    row = cur.rows[cur.pos];
  }
}

/** The block under `key:` — a list, a nested map, or the empty string. */
function parseChild(
  cur: Cursor,
  parentIndent: number,
  depth: number
): ConfigNode {
  const next = cur.rows[cur.pos];
  if (!next || next.indent <= parentIndent) return "";
  if (depth >= MAX_DEPTH) {
    skipBlock(cur, parentIndent, "nested deeper than four levels");
    return "";
  }
  return LIST_ITEM.test(next.text)
    ? parseList(cur, next.indent)
    : parseMap(cur, next.indent, depth + 1);
}

/** One `- item` per line at this indent; a mapping item is not understood. */
function parseList(cur: Cursor, indent: number): string[] {
  const items: string[] = [];
  while (cur.pos < cur.rows.length) {
    const row = cur.rows[cur.pos];
    if (row.indent < indent || !LIST_ITEM.test(row.text)) break;
    cur.pos++;
    const item = row.text.slice(1).trim();
    if (row.indent > indent) skip(cur, row, "unexpected indentation");
    else if (/^[^"']*:(\s|$)/.test(item))
      skip(cur, row, "a mapping inside a list is not supported");
    else if (item.length > 0) items.push(unquote(item));
  }
  return items;
}

/** `key: value` lines at one indent, with their children. */
function parseMap(cur: Cursor, indent: number, depth: number): ConfigMap {
  const map: ConfigMap = {};
  while (cur.pos < cur.rows.length) {
    const row = cur.rows[cur.pos];
    if (row.indent < indent) break;
    cur.pos++;
    const kv = row.text.match(KEY_VALUE);
    if (row.indent > indent) skip(cur, row, "unexpected indentation");
    else if (LIST_ITEM.test(row.text))
      skip(cur, row, "a list item where a key was expected");
    else if (!kv) skip(cur, row, "not a `key: value` line");
    else if (/^[|>]/.test(kv[2] ?? "")) {
      skip(cur, row, "multi-line scalars are not supported");
      skipBlock(cur, indent, "part of a multi-line scalar");
    } else {
      const key = unquote(kv[1]);
      if (key in map) skip(cur, row, "duplicate key: the last one wins");
      map[key] = kv[2] ? parseValue(kv[2]) : parseChild(cur, indent, depth);
    }
  }
  return map;
}

/**
 * Parse the text of a `config.yml`. Never throws: whatever is not understood
 * comes back in `ignored` and the rest is returned as usual.
 */
export function parseConfig(text: string): ParsedConfig {
  const ignored: IgnoredLine[] = [];
  const rows = toRows(text, ignored);
  if (rows.length === 0) return { data: {}, ignored };
  const cur: Cursor = { rows, pos: 0, ignored };
  const data = parseMap(cur, rows[0].indent, 1);
  while (cur.pos < rows.length) {
    skip(cur, rows[cur.pos], "unexpected indentation");
    cur.pos++;
  }
  ignored.sort((a, b) => a.line - b.line);
  return { data, ignored };
}

/** Read `<lytosDir>/config.yml`. An absent or unreadable file is an empty config. */
export function readConfig(lytosDir: string): LoadedConfig {
  const path = join(lytosDir, "config.yml");
  const empty = { data: {}, ignored: [], path };
  if (!existsSync(path)) {
    return { ...empty, present: false, unreadable: false };
  }
  try {
    return {
      ...parseConfig(readFileSync(path, "utf-8")),
      path,
      present: true,
      unreadable: false,
    };
  } catch {
    return { ...empty, present: true, unreadable: true };
  }
}
