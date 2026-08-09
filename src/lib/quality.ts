/**
 * Quality kit (ADR-0005 / ADR-0007, ISS-0107).
 *
 * The executable form of Pillar 3 (Standards). A per-project kit lives in
 * `.lytos/quality/` and holds:
 *   - `kit.md`   — the gate catalog (a markdown table). Each gate is
 *                  stack-agnostic; its `tool` binds it to this project's stack.
 *                  `tiers` says at which risk levels the gate is mandatory —
 *                  the risk matrix (ISS-0114) selects from this.
 *   - `stack.md` — the stack contract: the lockfile (truth for pinned versions),
 *                  the docs source for ground-truth injection, and the allow-list
 *                  of dependencies.
 *
 * A rule that cannot be bound to a machine checker is declared `reviewer` or
 * `human` — never silently enforced.
 *
 * Zero dependencies.
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { parseFrontmatter, type FrontmatterValue } from "./frontmatter.js";

export type GateKind = "gate" | "reviewer" | "human";
export type RiskTier = "low" | "medium" | "high";

export interface QualityGate {
  id: string;
  kind: GateKind;
  tiers: RiskTier[];
  tool: string;
}

export interface StackContract {
  lockfile: string;
  docsSource: string;
  allowedDeps: string[];
}

export interface QualityKit {
  gates: QualityGate[];
  stack: StackContract | null;
}

const KIND_VALUES: GateKind[] = ["gate", "reviewer", "human"];
const TIER_VALUES: RiskTier[] = ["low", "medium", "high"];

const TABLE_ROW = /^\s*\|(.+)\|\s*$/;
const SEPARATOR_ROW = /^\s*\|[\s:|-]+\|\s*$/;

function str(val: FrontmatterValue | undefined): string {
  if (typeof val !== "string") return "";
  return val;
}

/** Split a markdown table row into trimmed cells (drops the outer pipes). */
function cells(line: string): string[] {
  const m = line.match(TABLE_ROW);
  if (!m) return [];
  return m[1].split("|").map((c) => c.trim());
}

/**
 * Parse the gate catalog from `.lytos/quality/kit.md`.
 * Recognizes any markdown table with a header row whose cells are
 * id / kind / tiers / tool (in any case).
 */
export function parseGates(content: string): QualityGate[] {
  const lines = content.split(/\r?\n/);
  const gates: QualityGate[] = [];
  let inTable = false;

  for (const line of lines) {
    if (!TABLE_ROW.test(line)) {
      inTable = false;
      continue;
    }
    if (SEPARATOR_ROW.test(line)) {
      inTable = true; // header seen, data rows follow
      continue;
    }
    const c = cells(line);
    if (c.length < 4) continue;
    // Header row: skip it (the separator flips inTable on).
    if (c[0].toLowerCase() === "id" && c[1].toLowerCase() === "kind") continue;
    if (!inTable) continue;

    const [id, kindRaw, tiersRaw, tool] = c;
    if (!id) continue;
    const kind = kindRaw.toLowerCase() as GateKind;
    const tiers = tiersRaw
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0) as RiskTier[];
    gates.push({ id, kind, tiers, tool });
  }

  return gates;
}

/** Parse the stack contract from `.lytos/quality/stack.md`. */
export function parseStack(content: string): StackContract {
  const fm = parseFrontmatter(content);
  const allowedDeps: string[] = [];
  // "Allowed dependencies" section: collect `- name` bullets under it.
  const lines = content.split(/\r?\n/);
  let inDeps = false;
  for (const line of lines) {
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      inDeps = /allowed dependencies/i.test(heading[1]);
      continue;
    }
    if (!inDeps) continue;
    const bullet = line.match(/^\s*-\s+(.+?)\s*$/);
    if (bullet) allowedDeps.push(bullet[1]);
  }
  return {
    lockfile: fm ? str(fm.lockfile) : "",
    docsSource: fm ? str(fm.docs_source) : "",
    allowedDeps,
  };
}

/** Load the kit from `.lytos/quality/`. Returns null when absent. */
export function loadKit(lytosDir: string): QualityKit | null {
  const dir = join(lytosDir, "quality");
  const kitPath = join(dir, "kit.md");
  if (!existsSync(kitPath)) return null;
  const gates = parseGates(readFileSync(kitPath, "utf-8"));
  const stackPath = join(dir, "stack.md");
  const stack = existsSync(stackPath) ? parseStack(readFileSync(stackPath, "utf-8")) : null;
  return { gates, stack };
}

/** Structural problems in a kit (empty = coherent). */
export function validateKit(kit: QualityKit): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const g of kit.gates) {
    if (seen.has(g.id)) problems.push(`duplicate gate id: ${g.id}`);
    seen.add(g.id);
    if (!KIND_VALUES.includes(g.kind)) problems.push(`gate ${g.id}: invalid kind "${g.kind}" (gate|reviewer|human)`);
    if (g.tiers.length === 0) problems.push(`gate ${g.id}: no risk tiers`);
    for (const t of g.tiers) {
      if (!TIER_VALUES.includes(t)) problems.push(`gate ${g.id}: invalid tier "${t}" (low|medium|high)`);
    }
  }
  return problems;
}

/** Gates mandatory at a given risk level — the seam the risk matrix (ISS-0114) consumes. */
export function gatesForRisk(kit: QualityKit, risk: RiskTier): QualityGate[] {
  return kit.gates.filter((g) => g.tiers.includes(risk));
}

/**
 * The risk tier of an issue (ADR-0007 §1): the `risk` frontmatter field, or
 * `medium` as the safe default when absent or invalid.
 */
export function riskOf(risk: FrontmatterValue | undefined): RiskTier {
  const value = typeof risk === "string" ? (risk.trim().toLowerCase() as RiskTier) : "";
  return TIER_VALUES.includes(value as RiskTier) ? (value as RiskTier) : "medium";
}

/**
 * DoD items may pin a gate: `— verify: auto:secrets-scan`. Returns the referenced
 * gate ids that do NOT resolve to a kit entry (so `lyt doctor` can flag them).
 */
export function unresolvedGateRefs(content: string, kit: QualityKit): string[] {
  const ids = new Set(kit.gates.map((g) => g.id));
  const refs = new Set<string>();
  const re = /verify:\s*auto:([a-z0-9][a-z0-9-]*)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const id = m[1].toLowerCase();
    if (!ids.has(id)) refs.add(id);
  }
  return [...refs];
}
