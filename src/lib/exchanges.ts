/**
 * Design exchange entries and their derived index (ISS-0169, ADR-0009 §4).
 *
 * The exchange between design and code lives in the repository, in small files
 * an agent can read selectively, never in one growing log:
 *
 *   .lytos/design/exchanges/<epic>/NNN-<slug>.md
 *
 * Each entry has a frontmatter (`id`, `epic`, `milestone`, `from`, `type`,
 * `status`, `refs`) and a body of at most 150 words. The index of the OPEN
 * entries is derived on every read, like BOARD.md (ADR-0002): nothing stores it,
 * nothing writes it by hand, nothing commits it, and a resolved entry drops out
 * of it by changing its `status` alone.
 *
 * A malformed entry is never dropped silently. An open gap that vanished from
 * the index because of a typo is the failure this feature exists to prevent, so
 * every problem is reported with its file, and an entry whose only fault is its
 * body (too long, empty) is still listed. Nothing here touches the network or
 * writes a file. This module is pure (the format, the parser, the rendering);
 * `exchanges-scan.ts` reads the folder.
 *
 * Zero dependencies.
 */

import { parseFrontmatter, type Frontmatter } from "./frontmatter.js";

/** Where the entries live, relative to `.lytos/`. */
export const EXCHANGES_DIR = "design/exchanges";

/** Who wrote the entry: the design side or the code side. */
export const EXCHANGE_FROM = ["design", "code"] as const;
/** What the entry is: a gap between the two, a prompt, the answer to one, a decision. */
export const EXCHANGE_TYPES = [
  "gap",
  "prompt",
  "response",
  "decision",
] as const;
/** Open entries are the ones the index lists. */
export const EXCHANGE_STATUSES = ["open", "resolved"] as const;
/** A body longer than this is a sign the entry holds several subjects. */
export const MAX_BODY_WORDS = 150;

const ENTRY_FILE = /^(\d{3,})-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/;
const NAME_RULE =
  "file name must be NNN-slug.md (NNN: three digits or more; slug: lowercase words joined by hyphens)";

const ENUM_FIELDS: ReadonlyArray<readonly [string, readonly string[]]> = [
  ["from", EXCHANGE_FROM],
  ["type", EXCHANGE_TYPES],
  ["status", EXCHANGE_STATUSES],
];

/** What an entry says, without where it was found. */
export interface ExchangeFields {
  id: string;
  epic: string;
  milestone: string;
  from: string;
  type: string;
  status: string;
  refs: string[];
  words: number;
}

/** An entry, with its path relative to the project root. */
export interface ExchangeEntry extends ExchangeFields {
  file: string;
}

export interface ExchangeProblem {
  file: string;
  message: string;
}

export interface ExchangeScan {
  /** The open entries, ordered by epic then number. */
  open: ExchangeEntry[];
  resolved: number;
  problems: ExchangeProblem[];
}

export interface ParsedEntry {
  /** Null when a field is wrong; an entry with only a body problem is still returned. */
  entry: ExchangeFields | null;
  problems: string[];
}

function scalar(fm: Frontmatter, key: string): string {
  const value = fm[key];
  return typeof value === "string" ? value : "";
}

/** The faults of `epic` and `id`, which must say where the file is. */
function identityProblems(
  fm: Frontmatter,
  epicDir: string,
  expectedId: string
): string[] {
  const problems: string[] = [];
  const epic = scalar(fm, "epic");
  if (epic === "") problems.push("epic is missing");
  else if (epic !== epicDir) {
    problems.push(`epic "${epic}" does not match its folder ${epicDir}`);
  }
  const id = scalar(fm, "id");
  if (id === "") problems.push("id is missing");
  else if (id !== expectedId) {
    problems.push(
      `id "${id}" does not match the place of the file: expected ${expectedId}`
    );
  }
  return problems;
}

/** The faults of `from`, `type` and `status`, which take a closed set of values. */
function enumProblems(fm: Frontmatter): string[] {
  const problems: string[] = [];
  for (const [field, valid] of ENUM_FIELDS) {
    const value = scalar(fm, field);
    const choices = valid.join(", ");
    if (value === "") problems.push(`${field} is missing (one of: ${choices})`);
    else if (!valid.includes(value)) {
      problems.push(`${field} "${value}" is not one of: ${choices}`);
    }
  }
  return problems;
}

/** The faults of the optional fields: `milestone` is one value, `refs` a list. */
function optionalProblems(fm: Frontmatter): string[] {
  const problems: string[] = [];
  if (fm.milestone !== undefined && typeof fm.milestone !== "string") {
    problems.push("milestone must be a single value");
  }
  const refs = fm.refs;
  if (refs !== undefined && refs !== "" && !Array.isArray(refs)) {
    problems.push(
      "refs must be a list, for example refs: [ISS-0170, ISS-0163/002]"
    );
  }
  return problems;
}

function bodyOf(content: string): string {
  return content.replace(/^---\s*\n[\s\S]*?\n---[ \t]*(?:\n|$)/, "");
}

function bodyProblems(words: number): string[] {
  if (words === 0)
    return ["body is empty: say the point of the entry in a few lines"];
  if (words > MAX_BODY_WORDS) {
    return [
      `body is ${words} words; the limit is ${MAX_BODY_WORDS}: keep one subject per entry and split the rest`,
    ];
  }
  return [];
}

/**
 * Read one entry from its text. `epicDir` and `fileName` say where it was
 * found, because the file's place and its `id` and `epic` must agree.
 */
export function parseEntry(
  content: string,
  epicDir: string,
  fileName: string
): ParsedEntry {
  const name = ENTRY_FILE.exec(fileName);
  if (!name) return { entry: null, problems: [NAME_RULE] };
  const fm = parseFrontmatter(content);
  if (!fm) {
    return {
      entry: null,
      problems: [
        "no frontmatter: an entry starts with a --- block (id, epic, from, type, status)",
      ],
    };
  }
  const fieldProblems = [
    ...identityProblems(fm, epicDir, `${epicDir}/${name[1]}`),
    ...enumProblems(fm),
    ...optionalProblems(fm),
  ];
  const words = bodyOf(content).split(/\s+/).filter(Boolean).length;
  const problems = [...fieldProblems, ...bodyProblems(words)];
  if (fieldProblems.length > 0) return { entry: null, problems };
  const refs = Array.isArray(fm.refs) ? fm.refs : [];
  return {
    entry: {
      id: scalar(fm, "id"),
      epic: scalar(fm, "epic"),
      milestone: scalar(fm, "milestone"),
      from: scalar(fm, "from"),
      type: scalar(fm, "type"),
      status: scalar(fm, "status"),
      refs,
      words,
    },
    problems,
  };
}

function direction(entry: ExchangeEntry): string {
  return entry.from === "design" ? "design → code" : "code → design";
}

/**
 * The index as text: one line per open entry (id, type, direction, file and,
 * when set, the milestone). The file is on the line so an agent opens only the
 * entries it needs.
 */
export function renderIndex(scan: ExchangeScan): string {
  const resolved = scan.resolved > 0 ? ` (${scan.resolved} resolved)` : "";
  if (scan.open.length === 0) return `No open design exchanges${resolved}.`;
  const width = (pick: (e: ExchangeEntry) => string): number =>
    Math.max(...scan.open.map((e) => pick(e).length));
  const [idWidth, typeWidth, dirWidth] = [
    width((e) => e.id),
    width((e) => e.type),
    width(direction),
  ];
  const lines = scan.open.map((e) => {
    const milestone = e.milestone === "" ? "" : `  (${e.milestone})`;
    return `  ${e.id.padEnd(idWidth)}  ${e.type.padEnd(typeWidth)}  ${direction(e).padEnd(dirWidth)}  ${e.file}${milestone}`;
  });
  return [
    `Open design exchanges: ${scan.open.length}${resolved}`,
    "",
    ...lines,
  ].join("\n");
}
