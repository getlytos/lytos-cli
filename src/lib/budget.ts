/**
 * Budget guard (ADR-0004 §8, ISS-0102).
 *
 * A loop needs a numeric stop condition. The schema v2 cost fields (`cost_usd`)
 * already exist (ADR-0001) — this aggregates them over the current pipeline and
 * compares to a ceiling. The CLI does not run the loop; it exposes the measure
 * for a wrapper / CI to read (non-zero exit when the ceiling is breached).
 *
 * Scope: the in-flight pipeline (2-sprint, 3-in-progress, 4-review, parked) —
 * what the current cycle is spending. `all` widens it to the whole board.
 * Zero dependencies.
 */

import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { parseFrontmatter, type FrontmatterValue } from "./frontmatter.js";

const PIPELINE_DIRS = ["2-sprint", "3-in-progress", "4-review", "parked"];
const ALL_DIRS = ["0-icebox", "1-backlog", ...PIPELINE_DIRS, "5-done"];

export interface BudgetReport {
  scope: string[];
  issues: number;
  costUsd: number;
  maxUsd: number | null;
  maxIssues: number | null;
  overBudget: boolean;
  hasCeiling: boolean;
  breaches: string[];
}

function num(val: FrontmatterValue | undefined): number {
  if (typeof val !== "string" || val.trim() === "") return 0;
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

/** Round to cents to avoid float noise in the reported total. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeBudget(
  lytosDir: string,
  opts: { maxUsd?: number | null; maxIssues?: number | null; all?: boolean }
): BudgetReport {
  const scope = opts.all ? ALL_DIRS : PIPELINE_DIRS;
  const boardDir = join(lytosDir, "issue-board");

  let issues = 0;
  let costUsd = 0;

  for (const dir of scope) {
    const dirPath = join(boardDir, dir);
    if (!existsSync(dirPath)) continue;
    const files = readdirSync(dirPath).filter(
      (f) => f.startsWith("ISS-") && f.endsWith(".md")
    );
    for (const file of files) {
      const fm = parseFrontmatter(readFileSync(join(dirPath, file), "utf-8"));
      if (!fm) continue;
      issues++;
      costUsd += num(fm.cost_usd);
    }
  }

  costUsd = round2(costUsd);

  const maxUsd = opts.maxUsd ?? null;
  const maxIssues = opts.maxIssues ?? null;
  const hasCeiling = maxUsd !== null || maxIssues !== null;

  const breaches: string[] = [];
  if (maxUsd !== null && costUsd > maxUsd) {
    breaches.push(
      `cost $${costUsd.toFixed(2)} exceeds ceiling $${maxUsd.toFixed(2)}`
    );
  }
  if (maxIssues !== null && issues > maxIssues) {
    breaches.push(`${issues} issues exceed ceiling of ${maxIssues}`);
  }

  return {
    scope,
    issues,
    costUsd,
    maxUsd,
    maxIssues,
    overBudget: breaches.length > 0,
    hasCeiling,
    breaches,
  };
}

/**
 * Read `budget_usd:` / `budget_issues:` from sprint.md (flags override these).
 */
export function readSprintCeiling(lytosDir: string): {
  maxUsd: number | null;
  maxIssues: number | null;
} {
  const sprintPath = join(lytosDir, "sprint.md");
  if (!existsSync(sprintPath)) return { maxUsd: null, maxIssues: null };
  const content = readFileSync(sprintPath, "utf-8");
  const usd = content.match(
    /budget[_ ]?usd\s*[:=]\s*\$?([0-9]+(?:\.[0-9]+)?)/i
  );
  const iss = content.match(/budget[_ ]?issues\s*[:=]\s*([0-9]+)/i);
  return {
    maxUsd: usd ? Number(usd[1]) : null,
    maxIssues: iss ? Number(iss[1]) : null,
  };
}
