/**
 * Review packet (ADR-0004 §7, ISS-0103).
 *
 * The autopilot → pilot interface, assembled per issue for the human gate at
 * `4-review`. Designed to RESIST rubber-stamping: doubt goes first (parks,
 * pending gates, the human checklist, the reviewer verdict), the green evidence
 * is relegated to the end. Composes everything the loop already produced —
 * the DoD verification modes (ISS-0101), parks (ISS-0100), the risk→gate matrix
 * (ISS-0114), and the schema-v2 audit (ADR-0001).
 *
 * Zero dependencies (git is used defensively — absent git degrades gracefully).
 */

import { execFileSync } from "child_process";
import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { analyzeDod, type DodItem } from "./dod.js";
import { loadKit, gatesForRisk, riskOf, type QualityGate } from "./quality.js";
import { computeBudget, readSprintCeiling, type BudgetReport } from "./budget.js";
import { parseFrontmatter } from "./frontmatter.js";
import type { IssueLocation } from "./issue-ops.js";
import type { FrontmatterValue } from "./frontmatter.js";

export interface ReviewPacket {
  id: string;
  title: string;
  status: string;
  risk: string;
  parked: { reason: string; at: string } | null;
  verdict: string;
  human: DodItem[];       // verify: human — the review checklist
  autoPending: DodItem[]; // machine items not yet green — these block
  autoDone: DodItem[];
  requiredGates: QualityGate[];
  audit: {
    assignee: string;
    reviewer: string;
    model: string;
    costUsd: string;
    tokensIn: string;
    tokensOut: string;
  };
  changes: { commits: { sha: string; subject: string }[]; files: string[] };
}

function str(val: FrontmatterValue | undefined): string {
  if (typeof val === "string") return val;
  return "";
}

function nested(val: FrontmatterValue | undefined, key: string): string {
  if (val && typeof val === "object" && !Array.isArray(val)) {
    const v = (val as Record<string, string>)[key];
    return typeof v === "string" ? v : "";
  }
  return "";
}

/** Commits + files touched for an issue, via `Refs: ISS-XXXX`. Empty on any git failure. */
function gitChanges(issueId: string): { commits: { sha: string; subject: string }[]; files: string[] } {
  try {
    const raw = execFileSync(
      "git",
      ["log", `--grep=Refs: ${issueId}`, "--pretty=format:%h%x1f%s"],
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    ).trim();
    if (!raw) return { commits: [], files: [] };
    const commits = raw.split("\n").map((l) => {
      const [sha, subject] = l.split("\x1f");
      return { sha, subject: subject ?? "" };
    });
    const files = new Set<string>();
    for (const c of commits) {
      const names = execFileSync("git", ["show", "--name-only", "--pretty=format:", c.sha], {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
      for (const f of names.split("\n").filter(Boolean)) files.add(f);
    }
    return { commits, files: [...files] };
  } catch {
    return { commits: [], files: [] };
  }
}

/** Build the review packet for a located issue. */
export function buildPacket(lytosDir: string, issue: IssueLocation): ReviewPacket {
  const fm = issue.frontmatter;
  const id = str(fm.id);
  const risk = riskOf(fm.risk);
  const dod = analyzeDod(issue.content);

  const human = dod.items.filter((i) => i.verify === "human");
  const autoDone = dod.items.filter((i) => i.verify !== "human" && i.done);
  const autoPending = dod.items.filter((i) => i.verify !== "human" && !i.done);

  const kit = loadKit(lytosDir);
  const requiredGates = kit ? gatesForRisk(kit, risk) : [];

  const parked =
    issue.dir === "parked" || str(fm.park_reason)
      ? { reason: str(fm.park_reason), at: str(fm.parked_at) }
      : null;

  return {
    id,
    title: str(fm.title),
    status: issue.dir,
    risk,
    parked,
    verdict: str(fm.review) || "none",
    human,
    autoPending,
    autoDone,
    requiredGates,
    audit: {
      assignee: str(fm.assignee),
      reviewer: str(fm.reviewer),
      model: nested(fm.ai_implementer, "model"),
      costUsd: str(fm.cost_usd),
      tokensIn: str(fm.tokens_in),
      tokensOut: str(fm.tokens_out),
    },
    changes: gitChanges(id),
  };
}

/** Render the packet as markdown — doubt first, green last. */
export function renderPacket(p: ReviewPacket): string {
  const out: string[] = [];
  out.push(`# Review packet — ${p.id}: ${p.title}`);
  out.push(`*status ${p.status} · risk ${p.risk} · verdict ${p.verdict}*`);
  out.push("");

  // ── Doubt first ──────────────────────────────────────────────
  out.push("## ⚠ Decide first");
  let hasDoubt = false;
  if (p.parked) {
    hasDoubt = true;
    out.push(`- **Parked**: ${p.parked.reason}${p.parked.at ? ` (since ${p.parked.at})` : ""}`);
  }
  if (p.verdict === "no-go" || p.verdict === "pending" || p.verdict === "go-pending-human") {
    hasDoubt = true;
    const gloss = p.verdict === "go-pending-human" ? " — gates green, your judgment still owed" : "";
    out.push(`- **Reviewer verdict**: ${p.verdict}${gloss}`);
  }
  if (p.autoPending.length > 0) {
    hasDoubt = true;
    out.push(`- **Gates not green** (${p.autoPending.length}):`);
    for (const i of p.autoPending) out.push(`  - [ ] ${i.text}`);
  }
  if (p.human.length > 0) {
    hasDoubt = true;
    out.push(`- **Human checklist** (${p.human.length}) — your judgment, not a gate:`);
    for (const i of p.human) out.push(`  - [${i.done ? "x" : " "}] ${i.text}`);
  }
  out.push("- **Free look**: what is NOT covered here? Look beyond the checklist.");
  if (!hasDoubt) out.push("*(no park, no pending gate, no reviewer objection — still do the free look)*");
  out.push("");

  // ── Changes ──────────────────────────────────────────────────
  out.push("## Changes");
  if (p.changes.commits.length === 0) out.push("*(no commits found for this issue)*");
  for (const c of p.changes.commits) out.push(`- \`${c.sha}\` ${c.subject}`);
  if (p.changes.files.length > 0) {
    out.push("");
    out.push(`Files (${p.changes.files.length}): ${p.changes.files.map((f) => `\`${f}\``).join(", ")}`);
  }
  out.push("");

  // ── Green evidence (last, on purpose) ────────────────────────
  out.push("## Evidence (green)");
  out.push(`- Gates required at risk **${p.risk}** (${p.requiredGates.length}): ${p.requiredGates.map((g) => g.id).join(", ") || "—"}`);
  out.push(`- Machine DoD items done: ${p.autoDone.length}/${p.autoDone.length + p.autoPending.length}`);
  out.push("");

  // ── Audit ────────────────────────────────────────────────────
  out.push("## Audit");
  const a = p.audit;
  out.push(`- implementer: ${a.model || "—"} · reviewer: ${a.reviewer || "—"} · assignee: ${a.assignee || "—"}`);
  out.push(`- cost: ${a.costUsd || "—"} USD · tokens: ${a.tokensIn || "—"} in / ${a.tokensOut || "—"} out`);

  return out.join("\n") + "\n";
}

// ─────────────────────────────────────────────────────────────────
// Sprint report (ADR-0004 §7, ISS-0105) — the aggregate of packets.
// ─────────────────────────────────────────────────────────────────

const PIPELINE = ["2-sprint", "3-in-progress", "4-review"];

export interface SprintReport {
  counts: Record<string, number>;
  parkedByReason: Record<string, number>;
  pendingHumanChecklists: number;
  coverage: { done: number; total: number; pct: number };
  budget: BudgetReport;
}

/** Aggregate the in-flight pipeline + parked into a sprint-level view. */
export function buildSprintReport(lytosDir: string): SprintReport {
  const boardDir = join(lytosDir, "issue-board");
  const counts: Record<string, number> = { "2-sprint": 0, "3-in-progress": 0, "4-review": 0, parked: 0 };
  const parkedByReason: Record<string, number> = {};
  let pendingHuman = 0;
  let done = 0;
  let total = 0;

  for (const dir of [...PIPELINE, "parked"]) {
    const dirPath = join(boardDir, dir);
    if (!existsSync(dirPath)) continue;
    for (const file of readdirSync(dirPath).filter((f) => f.startsWith("ISS-") && f.endsWith(".md"))) {
      const content = readFileSync(join(dirPath, file), "utf-8");
      const fm = parseFrontmatter(content);
      counts[dir] = (counts[dir] ?? 0) + 1;
      if (dir === "parked" && fm) {
        const reason = str(fm.park_reason) || "unspecified";
        parkedByReason[reason] = (parkedByReason[reason] ?? 0) + 1;
      }
      const dod = analyzeDod(content);
      pendingHuman += dod.items.filter((i) => i.verify === "human" && !i.done).length;
      done += dod.autoDone;
      total += dod.machine;
    }
  }

  const ceiling = readSprintCeiling(lytosDir);
  const budget = computeBudget(lytosDir, { maxUsd: ceiling.maxUsd, maxIssues: ceiling.maxIssues });

  return {
    counts,
    parkedByReason,
    pendingHumanChecklists: pendingHuman,
    coverage: { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 },
    budget,
  };
}

/** Render the sprint report as markdown — parked/pending first, then the totals. */
export function renderSprintReport(r: SprintReport): string {
  const out: string[] = [];
  out.push("# Sprint report");
  out.push("");
  out.push("## ⚠ Decide first");
  const parkedEntries = Object.entries(r.parkedByReason);
  if (parkedEntries.length > 0) {
    out.push(`- **Parked** (${r.counts.parked}):`);
    for (const [reason, n] of parkedEntries) out.push(`  - ${reason}: ${n}`);
  }
  out.push(`- **Human checklists pending**: ${r.pendingHumanChecklists}`);
  if (r.budget.overBudget) for (const b of r.budget.breaches) out.push(`- **Over budget**: ${b}`);
  out.push("");
  out.push("## Flow");
  out.push(`- sprint ${r.counts["2-sprint"]} · in-progress ${r.counts["3-in-progress"]} · review ${r.counts["4-review"]} · parked ${r.counts.parked}`);
  out.push("");
  out.push("## Evidence (green)");
  out.push(`- Machine DoD coverage: ${r.coverage.done}/${r.coverage.total} (${r.coverage.pct}%)`);
  out.push(`- Budget: $${r.budget.costUsd.toFixed(2)} over ${r.budget.issues} issue(s)${r.budget.hasCeiling ? "" : " (no ceiling set)"}`);
  return out.join("\n") + "\n";
}
