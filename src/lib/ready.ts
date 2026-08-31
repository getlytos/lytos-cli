/**
 * Definition of Ready (ADR-0007 §3, ISS-0115).
 *
 * The upstream twin of the DoD: an issue enters the loop only when it is *ready*.
 * Park-on-ambiguity (ADR-0004 §3) is reactive — it halts after tokens are spent
 * hitting ambiguity. Readiness shifts that left: refuse under-specified work before
 * the loop starts.
 *
 * Minimal, machine-checkable, non-bureaucratic — three criteria:
 *   - `risk` is explicitly set (thinking about blast radius is a prerequisite;
 *     note the distinction with gate resolution, where a missing risk safely
 *     defaults to medium — for *entry*, we require it stated);
 *   - the DoD is machine-verifiable (≥1 auto item, via analyzeDod);
 *   - out-of-scope is declared **inside the `## Ready` section** (a boundary the
 *     implementer cannot silently cross — it only counts where it is binding,
 *     not as a passing mention in the context or a note).
 *
 * Zero dependencies.
 */

import { analyzeDod } from "./dod.js";
import { riskOf } from "./quality.js";
import type { Frontmatter } from "./frontmatter.js";

export type ReadyGap =
  | "risk-unset"
  | "dod-not-testable"
  | "no-out-of-scope"
  | "no-scope"
  | "no-constraints";

export interface ReadyAnalysis {
  ready: boolean;
  missing: ReadyGap[];
}

const OUT_OF_SCOPE_LABEL =
  /^\*{0,2}(?:hors[\s-]?(?:du\s+)?scope|out[\s-]?of[\s-]?scope)\*{0,2}/i;
const SCOPE_LABEL = /^\*{0,2}scope\*{0,2}/i;
const CONSTRAINTS_LABEL = /^\*{0,2}constraints?\*{0,2}/i;
const HEADING_RE = /^(#{1,6})[ \t]+(.*)$/;
const READY_HEADING_RE = /^ready\b/i;

/**
 * Efforts small enough that the two-line Ready is the whole form.
 *
 * The rule the templates already state: `issue-feature.md` asks for scope,
 * constraints and out-of-scope; `issue-task.md` asks for out-of-scope alone,
 * because "a task is small, so its Ready is small: two lines, not a form".
 * default-rules.md says the same in prose — *"keep it proportional: on an XS
 * task, Ready is two lines"* — and nothing enforced it.
 *
 * An unstated `effort` gets the full form. Same stance as `risk` above: for
 * *entry*, an unstated field is not a licence to ask for less.
 */
const SMALL_EFFORTS = new Set(["xs", "s"]);

/**
 * The body of the `## Ready` section, or "" when the issue has none.
 *
 * Searching the whole fiche was the original defect (ISS-0115 audit, 2026-08-12):
 * a stray "out of scope" in the context or a note made an issue *look* ready
 * without any boundary having been declared where the implementer reads it. The
 * declaration only counts where it is binding.
 */
function readySection(content: string): string {
  const body: string[] = [];
  // 0 = outside. Otherwise the heading level that opened the section: only a
  // heading at that level or above closes it. Stopping at *every* heading — the
  // original behaviour — meant a `### Out of scope` subheading ended the section
  // that was about to declare it, and the fiche read as not-ready for having
  // been more structured, not less.
  let level = 0;
  for (const line of content.split(/\r?\n/)) {
    const heading = line.match(HEADING_RE);
    if (heading) {
      const depth = heading[1].length;
      const isReady = READY_HEADING_RE.test(heading[2].trim());
      if (level === 0) level = isReady ? depth : 0;
      else if (depth <= level) level = isReady ? depth : 0;
      continue;
    }
    if (level > 0) body.push(line);
  }
  return body.join("\n");
}

/**
 * Does the Ready section declare `label`, **with a value**?
 *
 * A bare `Out of scope:` used to satisfy the criterion: the words were present,
 * the boundary was not. The label has to open the line — so a passing mention
 * inside a sentence does not count — and something has to follow it.
 */
function declares(section: string, label: RegExp): boolean {
  for (const raw of section.split(/\r?\n/)) {
    const line = raw.replace(/^\s*[-*+]\s+/, "").trim();
    const match = line.match(label);
    if (!match) continue;
    // What is left once the label's own punctuation is gone. Emphasis marks are
    // stripped for the emptiness test only: `- **Out of scope:**` leaves `:**`,
    // and two asterisks are not a declared boundary.
    const rest = line
      .slice(match[0].length)
      .replace(/^\s*[*_]+/, "")
      .replace(/^\s*[—–:-]+\s*/, "")
      .replace(/[*_`]/g, "")
      .trim();
    if (rest.length > 0) return true;
  }
  return false;
}

/** The Ready form this issue owes, by `effort` (ADR-0007 §3: proportional). */
function needsFullForm(fm: Frontmatter): boolean {
  const effort =
    typeof fm.effort === "string" ? fm.effort.trim().toLowerCase() : "";
  return !SMALL_EFFORTS.has(effort);
}

/** Is `risk` explicitly and validly set? (riskOf defaults to medium; here we require it set.) */
function riskExplicitlySet(fm: Frontmatter): boolean {
  const raw = fm.risk;
  if (typeof raw !== "string" || raw.trim() === "") return false;
  return riskOf(raw) === raw.trim().toLowerCase();
}

export function analyzeReady(content: string, fm: Frontmatter): ReadyAnalysis {
  const missing: ReadyGap[] = [];
  const section = readySection(content);

  if (!riskExplicitlySet(fm)) missing.push("risk-unset");
  if (!analyzeDod(content).loopEligible) missing.push("dod-not-testable");
  if (!declares(section, OUT_OF_SCOPE_LABEL)) missing.push("no-out-of-scope");

  // Scope and constraints are Ready criteria in default-rules.md and in the
  // feature template, and were never checked: an issue with neither was
  // loop-eligible. They are asked of the sizes that can afford them.
  if (needsFullForm(fm)) {
    if (!declares(section, SCOPE_LABEL)) missing.push("no-scope");
    if (!declares(section, CONSTRAINTS_LABEL)) missing.push("no-constraints");
  }

  return { ready: missing.length === 0, missing };
}
