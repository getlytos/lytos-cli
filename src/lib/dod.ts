/**
 * DoD verification mode (ADR-0004 §4, ISS-0101).
 *
 * Each Definition-of-Done item may declare how it is verified with a trailing
 * marker: `verify: auto` (a machine gate — test, typecheck, lint…) or
 * `verify: human` (a human checklist item). The marker is tolerant of the
 * surrounding markdown used to set it off, e.g.
 *
 *   - [ ] Tests written and green — *verify: auto*
 *   - [ ] The rendering looks right — verify: human
 *
 * An `auto` item may additionally pin the quality-kit gate that verifies it
 * (ADR-0005/0007, ISS-0107) — the form the kit documents:
 *
 *   - [ ] Secrets scan clean — verify: auto:secrets-scan
 *
 * The item is `auto` either way; the id names *which* gate proves it, and
 * `lyt doctor` flags a reference the catalog cannot resolve.
 *
 * An item with no marker defaults to `auto` for eligibility purposes but is
 * flagged by `lyt lint` so the author qualifies it explicitly.
 *
 * Loop-eligibility (ADR-0004 §1): an issue is loop-work only when its DoD holds
 * at least one machine-verifiable item. A DoD that is entirely `verify: human`
 * is not loop-work — the loop must refuse it and leave it for a human.
 *
 * Zero dependencies.
 */

export type VerifyMode = "auto" | "human";

export interface DodItem {
  text: string;
  done: boolean;
  /** null = no marker (defaults to auto for eligibility, flagged by lint). */
  verify: VerifyMode | null;
}

export interface DodAnalysis {
  hasDod: boolean;
  items: DodItem[];
  /** Items with an explicit `verify: auto` marker. */
  auto: number;
  /** Items with an explicit `verify: human` marker. */
  human: number;
  /** Items with no marker. */
  unqualified: number;
  /** Machine-verifiable count = auto + unqualified (unqualified defaults to auto). */
  machine: number;
  /** Machine-verifiable items already ticked. */
  autoDone: number;
  /** Machine-verifiable items not yet ticked (would block review). */
  autoPending: number;
  /** ADR-0004 §1: hasDod && machine >= 1. */
  loopEligible: boolean;
}

// Trailing `verify: auto|human`, tolerant of the em/en dash, hyphen, parens,
// asterisks or underscores used to set it off. Anchored to end of the item.
//
// `auto` may pin a quality-kit gate (`auto:<id>`); the id charset matches
// `unresolvedGateRefs` (quality.ts), which resolves the same reference against
// the catalog. Only `auto` takes an id — `human:<something>` is not a documented
// form, so it deliberately fails to match and the item is reported unqualified by
// `lyt lint` rather than silently accepted.
const VERIFY_RE =
  /[\s—–\-(*_]*verify\s*:\s*(?:(human)|(auto)(?::([a-z0-9][a-z0-9-]*))?)[\s*_)]*$/i;

/**
 * Split a raw checklist-item text into its display text and verify mode.
 */
export function parseVerifyMode(raw: string): {
  text: string;
  verify: VerifyMode | null;
} {
  const match = raw.match(VERIFY_RE);
  if (match && match.index !== undefined) {
    // Exactly one alternative matched: `human`, or `auto` (+ optional gate id).
    return {
      text: raw.slice(0, match.index).trim(),
      verify: (match[1] ?? match[2]).toLowerCase() as VerifyMode,
    };
  }
  return { text: raw.trim(), verify: null };
}

const HEADING_RE = /^#{1,6}[ \t]+(.*)$/;
const DOD_HEADING_RE = /definition of done/i;
const CHECKLIST_RE = /^[ \t]*- \[([ xX])\] (.+)$/;
const FENCE_RE = /^[ \t]*(```|~~~)/;

/**
 * Extract the checklist items of the "Definition of done" section.
 * Items inside fenced code blocks are ignored (consistent with ISS-0069).
 */
export function extractDodItems(content: string): DodItem[] {
  const lines = content.split(/\r?\n/);
  const items: DodItem[] = [];
  let inDod = false;
  let inFence = false;

  for (const line of lines) {
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const heading = line.match(HEADING_RE);
    if (heading) {
      // Entering the DoD section, or leaving it at the next heading.
      inDod = DOD_HEADING_RE.test(heading[1]);
      continue;
    }

    if (!inDod) continue;

    const item = line.match(CHECKLIST_RE);
    if (item) {
      const { text, verify } = parseVerifyMode(item[2]);
      items.push({ text, done: item[1] !== " ", verify });
    }
  }

  return items;
}

/**
 * The text of the "Definition of done" section alone — fenced blocks excluded.
 *
 * Anything that reads the DoD as a *contract* must read it here rather than
 * scanning the fiche. A fiche is mostly prose: context, audit blocks, responses
 * quoting the very syntax they discuss. `ready.ts` learned this the hard way —
 * a stray "out of scope" in a note made an issue look ready — and the gate-pin
 * resolver reproduced it exactly: writing \`verify: reviewer:over-engineering\`
 * inside an audit response silenced the flag that was reporting that same gate
 * as carried by nobody. Prose about a pin is not a pin.
 */
export function dodSection(content: string): string {
  const lines = content.split(/\r?\n/);
  const kept: string[] = [];
  let inDod = false;
  let inFence = false;

  for (const line of lines) {
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const heading = line.match(HEADING_RE);
    if (heading) {
      inDod = DOD_HEADING_RE.test(heading[1]);
      continue;
    }
    if (inDod) kept.push(line);
  }

  return kept.join("\n");
}

/**
 * Analyze the DoD of an issue: counts, and loop-eligibility.
 */
export function analyzeDod(content: string): DodAnalysis {
  const items = extractDodItems(content);
  const auto = items.filter((i) => i.verify === "auto").length;
  const human = items.filter((i) => i.verify === "human").length;
  const unqualified = items.filter((i) => i.verify === null).length;
  const machine = auto + unqualified;
  const autoDone = items.filter((i) => i.verify !== "human" && i.done).length;
  const autoPending = machine - autoDone;

  return {
    hasDod: items.length > 0,
    items,
    auto,
    human,
    unqualified,
    machine,
    autoDone,
    autoPending,
    loopEligible: items.length > 0 && machine >= 1,
  };
}
