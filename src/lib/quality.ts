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
import { dodSection } from "./dod.js";

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

/** True for the gate catalog's header row: id | kind | tiers | tool. */
function isGateHeader(cells: string[]): boolean {
  if (cells.length < 4) return false;
  const [id, kind, tiers, tool] = cells.map((c) => c.toLowerCase());
  return id === "id" && kind === "kind" && tiers === "tiers" && tool === "tool";
}

/**
 * Parse the gate catalog from `.lytos/quality/kit.md`.
 *
 * Only a table introduced by the exact `id | kind | tiers | tool` header is a
 * catalog. The file is documentation as much as data — anchoring on the header
 * is what lets a project add explanatory tables to its kit without them being
 * read as gates.
 */
export function parseGates(content: string): QualityGate[] {
  const lines = content.split(/\r?\n/);
  const gates: QualityGate[] = [];
  let inTable = false;
  let previousRow: string[] = [];

  for (const line of lines) {
    if (!TABLE_ROW.test(line)) {
      inTable = false;
      previousRow = [];
      continue;
    }
    if (SEPARATOR_ROW.test(line)) {
      inTable = isGateHeader(previousRow);
      continue;
    }
    const c = cells(line);
    previousRow = c;
    if (!inTable) continue;
    if (c.length < 4) continue;

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
  const stack = existsSync(stackPath)
    ? parseStack(readFileSync(stackPath, "utf-8"))
    : null;
  return { gates, stack };
}

/**
 * A placeholder left by `lyt init` — the scaffold ships `<list your runtime
 * dependencies here…>` so the section is not empty. An angle-bracketed bullet
 * is nobody's package name, and treating it as one would allow-list a sentence.
 */
function isPlaceholder(entry: string): boolean {
  return /^<.*>$/.test(entry.trim());
}

/**
 * The package name a bullet declares.
 *
 * The allow-list is documentation as much as data: `- commander — the CLI
 * framework (manifest)` must resolve to `commander`. Take the first token,
 * unwrap backticks, and let anything else stay whatever it is — a bullet that
 * does not name a package will simply never match one.
 */
function depName(entry: string): string {
  const first = entry.trim().split(/[\s—(,]/)[0] ?? "";
  return first.replace(/^`|`$/g, "").trim();
}

/**
 * Structural problems in the stack contract (empty = coherent).
 *
 * ISS-0107 shipped `stack.md` with a documented promise — *"the allow-list
 * below gates new dependencies (a new dep needs an ADR, not a silent add)"* —
 * and `parseStack()` read the file into a struct nothing ever consulted. A
 * contract that is parsed and then ignored is the same failure as a rule with
 * no tool binding: it looks enforced. This function and `unlistedDependencies()`
 * are what make the file mean something.
 */
export function validateStack(stack: StackContract | null): string[] {
  if (!stack) return [];
  const problems: string[] = [];
  if (!stack.lockfile.trim())
    problems.push(
      "no `lockfile:` declared — the contract calls the lockfile the truth for pinned versions, and names no file"
    );
  if (!stack.docsSource.trim())
    problems.push(
      "no `docs_source:` declared — ADR-0005 §3 needs somewhere to inject ground-truth API docs from"
    );
  const real = stack.allowedDeps.filter((d) => !isPlaceholder(d));
  if (stack.allowedDeps.length === 0)
    problems.push(
      "empty allow-list — every dependency is then unlisted, so the dependency gate can only ever say no"
    );
  else if (real.length === 0)
    problems.push(
      "the allow-list still holds only the `lyt init` placeholder — nothing is actually allow-listed"
    );
  return problems;
}

/**
 * Runtime dependencies the stack contract does not allow.
 *
 * Runtime only, deliberately: `stack.md` allow-lists what *ships*. Dev
 * dependencies are the build toolchain, they follow the deps-audit gate
 * (`npm audit --omit=dev`, ISS-0136), and allow-listing eight of them would be
 * the bureaucracy ADR-0007 exists to prevent.
 *
 * Returns `[]` — not a complaint — when the project is not npm-shaped. The kit
 * is language-agnostic by design; this check is the npm implementation of it,
 * and a Rust or Python project simply has none yet. Silence beats a warning
 * nobody can act on.
 */
export function unlistedDependencies(
  projectRoot: string,
  stack: StackContract | null
): string[] {
  if (!stack) return [];
  const pkgPath = join(projectRoot, "package.json");
  if (!existsSync(pkgPath)) return [];

  let deps: string[];
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
      dependencies?: Record<string, string>;
    };
    deps = Object.keys(pkg.dependencies ?? {});
  } catch {
    // A package.json that does not parse is npm's problem to report, not the
    // quality kit's — and guessing at its dependencies would be worse.
    return [];
  }

  const allowed = new Set(
    stack.allowedDeps
      .filter((d) => !isPlaceholder(d))
      .map((d) => depName(d))
      .filter((d) => d.length > 0)
  );
  return deps.filter((d) => !allowed.has(d));
}

/** Structural problems in a kit (empty = coherent). */
export function validateKit(kit: QualityKit): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const g of kit.gates) {
    if (seen.has(g.id)) problems.push(`duplicate gate id: ${g.id}`);
    seen.add(g.id);
    if (!KIND_VALUES.includes(g.kind))
      problems.push(
        `gate ${g.id}: invalid kind "${g.kind}" (gate|reviewer|human)`
      );
    if (g.tiers.length === 0) problems.push(`gate ${g.id}: no risk tiers`);
    for (const t of g.tiers) {
      if (!TIER_VALUES.includes(t))
        problems.push(`gate ${g.id}: invalid tier "${t}" (low|medium|high)`);
    }
    // "A rule with no `tool` binding is not a rule — it is a wish" (method/quality/kit.md).
    // A `gate` binds to a command; `reviewer`/`human` bind to a `rubric:`/`checklist:` pointer.
    // Either way the column must say *what* decides the rule, or the row only looks enforced.
    if (!g.tool.trim())
      problems.push(
        `gate ${g.id}: no tool binding (a gate with no checker is a wish)`
      );
  }
  return problems;
}

/** Gates mandatory at a given risk level — the seam the risk matrix (ISS-0114) consumes. */
export function gatesForRisk(kit: QualityKit, risk: RiskTier): QualityGate[] {
  return kit.gates.filter((g) => g.tiers.includes(risk));
}

/**
 * The ADR-0007 floor: the gates mandatory at `low`, therefore mandatory everywhere.
 *
 * A project tunes its kit freely ABOVE this line — dropping `ds-conformance` from a
 * project with no UI is the proportionality the matrix exists for. It may not go
 * below it: "a project may only tighten — never loosen below `low`" (ISS-0114).
 * Mirrors the `low` rows of `method/quality/kit.md`.
 */
const BASELINE_LOW: readonly string[] = [
  "tests-unit",
  "typecheck",
  "lint",
  "secrets-scan",
  "build-reproducible",
  "doc-L0",
];

/** Kind strength — a baseline gate may not be downgraded to a softer kind. */
const KIND_STRENGTH: Record<GateKind, number> = {
  gate: 3,
  reviewer: 2,
  human: 1,
};

/**
 * Ways a project kit loosens the ADR-0007 floor (empty = the contract holds).
 *
 * Without this, `gatesForRisk` returns whatever tiers a project wrote and the
 * "tighten-only" contract lives in prose alone.
 */
export function baselineViolations(kit: QualityKit): string[] {
  const violations: string[] = [];
  const byId = new Map(kit.gates.map((g) => [g.id, g]));

  for (const id of BASELINE_LOW) {
    const gate = byId.get(id);
    if (!gate) {
      violations.push(
        `baseline gate "${id}" is missing — mandatory at every risk tier`
      );
      continue;
    }
    const dropped = TIER_VALUES.filter((t) => !gate.tiers.includes(t));
    if (dropped.length > 0) {
      violations.push(
        `baseline gate "${id}" no longer applies at ${dropped.join(", ")} — a project may tighten the floor, never loosen it`
      );
    }
    if (KIND_STRENGTH[gate.kind] < KIND_STRENGTH.gate) {
      violations.push(
        `baseline gate "${id}" was downgraded to "${gate.kind}" — it must stay a machine gate`
      );
    }
  }

  return violations;
}

/**
 * The risk tier of an issue (ADR-0007 §1): the `risk` frontmatter field, or
 * `medium` as the safe default when absent or invalid.
 */
export function riskOf(risk: FrontmatterValue | undefined): RiskTier {
  const value =
    typeof risk === "string" ? (risk.trim().toLowerCase() as RiskTier) : "";
  return TIER_VALUES.includes(value as RiskTier)
    ? (value as RiskTier)
    : "medium";
}

/**
 * DoD items may pin a gate: `— verify: auto:secrets-scan`. Returns the referenced
 * gate ids that do NOT resolve to a kit entry (so `lyt doctor` can flag them).
 */
export function unresolvedGateRefs(content: string, kit: QualityKit): string[] {
  // Both sides are lowercased: the reference is matched case-insensitively, so
  // the catalog must be too. The shipped kit ships `doc-L0` and `doc-L3` —
  // comparing a lowercased ref against a raw id makes those two permanently
  // unresolvable and every DoD item pinning them a false positive.
  const ids = new Set(kit.gates.map((g) => g.id.toLowerCase()));
  return pinnedGateRefs(content).filter((id) => !ids.has(id));
}

/**
 * Every kit entry a fiche's DoD pins, lowercased.
 *
 * The pin is the gate id, whatever the verification mode carries it:
 * `verify: auto:secrets-scan`, `verify: reviewer:over-engineering`,
 * `verify: human:product-intent`. Only `auto:` was recognised before, which
 * left the two kinds that most need carrying — `reviewer` and `human`, the ones
 * no command will ever run — with no way to say a DoD item discharges them.
 */
export function pinnedGateRefs(content: string): string[] {
  const refs = new Set<string>();
  const re = /verify:\s*(?:auto|reviewer|human):([a-z0-9][a-z0-9-]*)/gi;
  let m: RegExpExecArray | null;
  // The DoD section only. A fiche quoting the pin syntax in prose — an audit
  // response explaining what to add, say — must not count as having added it.
  const scope = dodSection(content);
  while ((m = re.exec(scope)) !== null) refs.add(m[1].toLowerCase());
  return [...refs];
}

/** A mandatory gate, and whether the issue's DoD says anything about it. */
export interface GateCoverage {
  /** Mandatory at this risk and pinned by a DoD item. */
  pinned: QualityGate[];
  /** Mandatory, unpinned, but machine-run: CI executes it either way. */
  unpinnedButRun: QualityGate[];
  /**
   * Mandatory, unpinned, and nothing executes it. Nobody is carrying these:
   * a `reviewer` or `human` gate absent from the DoD is a judgment the review
   * packet will never ask for.
   */
  uncarried: QualityGate[];
}

/**
 * What the issue's Definition of Done says about the gates its risk makes
 * mandatory — the "flags the missing ones" half of ISS-0114's gesture.
 *
 * The asymmetry is the whole value. An unpinned `gate` is not a defect: CI runs
 * `npm test` whether or not a DoD item names it, and ISS-0107 deliberately kept
 * pins optional so one-off assertions can stay in Definitions of Done. An
 * unpinned `reviewer` or `human` entry is different in kind — no command will
 * ever run it, so if the DoD does not carry it, the gate is mandatory on paper
 * and discharged by nobody.
 */
export function gateCoverage(
  required: QualityGate[],
  content: string
): GateCoverage {
  const pins = new Set(pinnedGateRefs(content));
  const coverage: GateCoverage = {
    pinned: [],
    unpinnedButRun: [],
    uncarried: [],
  };
  for (const gate of required) {
    if (pins.has(gate.id.toLowerCase())) coverage.pinned.push(gate);
    else if (gate.kind === "gate") coverage.unpinnedButRun.push(gate);
    else coverage.uncarried.push(gate);
  }
  return coverage;
}
