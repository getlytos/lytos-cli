/**
 * lyt gates [ISS-XXXX] — resolve the mandatory gates for an issue's risk level
 * (ADR-0007 §1, ISS-0114). The risk field selects; nothing is always-on.
 *
 * Read-only. With no issue, prints the whole matrix (gates × tiers).
 */

import { Command } from "commander";
import { existsSync } from "fs";
import { resolve } from "path";
import { locateIssue } from "../lib/issue-ops.js";
import { describeMinimum } from "../lib/independence-policy.js";
import { loadSettings } from "../lib/independence-settings.js";
import { describeIndependence } from "../lib/independence-view.js";
import {
  loadKit,
  gatesForRisk,
  gateCoverage,
  riskOf,
  type GateKind,
  type RiskTier,
} from "../lib/quality.js";
import {
  ok,
  info,
  warn,
  error,
  bold,
  cyan,
  green,
  yellow,
  blue,
  dim,
} from "../lib/output.js";

const KIND_LABEL: Record<GateKind, (t: string) => string> = {
  gate: green,
  reviewer: yellow,
  human: blue,
};
const TIERS: RiskTier[] = ["low", "medium", "high"];

export const gatesCommand = new Command("gates")
  .description("Show the gates mandatory for an issue's risk level (read-only)")
  .argument(
    "[issue-id]",
    "Issue ID (e.g. ISS-0042); omit to print the whole matrix"
  )
  .option("--json", "Output as JSON", false)
  .on("--help", () => {
    console.log("");
    console.log(
      "The `risk` field (low|medium|high, default medium) selects the mandatory"
    );
    console.log(
      "gates from .lytos/quality/kit.md. A project may only tighten, never loosen."
    );
    console.log("");
    console.log(
      "The same risk sets the minimum reviewer independence (ADR-0010): a different"
    );
    console.log(
      "provider, or a stronger model, or at least a fresh session. Tune it under"
    );
    console.log("`independence:` in .lytos/config.yml (tighten only).");
  })
  .action((issueId: string | undefined, opts: { json?: boolean }) => {
    const cwd = process.cwd();
    const lytosDir = resolve(cwd, ".lytos");

    if (!existsSync(lytosDir)) {
      error("No .lytos/ directory found. Run `lyt init` first.");
      process.exit(2);
    }

    const kit = loadKit(lytosDir);
    if (!kit) {
      const message =
        "No quality kit — add .lytos/quality/kit.md (or run `lyt init`).";
      if (opts.json) {
        console.log(
          JSON.stringify({ status: "error", reason: "no-kit", message })
        );
      } else {
        error(message);
      }
      process.exit(1);
    }

    // Whole matrix when no issue is given.
    if (!issueId) {
      const settings = loadSettings(lytosDir);
      if (opts.json) {
        console.log(
          JSON.stringify(
            {
              matrix: TIERS.map((t) => ({
                risk: t,
                gates: gatesForRisk(kit, t),
                independence: {
                  minimum: settings.minimum[t],
                  belowMinimum: settings.belowMinimum[t],
                },
              })),
              independenceProblems: settings.problems,
            },
            null,
            2
          )
        );
        return;
      }
      console.error("");
      for (const t of TIERS) {
        const g = gatesForRisk(kit, t);
        console.error(`  ${bold(t)} ${dim(`(${g.length})`)}`);
        for (const gate of g)
          console.error(
            `    ${KIND_LABEL[gate.kind](gate.kind)} ${cyan(gate.id)} ${dim(`— ${gate.tool}`)}`
          );
        console.error(
          `    ${blue("independence")} ${dim(`— ${describeMinimum(settings.minimum[t])}; below it: ${settings.belowMinimum[t]}`)}`
        );
        console.error("");
      }
      for (const problem of settings.problems) warn(problem);
      return;
    }

    const issue = locateIssue(lytosDir, issueId);
    if (!issue) {
      if (opts.json) {
        console.log(
          JSON.stringify({
            status: "error",
            reason: "not-found",
            message: `Issue ${issueId} not found.`,
          })
        );
      } else {
        error(`Issue ${issueId} not found on the board.`);
      }
      process.exit(1);
    }

    const risk = riskOf(issue.frontmatter.risk);
    const required = gatesForRisk(kit, risk);
    const auto = required.filter((g) => g.kind === "gate");
    const reviewer = required.filter((g) => g.kind === "reviewer");
    const human = required.filter((g) => g.kind === "human");

    const coverage = gateCoverage(required, issue.content);
    const independence = describeIndependence(lytosDir, issue.frontmatter);

    if (opts.json) {
      console.log(
        JSON.stringify(
          {
            id: issue.frontmatter.id,
            risk,
            required,
            counts: {
              auto: auto.length,
              reviewer: reviewer.length,
              human: human.length,
            },
            coverage: {
              pinned: coverage.pinned.map((g) => g.id),
              unpinnedButRun: coverage.unpinnedButRun.map((g) => g.id),
              uncarried: coverage.uncarried.map((g) => g.id),
            },
            independence: {
              risk: independence.risk,
              level: independence.level,
              label: independence.label,
              minimum: independence.minimum,
              minimumText: independence.minimumText,
              belowMinimum: independence.belowMinimum,
              meetsMinimum: independence.meetsMinimum,
              standing: independence.standing,
              flags: independence.flags,
              problems: independence.configProblems,
            },
          },
          null,
          2
        )
      );
      return;
    }

    console.error("");
    ok(
      `${cyan(bold(String(issue.frontmatter.id)))} ${dim("—")} risk ${bold(risk)} ${dim(`(${required.length} gate(s))`)}`
    );
    console.error("");
    for (const [label, list] of [
      ["Auto", auto],
      ["Reviewer", reviewer],
      ["Human", human],
    ] as const) {
      if (list.length === 0) continue;
      console.error(`  ${blue(`${label}:`)}`);
      for (const g of list)
        console.error(
          `    ${KIND_LABEL[g.kind](g.kind)} ${cyan(g.id)} ${dim(`— ${g.tool}`)}`
        );
    }
    console.error(`  ${blue("Independence:")}`);
    console.error(
      `    ${dim(`minimum ${independence.minimumText}; below it: ${independence.belowMinimum}`)}`
    );
    console.error(
      `    ${dim(`this card: level ${independence.label} — ${independence.standing}`)}`
    );
    for (const problem of independence.configProblems) warn(problem);
    // "Resolve the gates due and flag the missing ones" (ISS-0114). Missing
    // means: mandatory here, and nothing in the Definition of Done carries it.
    // Only reviewer/human entries are flagged — CI runs a `gate` whether or not
    // a DoD item names it, and pins stayed optional on purpose (ISS-0107).
    if (coverage.uncarried.length > 0) {
      console.error("");
      warn(
        `${coverage.uncarried.length} mandatory gate(s) no Definition-of-Done item carries:`
      );
      for (const g of coverage.uncarried)
        console.error(
          `    ${KIND_LABEL[g.kind](g.kind)} ${cyan(g.id)} ${dim(`— ${g.tool}`)}`
        );
      console.error(
        `  ${dim(`No command runs these. Add a DoD item pinning each — \`— verify: ${coverage.uncarried[0].kind}:${coverage.uncarried[0].id}\` — or they are mandatory on paper and discharged by nobody.`)}`
      );
    }

    if (!issue.frontmatter.risk)
      info(`(no risk field — defaulted to ${bold("medium")})`);
    console.error("");
  });
