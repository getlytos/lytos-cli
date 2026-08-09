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
 *   - out-of-scope is declared (a boundary the implementer cannot silently cross).
 *
 * Zero dependencies.
 */

import { analyzeDod } from "./dod.js";
import { riskOf } from "./quality.js";
import type { Frontmatter } from "./frontmatter.js";

export type ReadyGap = "risk-unset" | "dod-not-testable" | "no-out-of-scope";

export interface ReadyAnalysis {
  ready: boolean;
  missing: ReadyGap[];
}

const OUT_OF_SCOPE_RE = /hors[\s-]?(?:du\s+)?scope|out[\s-]?of[\s-]?scope|out\s+of\s+scope/i;

/** Is `risk` explicitly and validly set? (riskOf defaults to medium; here we require it set.) */
function riskExplicitlySet(fm: Frontmatter): boolean {
  const raw = fm.risk;
  if (typeof raw !== "string" || raw.trim() === "") return false;
  return riskOf(raw) === raw.trim().toLowerCase();
}

export function analyzeReady(content: string, fm: Frontmatter): ReadyAnalysis {
  const missing: ReadyGap[] = [];

  if (!riskExplicitlySet(fm)) missing.push("risk-unset");
  if (!analyzeDod(content).loopEligible) missing.push("dod-not-testable");
  if (!OUT_OF_SCOPE_RE.test(content)) missing.push("no-out-of-scope");

  return { ready: missing.length === 0, missing };
}
