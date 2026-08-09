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
import { loadKit, gatesForRisk, riskOf, type GateKind, type RiskTier } from "../lib/quality.js";
import { ok, info, error, bold, cyan, green, yellow, blue, dim } from "../lib/output.js";

const KIND_LABEL: Record<GateKind, (t: string) => string> = {
  gate: green,
  reviewer: yellow,
  human: blue,
};
const TIERS: RiskTier[] = ["low", "medium", "high"];

export const gatesCommand = new Command("gates")
  .description("Show the gates mandatory for an issue's risk level (read-only)")
  .argument("[issue-id]", "Issue ID (e.g. ISS-0042); omit to print the whole matrix")
  .option("--json", "Output as JSON", false)
  .on("--help", () => {
    console.log("");
    console.log("The `risk` field (low|medium|high, default medium) selects the mandatory");
    console.log("gates from .lytos/quality/kit.md. A project may only tighten, never loosen.");
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
      const message = "No quality kit — add .lytos/quality/kit.md (or run `lyt init`).";
      if (opts.json) {
        console.log(JSON.stringify({ status: "error", reason: "no-kit", message }));
      } else {
        error(message);
      }
      process.exit(1);
    }

    // Whole matrix when no issue is given.
    if (!issueId) {
      if (opts.json) {
        console.log(JSON.stringify({ matrix: TIERS.map((t) => ({ risk: t, gates: gatesForRisk(kit, t) })) }, null, 2));
        return;
      }
      console.error("");
      for (const t of TIERS) {
        const g = gatesForRisk(kit, t);
        console.error(`  ${bold(t)} ${dim(`(${g.length})`)}`);
        for (const gate of g) console.error(`    ${KIND_LABEL[gate.kind](gate.kind)} ${cyan(gate.id)} ${dim(`— ${gate.tool}`)}`);
        console.error("");
      }
      return;
    }

    const issue = locateIssue(lytosDir, issueId);
    if (!issue) {
      if (opts.json) {
        console.log(JSON.stringify({ status: "error", reason: "not-found", message: `Issue ${issueId} not found.` }));
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

    if (opts.json) {
      console.log(JSON.stringify({ id: issue.frontmatter.id, risk, required, counts: { auto: auto.length, reviewer: reviewer.length, human: human.length } }, null, 2));
      return;
    }

    console.error("");
    ok(`${cyan(bold(String(issue.frontmatter.id)))} ${dim("—")} risk ${bold(risk)} ${dim(`(${required.length} gate(s))`)}`);
    console.error("");
    for (const [label, list] of [["Auto", auto], ["Reviewer", reviewer], ["Human", human]] as const) {
      if (list.length === 0) continue;
      console.error(`  ${blue(`${label}:`)}`);
      for (const g of list) console.error(`    ${KIND_LABEL[g.kind](g.kind)} ${cyan(g.id)} ${dim(`— ${g.tool}`)}`);
    }
    if (!issue.frontmatter.risk) info(`(no risk field — defaulted to ${bold("medium")})`);
    console.error("");
  });
