/**
 * DoD verification mode (ADR-0004 §4, ISS-0101, ISS-0153).
 *
 * Each Definition-of-Done item may declare how it is verified with a trailing
 * marker, one of three modes:
 *
 *   - `verify: auto`     — a machine gate: a command that exits non-zero (test,
 *                          typecheck, lint, build, an assertion over a file).
 *   - `verify: reviewer` — a ruling by the adversarial reviewer model against a
 *                          written rubric. No command decides it; a person is not
 *                          needed to.
 *   - `verify: human`    — a person, because nothing else can rule on it.
 *
 * The marker is tolerant of the surrounding markdown used to set it off, e.g.
 *
 *   - [ ] Tests written and green — *verify: auto*
 *   - [ ] No needless abstraction — verify: reviewer
 *   - [ ] The rendering looks right — (verify: human)
 *
 * Any mode may additionally pin the quality-kit entry that carries it
 * (ADR-0005/0007, ISS-0107) — the forms the kit documents:
 *
 *   - [ ] Secrets scan clean — verify: auto:secrets-scan
 *   - [ ] No needless abstraction — verify: reviewer:over-engineering
 *   - [ ] The intent is met — verify: human:product-intent
 *
 * The mode is the same with or without the pin; the id names *which* kit entry
 * carries the item, and `lyt doctor` flags a reference the catalog cannot resolve.
 *
 * An item with no marker defaults to `auto` for eligibility purposes but is
 * flagged by `lyt lint` so the author qualifies it explicitly.
 *
 * This file holds the ONE grammar of the marker (`parseVerifyMode`). Every reader
 * of a marker or of its pin goes through `extractDodItems`: `quality.ts` resolves
 * pins from the parsed items rather than scanning the text with an expression of
 * its own, which is how the two once disagreed on the same line.
 *
 * Loop-eligibility (ADR-0004 §1): an issue is loop-work only when its DoD holds
 * at least one machine-verifiable item. `reviewer` does NOT count as one: §4
 * defines `auto` as "a command that exits non-zero", and a model's ruling is a
 * judgment, not a gate that can say NO independent of anyone's confidence
 * (invariant 3). So a DoD made only of `reviewer` and `human` items is not
 * loop-work — the loop must refuse it and leave it for a person. A `reviewer`
 * item is still not `human`: an auditing model may rule on it, so an unticked
 * one is a pending ruling, not a pending person.
 *
 * Zero dependencies.
 */

export type VerifyMode = "auto" | "reviewer" | "human";

export interface DodItem {
  text: string;
  done: boolean;
  /** null = no marker (defaults to auto for eligibility, flagged by lint). */
  verify: VerifyMode | null;
  /** The kit entry the marker pins (`<mode>:<id>`), lowercased; null when bare. */
  pin: string | null;
}

export interface DodAnalysis {
  hasDod: boolean;
  items: DodItem[];
  /** Items with an explicit `verify: auto` marker. */
  auto: number;
  /** Items with an explicit `verify: reviewer` marker (a model rules on them). */
  reviewer: number;
  /** Items with an explicit `verify: human` marker. */
  human: number;
  /** Items with no marker. */
  unqualified: number;
  /**
   * Machine-verifiable count = auto + unqualified (unqualified defaults to
   * auto). `reviewer` is excluded: no command decides it (ADR-0004 §1, §4).
   */
  machine: number;
  /** Machine-verifiable items already ticked. */
  autoDone: number;
  /** Machine-verifiable items not yet ticked (would block review). */
  autoPending: number;
  /** `reviewer` items already ruled on (ticked). */
  reviewerDone: number;
  /** `reviewer` items still awaiting the auditor's ruling. */
  reviewerPending: number;
  /** ADR-0004 §1: hasDod && machine >= 1. */
  loopEligible: boolean;
}

// Trailing `verify: <mode>[:<pin>]`, tolerant of the em/en dash, hyphen, parens,
// asterisks or underscores used to set it off. Anchored to end of the item.
//
// Every mode may pin a quality-kit entry (`auto:<id>`, `reviewer:<id>`,
// `human:<id>`); the id charset matches `pinnedGateRefs` (quality.ts), which
// resolves the same reference against the catalog. A pin with no id (`human:`)
// or a malformed one deliberately fails to match, so the item is reported
// unqualified by `lyt lint` rather than silently accepted.
/** How many trailing characters of an item are searched for its marker. */
const MARKER_WINDOW = 512;

const VERIFY_RE =
  /[\s—–\-(*_]*verify\s*:\s*(auto|reviewer|human)(?::([a-z0-9][a-z0-9-]*))?[\s*_)]*$/i;

/**
 * Split a raw checklist-item text into its display text, verify mode and pin.
 */
export function parseVerifyMode(raw: string): {
  text: string;
  verify: VerifyMode | null;
  pin: string | null;
} {
  // The expression is anchored to the end of the item, so only the tail can hold
  // the marker. Scanning from every position of a very long line made the leading
  // `[\s—–\-(*_]*` quadratic (100 000 dashes took 27 s): a hostile card froze
  // `lint`, `next` and `doctor`. A marker is a few dozen characters, so the
  // window is generous.
  const offset = Math.max(0, raw.length - MARKER_WINDOW);
  const match = raw.slice(offset).match(VERIFY_RE);
  if (match && match.index !== undefined) {
    return {
      text: raw.slice(0, offset + match.index).trim(),
      verify: match[1].toLowerCase() as VerifyMode,
      pin: match[2] ? match[2].toLowerCase() : null,
    };
  }
  return { text: raw.trim(), verify: null, pin: null };
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
      const { text, verify, pin } = parseVerifyMode(item[2]);
      items.push({ text, done: item[1] !== " ", verify, pin });
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
  const reviewerItems = items.filter((i) => i.verify === "reviewer");
  const human = items.filter((i) => i.verify === "human").length;
  const unqualified = items.filter((i) => i.verify === null).length;
  const machine = auto + unqualified;
  const autoDone = items.filter(
    (i) => (i.verify === "auto" || i.verify === null) && i.done
  ).length;
  const autoPending = machine - autoDone;
  const reviewerDone = reviewerItems.filter((i) => i.done).length;

  return {
    hasDod: items.length > 0,
    items,
    auto,
    reviewer: reviewerItems.length,
    human,
    unqualified,
    machine,
    autoDone,
    autoPending,
    reviewerDone,
    reviewerPending: reviewerItems.length - reviewerDone,
    loopEligible: items.length > 0 && machine >= 1,
  };
}
