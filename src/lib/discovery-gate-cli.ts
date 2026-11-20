/**
 * The discovery gate as the commands apply it (ISS-0165): one call that refuses
 * with a message, or lets the card through and returns what to write into it.
 *
 * Shared by `lyt move`, `lyt start`, `lyt claim` and `lyt unpark`, so the four of
 * them refuse in the same words and none can be walked around by another.
 */

import { decideDiscoveryGate } from "./discovery-gate.js";
import { OVERRIDE_KEY } from "./discovery-override.js";
import { currentGitUser } from "./issue-ops.js";
import type { Frontmatter } from "./frontmatter.js";
import { error, info } from "./output.js";

/** The option that lets a human override the gate, with its help text. */
export const OVERRIDE_OPTION = "--discovery-override <reason>";
export const OVERRIDE_HELP =
  "A person's decision, never an agent's: let a leaf of an epic in discovery through, on your accountability; the reason is recorded in the card";

export interface EnforceOptions {
  /** The reason given with `--discovery-override`, when the option was used. */
  override?: string;
  json?: boolean;
}

/**
 * Apply the gate to a card about to enter the sprint or the flow. On a refusal it
 * prints why (human or JSON) and exits 1, before anything has been changed. Returns
 * the frontmatter to merge into the card: the override record, or nothing.
 */
export function enforceDiscoveryGate(
  lytosDir: string,
  fm: Frontmatter,
  options: EnforceOptions = {}
): Frontmatter {
  const decision = decideDiscoveryGate(lytosDir, fm, {
    override: options.override,
    by: options.override === undefined ? undefined : currentGitUser(),
  });
  if (decision.action === "pass") return {};
  if (decision.action === "override") {
    return { [OVERRIDE_KEY]: { ...decision.record } };
  }

  if (options.json) {
    console.log(
      JSON.stringify({
        status: "error",
        reason: decision.reason,
        ...(decision.epic ? { epic: decision.epic } : {}),
        message: decision.message,
        hints: decision.hints,
      })
    );
  } else {
    error(decision.message);
    for (const hint of decision.hints) info(hint);
  }
  process.exit(1);
}
