/**
 * Absorb the AI-wrapper session journal into an issue's schema v2 audit fields
 * (phase 4 of schema v2 — see ADR-0003 for the contract).
 *
 * Pure and dependency-free: parsing and aggregation take strings/objects, so
 * the logic is unit-testable against synthetic journal lines with no real AI
 * wrapper and no filesystem. The command wires the file I/O.
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { type Frontmatter } from "./frontmatter.js";

/** Journal location, relative to the .lytos/ directory. */
export const JOURNAL_RELPATH = ".runtime/session.jsonl";

export type JournalRole = "implementer" | "reviewer";

/** One journal line. Every field is optional; unknown keys are ignored. */
export interface JournalLine {
  issue?: string;
  role?: JournalRole;
  model?: string;
  session?: string;
  prompt_ref?: string;
  tokens_in?: number;
  tokens_out?: number;
  cost_usd?: number;
  skills?: string[];
  ts?: string;
}

export interface ParsedJournal {
  lines: JournalLine[];
  malformed: number;
}

export interface AbsorbResult {
  issue: string;
  /** Frontmatter fields to set (SET semantics — see ADR-0003). */
  delta: Frontmatter;
  /** Journal lines attributed to this issue. */
  linesUsed: number;
  /** Lines that failed to parse as JSON objects. */
  malformed: number;
}

const ROLE_FIELD: Record<JournalRole, string> = {
  implementer: "ai_implementer",
  reviewer: "ai_reviewer",
};

/** Read the journal for a .lytos/ dir, or null when it doesn't exist. */
export function readJournal(lytosDir: string): string | null {
  const path = join(lytosDir, JOURNAL_RELPATH);
  return existsSync(path) ? readFileSync(path, "utf-8") : null;
}

/**
 * Parse JSON Lines. Blank lines are ignored; lines that aren't a JSON object
 * are skipped and counted — a buggy wrapper must never make absorb fail.
 */
export function parseJournal(content: string): ParsedJournal {
  const lines: JournalLine[] = [];
  let malformed = 0;

  for (const raw of content.split("\n")) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed);
      if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        lines.push(obj as JournalLine);
      } else {
        malformed++;
      }
    } catch {
      malformed++;
    }
  }

  return { lines, malformed };
}

function roundCost(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/**
 * Aggregate journal lines into a frontmatter delta for one issue. A line belongs
 * to the issue when its `issue` matches (case-insensitive) or is absent.
 */
export function aggregate(lines: JournalLine[], issueId: string): { delta: Frontmatter; linesUsed: number } {
  const target = issueId.toUpperCase();
  const relevant = lines.filter(
    (l) => !l.issue || l.issue.toUpperCase() === target
  );

  let tokensIn = 0;
  let tokensOut = 0;
  let cost = 0;
  let hasTokensIn = false;
  let hasTokensOut = false;
  let hasCost = false;
  const skills = new Set<string>();
  const roles: Partial<Record<JournalRole, { model?: string; session?: string; prompt_ref?: string }>> = {};

  for (const line of relevant) {
    if (typeof line.tokens_in === "number") { tokensIn += line.tokens_in; hasTokensIn = true; }
    if (typeof line.tokens_out === "number") { tokensOut += line.tokens_out; hasTokensOut = true; }
    if (typeof line.cost_usd === "number") { cost += line.cost_usd; hasCost = true; }
    if (Array.isArray(line.skills)) {
      for (const s of line.skills) if (typeof s === "string" && s) skills.add(s);
    }

    const role = line.role === "reviewer" ? "reviewer" : line.role === "implementer" ? "implementer" : null;
    if (role) {
      const acc = roles[role] ?? (roles[role] = {});
      if (line.model) acc.model = line.model;
      if (line.session) acc.session = line.session;
      if (line.prompt_ref) acc.prompt_ref = line.prompt_ref;
    }
  }

  const delta: Frontmatter = {};

  for (const role of Object.keys(roles) as JournalRole[]) {
    const acc = roles[role]!;
    const obj: { [k: string]: string } = {};
    if (acc.model) obj.model = acc.model;
    if (acc.session) obj.session = acc.session;
    if (acc.prompt_ref) obj.prompt_ref = acc.prompt_ref;
    if (Object.keys(obj).length > 0) delta[ROLE_FIELD[role]] = obj;
  }

  if (hasTokensIn) delta.tokens_in = String(tokensIn);
  if (hasTokensOut) delta.tokens_out = String(tokensOut);
  if (hasCost) delta.cost_usd = String(roundCost(cost));
  if (skills.size > 0) delta.skills_used = [...skills].sort();

  return { delta, linesUsed: relevant.length };
}

/**
 * Compute the absorb result for an issue from raw journal content. Pure: does
 * not read or write any file.
 */
export function absorbPlan(journalContent: string, issueId: string): AbsorbResult {
  const { lines, malformed } = parseJournal(journalContent);
  const { delta, linesUsed } = aggregate(lines, issueId);
  return { issue: issueId, delta, linesUsed, malformed };
}
