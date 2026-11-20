/**
 * Lint rules of the discovery gate (ADR-0009 §3, ISS-0175).
 *
 * The gate is enforced by the verbs (`lyt move`, `start`, `claim`, `unpark`,
 * `close`), but a card can get past it without them: a folder moved by hand, or
 * an epic set back to `discovery` while its leaves are in the sprint. Two
 * warnings keep that visible:
 *
 *   - a leaf in the sprint or beyond whose epic is in discovery, with no
 *     override that counts and not a spike;
 *   - a `discovery_override` that does not count (bare, incomplete, a bad date,
 *     or made for another epic than the leaf's current parent).
 *
 * Both are warnings with their remedy, never an error.
 *
 * Zero dependencies.
 */

import {
  SPIKE_TYPE,
  hasDiscoveryOverride,
  readOverride,
} from "./discovery-override.js";
import {
  DISCOVERY_PHASE,
  isEpic,
  parentIdOf,
  phaseOf,
  type IntentCard,
} from "./intent.js";
import type { LintFinding } from "./linter.js";

/** Stages where a leaf has been committed: it must have passed the gate. */
const COMMITTED = ["2-sprint", "3-in-progress", "4-review", "5-done"];

const OVERRIDE_REMEDY =
  'a person records an override with --discovery-override "<reason>" on `lyt move`, `lyt start` or `lyt close`';

/** The discovery-gate warnings of one card. */
export function discoveryFindings(
  card: IntentCard,
  byId: ReadonlyMap<string, IntentCard>
): LintFinding[] {
  const findings: LintFinding[] = [];
  const override = readOverride(card.fm);
  if (override.state === "invalid") {
    findings.push({
      severity: "warning",
      file: card.file,
      message: `\`discovery_override\` ${override.problem}: it does not count as an override`,
      fix: `Complete it as a person decision, or remove the key: ${OVERRIDE_REMEDY} (ADR-0009 §3)`,
    });
  }

  const epic = byId.get(parentIdOf(card));
  const bypassed =
    COMMITTED.includes(card.status) &&
    !isEpic(card) &&
    card.type.toLowerCase() !== SPIKE_TYPE &&
    epic !== undefined &&
    !epic.archived &&
    isEpic(epic) &&
    phaseOf(epic) === DISCOVERY_PHASE &&
    !hasDiscoveryOverride(card.fm);
  if (bypassed && epic) {
    findings.push({
      severity: "warning",
      file: card.file,
      message: `Leaf of ${epic.id} ("${epic.title}") is in ${card.status} while the epic is still in discovery`,
      fix: `Freeze the epic (phase: frozen on ${epic.id}), send the card back to 1-backlog, make it a spike (type: spike), or have it overridden: ${OVERRIDE_REMEDY} (ADR-0009 §3)`,
    });
  }
  return findings;
}
