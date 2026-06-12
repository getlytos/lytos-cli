/**
 * lyt review — cross-model audit for issues in 4-review/.
 *
 * Intentionally model-agnostic: the CLI assembles a self-contained
 * prompt (rules + skill + issue + diff + fixed output format) and
 * either prints it to stdout (for paste-into-chat flows) or ingests a
 * returned audit block (for automated flows).
 *
 * The point is the separation of concerns — the implementer does not
 * audit their own work. A fresh session, ideally a different vendor,
 * does.
 */

import { Command } from "commander";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import {
  applyAudit,
  applyVerdict,
  buildPrompt,
  exportAllPrompts,
  findReviewIssue,
  hasExistingAudit,
  listPendingReviews,
  parseAuditResponse,
  type ReviewVerdict,
} from "../lib/review.js";
import { ok, info, warn, error, cyan, bold, green, dim } from "../lib/output.js";

function findBoardDir(cwd: string): string | null {
  const candidates = [
    join(cwd, ".lytos", "issue-board"),
    join(cwd, "issue-board"),
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  return null;
}

function readAcceptInput(source: string): string {
  if (source === "-") {
    const stdinBuf = readFileSync(0, "utf-8");
    return stdinBuf;
  }
  if (!existsSync(source)) {
    throw new Error(`--accept file not found: ${source}`);
  }
  return readFileSync(source, "utf-8");
}

export const reviewCommand = new Command("review")
  .description(
    "Cross-model audit for issues in 4-review/: print a portable prompt, or ingest a returned audit block"
  )
  .argument("[issueId]", "Issue ID to audit (e.g. ISS-0050). Omit to list pending reviews.")
  .option("--export", "Print the audit prompt to stdout (default when an issue ID is given)", false)
  .option("--all", "With --export, write one prompt file per pending issue under .lytos/review/<id>.prompt.md", false)
  .option("--accept <file>", "Ingest a returned audit from a file path, or '-' for stdin")
  .option("--overwrite", "Replace an existing audit block instead of refusing (use when re-auditing)", false)
  .option("--verdict <value>", "Write the v2 review verdict directly (go|no-go|pending) without ingesting a full audit block")
  .option("--ai-model <id>", "AI model that performed the review — writes ai_reviewer.model (ADR-0001)")
  .option("--ai-session <id>", "Session/conversation id of the AI review — writes ai_reviewer.session")
  .option("--ai-prompt <ref>", "Prompt/skill ref used for the review (default: skills/code-review/SKILL.md)")
  .on("--help", () => {
    console.log("");
    console.log("Examples:");
    console.log("  lyt review                                  # list pending reviews");
    console.log("  lyt review ISS-0050                         # print the audit prompt");
    console.log("  lyt review ISS-0050 --export > prompt.md    # save prompt to file");
    console.log("  lyt review --all --export                   # batch-export every pending prompt");
    console.log("  lyt review ISS-0050 --accept audit.md       # ingest a returned audit");
    console.log("  pbpaste | lyt review ISS-0050 --accept -    # ingest from clipboard");
    console.log("  lyt review ISS-0050 --accept - --overwrite  # replace a previous audit block");
    console.log("  lyt review ISS-0050 --verdict go            # write verdict directly (no audit block)");
    console.log("  lyt review ISS-0050 --verdict no-go         # write verdict + move back to 3-in-progress");
    console.log("  lyt review ISS-0050 --verdict go \\");
    console.log("      --ai-model 'gpt-5' --ai-session codex-api   # record which AI did the review (ai_reviewer)");
    console.log("");
    console.log("Use a fresh AI session for the audit — ideally a different");
    console.log("vendor or model than the one that implemented the issue.");
    console.log("A model auditing its own code shares the cognitive biases");
    console.log("that caused any mistake in the first place.");
  })
  .action(
    (
      issueId: string | undefined,
      opts: {
        export?: boolean;
        all?: boolean;
        accept?: string;
        overwrite?: boolean;
        verdict?: string;
        aiModel?: string;
        aiSession?: string;
        aiPrompt?: string;
      }
    ) => {
    const cwd = process.cwd();
    const boardDir = findBoardDir(cwd);
    if (!boardDir) {
      error("No issue-board/ directory found. Run `lyt init` first.");
      process.exit(2);
    }

    // Mode 1b: --all --export → batch write one prompt file per pending issue.
    if (opts.all && !issueId) {
      const written = exportAllPrompts(cwd, boardDir);
      if (written.length === 0) {
        info("No issues in 4-review/ — nothing to export.");
        return;
      }
      console.error("");
      for (const w of written) {
        console.error(`  ${green("+")} ${dim(w.promptPath)}`);
      }
      console.error("");
      ok(
        `${written.length} prompt file(s) written under .lytos/review/. Feed each to a fresh AI session.`
      );
      return;
    }

    // Mode 1: no issue ID → list pending reviews and exit.
    if (!issueId) {
      const pending = listPendingReviews(boardDir);
      if (pending.length === 0) {
        info("No issues in 4-review/ right now.");
        return;
      }
      console.error("");
      console.error(`  ${cyan(bold("Pending reviews"))}`);
      console.error("");
      for (const p of pending) {
        const marker = p.hasAudit ? green("✓") : dim("·");
        const status = p.hasAudit ? dim("(audited)") : dim("(pending)");
        console.error(`  ${marker} ${bold(p.id)} ${dim("—")} ${p.title} ${status}`);
      }
      console.error("");
      info(
        "Run `lyt review <ISS-XXXX>` to export the audit prompt for one issue, or `lyt review --all --export` to batch-export every pending prompt."
      );
      return;
    }

    const issueFile = findReviewIssue(boardDir, issueId);
    if (!issueFile) {
      error(
        `Issue ${issueId} not found in 4-review/. Move it there first with an explicit frontmatter update, or pick another ID.`
      );
      process.exit(2);
    }

    // Mode 4: --verdict → write the v2 review field without a full audit block.
    if (opts.verdict) {
      const allowed: ReviewVerdict[] = ["go", "no-go", "pending"];
      if (!allowed.includes(opts.verdict as ReviewVerdict)) {
        error(`Invalid verdict "${opts.verdict}". Use one of: ${allowed.join(", ")}.`);
        process.exit(2);
      }
      const verdict = opts.verdict as ReviewVerdict;
      const aiReviewer =
        opts.aiModel || opts.aiSession || opts.aiPrompt
          ? { model: opts.aiModel, session: opts.aiSession, prompt_ref: opts.aiPrompt }
          : undefined;
      const result = applyVerdict({ boardDir, issueFilePath: issueFile, verdict, aiReviewer });

      console.error("");
      if (verdict === "go") {
        ok(`${cyan(bold(issueId))} verdict recorded: ${green("GO")} — stays in 4-review/ awaiting \`lyt close\`.`);
      } else if (verdict === "no-go") {
        warn(`${cyan(bold(issueId))} verdict recorded: NO_GO — moved back to 3-in-progress/.`);
        if (result.moved) info(`New location: ${result.newPath}`);
      } else {
        info(`${cyan(bold(issueId))} verdict recorded: pending — stays in 4-review/.`);
      }
      return;
    }

    // Mode 3: --accept → ingest a returned audit block.
    if (opts.accept) {
      let raw: string;
      try {
        raw = readAcceptInput(opts.accept);
      } catch (e) {
        error(e instanceof Error ? e.message : String(e));
        process.exit(2);
      }

      const parsed = parseAuditResponse(raw);
      if (parsed.verdict === "UNKNOWN") {
        error(
          "Could not find a **Verdict:** GO or NO_GO line in the input. Paste the full audit block."
        );
        process.exit(2);
      }

      // Guard against silent re-audit: if the issue already has an audit
      // block, require an explicit --overwrite flag so nobody stacks
      // two verdicts (or loses the first one) by accident.
      if (hasExistingAudit(issueFile) && !opts.overwrite) {
        error(
          `${issueId} already has an \`## Audit —\` block. Re-run with \`--overwrite\` to replace it, or remove the old block manually.`
        );
        process.exit(2);
      }

      const result = applyAudit({
        boardDir,
        issueFilePath: issueFile,
        parsed,
        overwrite: opts.overwrite,
      });

      console.error("");
      if (parsed.verdict === "GO") {
        ok(
          cyan(bold(`Audit recorded: GO`)) +
            ` — ${issueId} stays in 4-review/ awaiting \`lyt close\`.`
        );
      } else {
        warn(
          cyan(bold(`Audit recorded: NO_GO`)) +
            ` — ${issueId} moved to 3-in-progress/ with the fix list.`
        );
        if (result.moved) {
          info(`New location: ${result.newPath}`);
        }
      }
      return;
    }

    // Mode 2 (default): print the audit prompt.
    const prompt = buildPrompt({
      cwd,
      issueFilePath: issueFile,
      issueId,
    });
    process.stdout.write(prompt);
  });
