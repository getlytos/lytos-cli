/**
 * Loop-eligible issue selection (ADR-0004 §1, ISS-0099).
 *
 * The sprint (`2-sprint/`) is the loop perimeter — the human's upstream gate.
 * Within it, an issue is loop-eligible only when:
 *   - all its `depends` (and child issues, expressed as deps) are done, AND
 *   - its Definition of done holds at least one machine-verifiable item.
 *
 * An issue whose DoD is entirely `verify: human` (or has no DoD) is not loop
 * work: `lyt next` refuses it and explains, leaving it for a human.
 *
 * Read-only. Deterministic order: priority, then id.
 * Zero dependencies.
 */

import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { parseFrontmatter, type FrontmatterValue } from "./frontmatter.js";
import { analyzeDod, type DodAnalysis } from "./dod.js";
import { findIssueFile } from "./show.js";

export interface NextCandidate {
  id: string;
  title: string;
  priority: string;
  effort: string;
  branch: string;
  file: string;
  dod: DodAnalysis;
}

export type BlockedReason = "deps-pending" | "all-human-dod" | "no-dod";

export interface NextBlocked {
  id: string;
  title: string;
  reason: BlockedReason;
  detail: string;
}

export interface NextResult {
  pick: NextCandidate | null;
  eligible: NextCandidate[];
  blocked: NextBlocked[];
}

const PRIORITY_RANK: Record<string, number> = {
  "P0-critical": 0,
  "P1-high": 1,
  "P2-normal": 2,
  "P3-low": 3,
};

function str(val: FrontmatterValue | undefined): string {
  if (val === undefined) return "";
  if (Array.isArray(val)) return val.join(", ");
  if (typeof val === "object") return "";
  return val;
}

/** Are all of an issue's dependencies (and child issues) done? */
function pendingDeps(lytosDir: string, depends: FrontmatterValue | undefined): string[] {
  if (!Array.isArray(depends) || depends.length === 0) return [];
  const pending: string[] = [];
  for (const depId of depends) {
    if (!depId) continue;
    const found = findIssueFile(lytosDir, depId);
    if (!found || found.dir !== "5-done") pending.push(depId);
  }
  return pending;
}

/**
 * Select the next loop-eligible issue from the sprint.
 */
export function selectNext(lytosDir: string): NextResult {
  const sprintDir = join(lytosDir, "issue-board", "2-sprint");
  const eligible: NextCandidate[] = [];
  const blocked: NextBlocked[] = [];

  if (!existsSync(sprintDir)) {
    return { pick: null, eligible, blocked };
  }

  const files = readdirSync(sprintDir).filter((f) => f.startsWith("ISS-") && f.endsWith(".md"));

  for (const file of files) {
    const content = readFileSync(join(sprintDir, file), "utf-8");
    const fm = parseFrontmatter(content);
    if (!fm) continue;

    const id = str(fm.id);
    const title = str(fm.title);
    const dod = analyzeDod(content);

    // Structural ineligibility first (never loop work), then temporary (deps).
    if (!dod.hasDod) {
      blocked.push({ id, title, reason: "no-dod", detail: "no Definition of done to gate the work" });
      continue;
    }
    if (!dod.loopEligible) {
      blocked.push({ id, title, reason: "all-human-dod", detail: "DoD is 100% verify: human — for a human, not the loop" });
      continue;
    }
    const pending = pendingDeps(lytosDir, fm.depends);
    if (pending.length > 0) {
      blocked.push({ id, title, reason: "deps-pending", detail: `waiting on ${pending.join(", ")}` });
      continue;
    }

    eligible.push({
      id,
      title,
      priority: str(fm.priority),
      effort: str(fm.effort),
      branch: str(fm.branch),
      file,
      dod,
    });
  }

  eligible.sort((a, b) => {
    const ra = PRIORITY_RANK[a.priority] ?? 9;
    const rb = PRIORITY_RANK[b.priority] ?? 9;
    if (ra !== rb) return ra - rb;
    return a.id.localeCompare(b.id);
  });

  return { pick: eligible[0] ?? null, eligible, blocked };
}
