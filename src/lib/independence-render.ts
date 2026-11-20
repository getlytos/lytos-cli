/**
 * Reviewer independence — the words of the review packet (ADR-0010,
 * ISS-0166): the "Decide first" lines and the `## Independence` section.
 *
 * Doubt first, as the packet is: what makes an approval not opposable, or
 * unchecked, or no longer matching its record comes before the green evidence.
 *
 * Pure text from an `IndependenceView`. Zero dependencies.
 */

import type { IdentityView, IndependenceView } from "./independence-view.js";
import { COUNTERSIGN_REASON } from "./independence-record.js";

export interface DecideInput {
  id: string;
  v: Pick<
    IndependenceView,
    | "risk"
    | "level"
    | "appliedLevel"
    | "overrideIgnored"
    | "minimumText"
    | "standing"
    | "approved"
    | "verdict"
    | "countersignature"
    | "drift"
    | "recorded"
  >;
}

type Decide = DecideInput["v"];

function levelWords(v: Decide): string {
  const level =
    v.appliedLevel === "unknown" ? "unknown (treated as 3)" : v.appliedLevel;
  return v.overrideIgnored
    ? `${level} (a provider override makes it look like level ${v.level}; it is not counted at risk ${v.risk})`
    : level;
}

/** The one line about how the review stands against the minimum, if any. */
function standingLine(id: string, v: Decide): string | null {
  const below = `level ${levelWords(v)} is below the minimum for risk ${v.risk} (${v.minimumText})`;
  const ask = `\`lyt review ${id} --verdict go --countersign\``;
  const cs = v.countersignature;
  const notOpposable = `**Independence — this \`review: ${v.verdict}\` is not opposable**: ${below}`;
  if (v.approved) {
    return {
      "needs-countersignature": `${notOpposable}, and no complete countersignature is recorded. It needs the owner's countersignature ("${COUNTERSIGN_REASON}": ${ask}) or a more independent review.`,
      refused: `${notOpposable}, and this project's configuration refuses such a review. A more independent review is needed.`,
      countersigned: `**Weak independence, countersigned** by ${cs?.by ?? "?"} on ${cs?.at ?? "?"}: ${below}. The signature is on the card — confirm it is the owner's.`,
      "below-warn": `**Independence below the minimum**: ${below}. This project asks to be told, not to block.`,
      meets: null,
    }[v.standing];
  }
  if (v.standing === "needs-countersignature") {
    return `**Independence**: ${below}. A \`go\` on this card will need the owner's countersignature (${ask}).`;
  }
  if (v.standing === "refused") {
    return `**Independence**: ${below}, and this project's configuration refuses such a review: a more independent review is needed before any \`go\`.`;
  }
  return null;
}

/** Doubts about the record itself: absent, or no longer matching the card. */
function recordLines(v: Decide): string[] {
  const out: string[] = [];
  const checkable =
    v.standing !== "needs-countersignature" && v.standing !== "refused";
  if (v.approved && v.recorded === null && checkable) {
    out.push(
      `**No independence record**: this \`review: ${v.verdict}\` carries no \`review_independence\` block — it was written by hand, or by a CLI older than 1.7, so nothing says the rule was applied. Level ${levelWords(v)} is computed from the models now on the card.`
    );
  }
  for (const d of v.drift) {
    out.push(`**The independence record no longer matches the card**: ${d}.`);
  }
  return out;
}

/** The doubts the human must see before the green evidence. */
export function decideLines({ id, v }: DecideInput): string[] {
  const line = standingLine(id, v);
  return [...(line ? [line] : []), ...recordLines(v)];
}

function who(i: IdentityView): string {
  const provider = i.provider
    ? `${i.provider} (${i.providerFrom === "config" ? "configured" : "shipped table"})`
    : "unknown";
  return `\`${i.model || "—"}\` · session \`${i.session || "—"}\` · provider ${provider}${i.ranked ? " · ranked" : ""}`;
}

function standingText(v: IndependenceView): string {
  switch (v.standing) {
    case "meets":
      return "the minimum is met";
    case "below-warn":
      return `below the minimum — the project only asks to be told (below_minimum: ${v.belowMinimum})`;
    case "countersigned":
      return `below the minimum, countersigned by ${v.countersignature?.by} on ${v.countersignature?.at} ("${COUNTERSIGN_REASON}")`;
    case "needs-countersignature":
      return `**below the minimum** — an approval waits for the owner's countersignature ("${COUNTERSIGN_REASON}")`;
    case "refused":
      return "**below the minimum** — this project refuses such a review";
  }
}

/** The packet's `## Independence` section. */
export function renderIndependence(v: IndependenceView): string[] {
  const out: string[] = ["## Independence"];
  const counted = v.overrideIgnored
    ? `, counted as level ${v.appliedLevel} at risk ${v.risk} (a provider override is not counted there)`
    : "";
  out.push(
    `- Level: **${v.label}**${counted} · minimum at risk **${v.risk}**: ${v.minimumText} — ${standingText(v)}`
  );
  out.push(`- Implementer: ${who(v.implementer)}`);
  out.push(`- Reviewer: ${who(v.reviewer)}`);
  out.push(
    `- Why: ${v.reason}${v.freshSession ? "; the sessions differ" : "; no fresh session established"}`
  );
  out.push(
    v.recorded
      ? `- Recorded with the verdict: level ${v.recorded.level} at risk ${v.recorded.risk || "?"}`
      : "- Recorded with the verdict: nothing"
  );
  if (v.flags.length > 0) out.push(`- Assumed: ${v.flags.join("; ")}`);
  out.push(`- Computed from: ${v.sources.join(" · ")}`);
  for (const p of v.configProblems) out.push(`- Configuration: ${p}`);
  return out;
}
