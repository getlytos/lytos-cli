/**
 * Tests for the write-time independence rule (ADR-0010 §3, ISS-0166): every way
 * `applyVerdict` — the one writer of `review:` — can be asked for an approval,
 * and which of them may not succeed alone.
 *
 * The rule: at risk high a level-3 (or unknown) review cannot record `go` or
 * `go-pending-human` without the owner's countersignature, and a refusal leaves
 * the card byte-for-byte as it was.
 */

import { describe, it, expect, afterEach } from "vitest";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { parseFrontmatter } from "../../src/lib/frontmatter.js";
import { applyVerdict, type ReviewVerdict } from "../../src/lib/review.js";
import {
  countersignatureOf,
  independenceRisk,
  isPositiveVerdict,
  readRecord,
} from "../../src/lib/independence-record.js";
import {
  IndependenceError,
  planIndependence,
  resolveAiReviewer,
  verdictNotice,
} from "../../src/lib/independence-plan.js";
import {
  defaultSettings,
  type IndependenceSettings,
} from "../../src/lib/independence-policy.js";
import { settingsFromConfig } from "../../src/lib/independence-settings.js";
import { parseConfig } from "../../src/lib/config.js";
import { mergeIssue } from "../../src/lib/merge-issue.js";
import { describeIndependence } from "../../src/lib/independence-view.js";
import { createEmptyBoardFixture, type Fixture } from "../helpers/fixtures.js";

let fixture: Fixture;
afterEach(() => fixture?.cleanup());

interface CardOptions {
  risk?: string;
  implementer?: { model?: string; session?: string };
  reviewer?: { model?: string; session?: string };
  extra?: string;
}

function block(name: string, o?: { model?: string; session?: string }): string {
  if (!o) return "";
  const lines = [`${name}:`];
  if (o.model) lines.push(`  model: ${o.model}`);
  if (o.session) lines.push(`  session: ${o.session}`);
  return lines.join("\n") + "\n";
}

/** A card in 4-review with the given risk and AI identities. */
function card(o: CardOptions = {}): { path: string; board: string } {
  fixture = createEmptyBoardFixture();
  const board = join(fixture.cwd, ".lytos", "issue-board");
  mkdirSync(join(board, "4-review"), { recursive: true });
  const path = join(board, "4-review", "ISS-0900-x.md");
  writeFileSync(
    path,
    `---\nid: ISS-0900\ntitle: "Sample"\nstatus: 4-review\n${o.risk === undefined ? "" : `risk: ${o.risk}\n`}${block("ai_implementer", o.implementer)}${block("ai_reviewer", o.reviewer)}${o.extra ?? ""}---\n\n# ISS-0900 — Sample\n\n## Definition of done\n\n- [x] a — verify: auto\n`
  );
  return { path, board };
}

const WEAK = {
  implementer: { model: "claude-opus-x", session: "impl" },
  reviewer: { model: "claude-opus-x", session: "rev" },
};
const STRONG = {
  implementer: { model: "claude-opus-x", session: "impl" },
  reviewer: { model: "gpt-big", session: "rev" },
};

function write(
  c: { path: string; board: string },
  verdict: ReviewVerdict,
  more: Partial<Parameters<typeof applyVerdict>[0]> = {}
) {
  return applyVerdict({
    boardDir: c.board,
    issueFilePath: c.path,
    verdict,
    reviewer: "alice",
    ...more,
  });
}

function fmOf(path: string) {
  return parseFrontmatter(readFileSync(path, "utf-8"))!;
}

function refused(c: { path: string; board: string }, verdict: ReviewVerdict, more = {}): IndependenceError {
  const before = readFileSync(c.path, "utf-8");
  let caught: unknown;
  try {
    write(c, verdict, more);
  } catch (e) {
    caught = e;
  }
  expect(caught, `${verdict} should have been refused`).toBeInstanceOf(IndependenceError);
  expect(readFileSync(c.path, "utf-8"), "a refusal must not touch the card").toBe(before);
  expect(existsSync(c.path)).toBe(true);
  return caught as IndependenceError;
}

describe("at risk high, a level-3 review cannot record an approval alone", () => {
  it("refuses `go` for the same model, and leaves the card untouched", () => {
    const c = card({ risk: "high", ...WEAK });
    const e = refused(c, "go");
    expect(e.code).toBe("needs-countersignature");
    expect(e.message).toContain("level 3");
    expect(e.message).toContain("--countersign");
    expect(e.judgement?.standing).toBe("needs-countersignature");
    expect(fmOf(c.path).review).toBeUndefined();
  });

  it("refuses `go-pending-human` too: it is an approval as well", () => {
    const c = card({ risk: "high", ...WEAK });
    expect(refused(c, "go-pending-human").code).toBe("needs-countersignature");
  });

  it("refuses when the models are missing altogether: unknown is never better than 3", () => {
    const c = card({ risk: "high" });
    const e = refused(c, "go");
    expect(e.computation?.level).toBe("unknown");
    expect(e.message).toContain("level unknown");
  });

  it("refuses when only the implementer is recorded", () => {
    refused(card({ risk: "high", implementer: { model: "claude-opus-x" } }), "go");
  });

  it("refuses when only the reviewer is recorded", () => {
    refused(card({ risk: "high", reviewer: { model: "gpt-big" } }), "go");
  });

  it("refuses when the reviewer's provider is unknown", () => {
    refused(
      card({
        risk: "high",
        implementer: { model: "claude-opus-x", session: "a" },
        reviewer: { model: "homegrown-1", session: "b" },
      }),
      "go"
    );
  });

  it("refuses the same provider when the ranking is empty (nothing is stronger)", () => {
    refused(
      card({
        risk: "high",
        implementer: { model: "claude-haiku-x", session: "a" },
        reviewer: { model: "claude-opus-x", session: "b" },
      }),
      "go"
    );
  });

  it("refuses the same provider when the reviewer is ranked weaker", () => {
    const settings = settingsOf("independence:\n  ranking: [claude-haiku-x, claude-opus-x]\n");
    refused(
      card({
        risk: "high",
        implementer: { model: "claude-opus-x", session: "a" },
        reviewer: { model: "claude-haiku-x", session: "b" },
      }),
      "go",
      { settings }
    );
  });

  it("refuses a fresh session: at high risk a fresh session does not lift level 3", () => {
    const c = card({ risk: "high", ...WEAK });
    expect(refused(c, "go").computation?.freshSession).toBe(true);
  });

  it("applies when the caller passes no settings at all: the defaults are the floor", () => {
    const c = card({ risk: "high", ...WEAK });
    expect(() => write(c, "go", { settings: undefined })).toThrow(IndependenceError);
  });

  it("reads a mistyped risk as high, never as the default medium", () => {
    expect(independenceRisk("hgh")).toEqual({
      risk: "high",
      flag: "`risk:` is not low, medium or high: read as high",
    });
    refused(card({ risk: "hgh", ...WEAK }), "go");
  });

  it("is not bypassed by going through `pending` first", () => {
    const c = card({ risk: "high", ...WEAK });
    write(c, "pending");
    expect(fmOf(c.path).review).toBe("pending");
    refused(c, "go");
  });

  it("is not bypassed by a stale countersignature already on the card", () => {
    const c = card({
      risk: "high",
      ...WEAK,
      extra:
        "review_independence:\n  level: 3\n  risk: high\n  minimum: level-2\n  countersigned_by: alice\n  countersigned_at: 2026-11-01\n  countersigned_as: weak independence\n",
    });
    refused(c, "go");
  });
});

describe("the owner's countersignature", () => {
  it("lets `go` through and records who, when and why", () => {
    const c = card({ risk: "high", ...WEAK });
    const result = write(c, "go", { countersign: true });
    const fm = fmOf(c.path);
    expect(fm.review).toBe("go");
    expect(fm.review_independence).toEqual({
      level: "3",
      risk: "high",
      minimum: "level-2",
      countersigned_by: "alice",
      countersigned_at: new Date().toISOString().split("T")[0],
      countersigned_as: "weak independence",
    });
    expect(result.independence.judgement?.standing).toBe("needs-countersignature");
  });

  it("lets `go-pending-human` through with the same record", () => {
    const c = card({ risk: "high", ...WEAK });
    write(c, "go-pending-human", { countersign: true });
    expect(fmOf(c.path).review).toBe("go-pending-human");
    expect(countersignatureOf(readRecord(fmOf(c.path).review_independence))?.by).toBe("alice");
  });

  it("lets an unknown level through, and records it as unknown", () => {
    const c = card({ risk: "high" });
    write(c, "go", { countersign: true });
    expect((fmOf(c.path).review_independence as { level: string }).level).toBe("unknown");
  });

  it("belongs to one verdict: the next `go` needs its own", () => {
    const c = card({ risk: "high", ...WEAK });
    write(c, "go", { countersign: true });
    refused(c, "go");
  });

  it("is cleared by a negative verdict and not carried into the next round", () => {
    const c = card({ risk: "high", ...WEAK });
    write(c, "go", { countersign: true });
    write(c, "pending");
    expect(fmOf(c.path).review_independence).toBeUndefined();
    refused(c, "go");
  });

  it("is refused when there is nothing to countersign", () => {
    const c = card({ risk: "high", ...STRONG });
    const e = refused(c, "go", { countersign: true });
    expect(e.code).toBe("countersign-not-applicable");
    expect(e.message).toContain("Nothing to countersign");
  });

  it("is refused with a verdict that does not approve", () => {
    for (const verdict of ["no-go", "pending"] as const) {
      const c = card({ risk: "high", ...WEAK });
      const e = refused(c, verdict, { countersign: true });
      expect(e.code).toBe("countersign-not-applicable");
      expect(e.message).toContain("--verdict go or go-pending-human");
    }
  });

  it("is refused when nobody can be named as the signer", () => {
    for (const reviewer of ["unknown", "", "  "]) {
      const c = card({ risk: "high", ...WEAK });
      const e = refused(c, "go", { countersign: true, reviewer });
      expect(e.code).toBe("countersign-anonymous");
    }
  });

  it("is not accepted by a project that refuses weak reviews outright", () => {
    const settings = settingsOf("independence:\n  below_minimum:\n    high: refuse\n");
    const c = card({ risk: "high", ...WEAK });
    expect(refused(c, "go", { settings }).code).toBe("refused");
    const e = refused(c, "go", { settings, countersign: true });
    expect(e.code).toBe("refused");
    expect(e.message).toContain("below_minimum.high: refuse");
  });
});

describe("what passes without a countersignature", () => {
  it("records level 1 at high risk, with no countersignature fields", () => {
    const c = card({ risk: "high", ...STRONG });
    write(c, "go");
    expect(fmOf(c.path).review).toBe("go");
    expect(fmOf(c.path).review_independence).toEqual({ level: "1", risk: "high", minimum: "level-2" });
  });

  it("records level 2 at high risk when the ranking puts the reviewer higher", () => {
    const settings = settingsOf("independence:\n  ranking: [claude-haiku-x, claude-opus-x]\n");
    const c = card({
      risk: "high",
      implementer: { model: "claude-haiku-x", session: "a" },
      reviewer: { model: "claude-opus-x", session: "b" },
    });
    write(c, "go", { settings });
    expect((fmOf(c.path).review_independence as { level: string }).level).toBe("2");
  });

  it("replaces a stale record with the record of THIS verdict", () => {
    const c = card({
      risk: "high",
      ...STRONG,
      extra:
        "review_independence:\n  level: 3\n  risk: high\n  minimum: level-2\n  countersigned_by: bob\n  countersigned_at: 2026-11-01\n  countersigned_as: weak independence\n",
    });
    write(c, "go");
    expect(fmOf(c.path).review_independence).toEqual({ level: "1", risk: "high", minimum: "level-2" });
  });

  it("lets a negative verdict through at any level, and moves the card on no-go", () => {
    const c = card({ risk: "high", ...WEAK });
    const result = write(c, "no-go");
    expect(result.moved).toBe(true);
    const fm = fmOf(result.newPath);
    expect(fm.review).toBe("no-go");
    expect(fm.status).toBe("3-in-progress");
    expect(fm.review_independence).toBeUndefined();
  });

  it("lets `pending` through and clears the record", () => {
    const c = card({ risk: "high", ...WEAK });
    write(c, "pending");
    expect(fmOf(c.path).review).toBe("pending");
  });

  it("accepts any reviewer at low risk, recording the level that was computed", () => {
    const c = card({ risk: "low" });
    write(c, "go");
    expect(fmOf(c.path).review).toBe("go");
    expect(fmOf(c.path).review_independence).toEqual({ level: "unknown", risk: "low", minimum: "any" });
  });
});

describe("medium risk — warn, unless the project asks for more", () => {
  it("records a same-session self-review at the default medium minimum, flagged", () => {
    const c = card({ risk: "medium", implementer: { model: "m", session: "s" }, reviewer: { model: "m", session: "s" } });
    const result = write(c, "go");
    expect(fmOf(c.path).review).toBe("go");
    expect(result.independence.judgement?.standing).toBe("below-warn");
    expect(verdictNotice(result.independence)?.kind).toBe("warn");
  });

  it("treats a card with no risk field as medium", () => {
    const c = card({ ...WEAK, reviewer: { model: "claude-opus-x", session: "impl" } });
    const result = write(c, "go");
    expect(result.independence.judgement?.risk).toBe("medium");
    expect(result.independence.judgement?.standing).toBe("below-warn");
  });

  it("accepts level 3 from a fresh session at medium", () => {
    const c = card({ risk: "medium", ...WEAK });
    expect(write(c, "go").independence.judgement?.standing).toBe("meets");
  });

  it("holds the approval for the owner when the project asks it to", () => {
    const settings = settingsOf(
      "independence:\n  minimum:\n    medium: level-2\n  below_minimum:\n    medium: countersign\n"
    );
    const c = card({ risk: "medium", ...WEAK });
    expect(refused(c, "go", { settings }).code).toBe("needs-countersignature");
    write(c, "go", { settings, countersign: true });
    expect(fmOf(c.path).review).toBe("go");
  });
});

describe("configuration cannot loosen the high-risk rule", () => {
  const loosening = [
    "independence:\n  minimum:\n    high: any\n",
    "independence:\n  minimum:\n    high: fresh-session\n",
    "independence:\n  below_minimum:\n    high: warn\n",
    "independence:\n  minimum:\n    high: banana\n  below_minimum:\n    high: shrug\n",
  ];
  for (const yaml of loosening) {
    it(`still holds a level-3 approval: ${yaml.replace(/\n/g, "⏎")}`, () => {
      const c = card({ risk: "high", ...WEAK });
      refused(c, "go", { settings: settingsOf(yaml) });
    });
  }

  it("still holds it when the config is unreadable", () => {
    const settings = settingsFromConfig({ data: {}, ignored: [], path: "x", present: true, unreadable: true });
    refused(card({ risk: "high", ...WEAK }), "go", { settings });
  });

  it("a ranking cannot make an unlisted model stronger", () => {
    const settings = settingsOf("independence:\n  ranking: [claude-haiku-x]\n");
    refused(
      card({
        risk: "high",
        implementer: { model: "claude-haiku-x", session: "a" },
        reviewer: { model: "claude-opus-x", session: "b" },
      }),
      "go",
      { settings }
    );
  });
});

describe("the AI reviewer given on the call", () => {
  it("is used for the computation and merged over what the card says", () => {
    // The card says a different provider reviewed (level 1)…
    const c = card({ risk: "high", ...STRONG });
    // …but this call says the reviewer was the same model as the implementer.
    refused(c, "go", { aiReviewer: { model: "claude-opus-x" } });
  });

  it("keeps the card's model when only a session is given, and writes the merge", () => {
    const c = card({ risk: "high", ...STRONG });
    write(c, "go", { aiReviewer: { session: "fresh-one" } });
    expect(fmOf(c.path).ai_reviewer).toEqual({
      model: "gpt-big",
      session: "fresh-one",
      prompt_ref: "skills/code-review/SKILL.md",
    });
  });

  it("writes nothing under ai_reviewer when the call gives nothing", () => {
    const c = card({ risk: "low" });
    write(c, "go", { aiReviewer: { model: "", session: "  " } });
    expect(fmOf(c.path).ai_reviewer).toBeUndefined();
  });

  it("says in the notice whether the reviewer was given or read from the card", () => {
    const given = write(card({ risk: "high", ...STRONG }), "go", { aiReviewer: { model: "gpt-big" } });
    expect(given.independence.reviewerFrom).toBe("call");
    expect(verdictNotice(given.independence)?.text).not.toContain("read from the card");
    const fromCard = write(card({ risk: "high", ...STRONG }), "go");
    expect(fromCard.independence.reviewerFrom).toBe("card");
    expect(verdictNotice(fromCard.independence)?.text).toContain(
      "implementer claude-opus-x, reviewer gpt-big (read from the card: pass --ai-model to change it)"
    );
  });

  it("resolveAiReviewer leaves the card alone without flags", () => {
    expect(resolveAiReviewer({ model: "m" }, undefined)).toEqual({
      block: null,
      identity: { model: "m", session: "" },
    });
  });
});

describe("the verdict word itself", () => {
  it("rejects a verdict that is none of the four, rather than skipping the rule", () => {
    const c = card({ risk: "high", ...WEAK });
    for (const verdict of ["GO", "approved", "go ", ""]) {
      expect(() => write(c, verdict as ReviewVerdict)).toThrow(/Invalid verdict/);
    }
    expect(fmOf(c.path).review).toBeUndefined();
  });

  it("knows which verdicts approve", () => {
    expect(["go", "go-pending-human", " GO "].map(isPositiveVerdict)).toEqual([true, true, true]);
    expect(["no-go", "pending", "none", ""].map(isPositiveVerdict)).toEqual([false, false, false, false]);
  });
});

describe("the record on the card", () => {
  it("reads a block, and nothing from a card without one", () => {
    expect(readRecord(undefined)).toBeNull();
    expect(readRecord("level: 3")).toBeNull();
    expect(readRecord({ level: "3", risk: "high" })).toMatchObject({ level: "3", risk: "high" });
  });

  it("counts a countersignature only when it is complete", () => {
    const complete = { level: "3", countersigned_by: "alice", countersigned_at: "2026-11-20", countersigned_as: "weak independence" };
    expect(countersignatureOf(readRecord(complete))).toEqual({ by: "alice", at: "2026-11-20" });
    for (const broken of [
      { ...complete, countersigned_by: "" },
      { ...complete, countersigned_at: "yesterday" },
      { ...complete, countersigned_as: "looks fine" },
      { level: "3" },
    ]) {
      expect(countersignatureOf(readRecord(broken))).toBeNull();
    }
    expect(countersignatureOf(null)).toBeNull();
  });

  it("plans nothing to write for a negative verdict, only a clear", () => {
    const plan = planIndependence({
      fm: { id: "ISS-1", risk: "high" },
      verdict: "no-go",
      reviewer: { model: "", session: "" },
      countersign: false,
      settings: defaultSettings(),
      user: "alice",
      date: "2026-11-20",
    });
    expect(plan).toMatchObject({ set: {}, clear: ["review_independence"], judgement: null });
    expect(verdictNotice(plan)).toBeNull();
  });
});

function settingsOf(yaml: string): IndependenceSettings {
  return settingsFromConfig({ ...parseConfig(yaml), path: "config.yml", present: true, unreadable: false });
}

describe("a three-way merge of two branches (the merge driver)", () => {
  const issue = (front: string) => `---\nid: ISS-1\ntitle: t\nstatus: 4-review\nrisk: high\n${front}---\n\n# ISS-1\n`;

  it("can combine one side's go with the other side's weak models — and the view recomputes it", () => {
    const base = issue("ai_implementer:\n  model: claude-opus-x\n  session: a\n");
    const ours = issue("ai_implementer:\n  model: claude-opus-x\n  session: a\nreview: go\n");
    const theirs = issue(
      "ai_implementer:\n  model: claude-opus-x\n  session: a\nai_reviewer:\n  model: claude-opus-x\n  session: b\n"
    );
    const merged = mergeIssue(base, ours, theirs);
    expect(merged.conflicts).toEqual([]); // git sees nothing wrong…
    const fm = parseFrontmatter(merged.content)!;
    expect(fm.review).toBe("go");
    const view = describeIndependence("/nonexistent/.lytos", fm); // …the packet does
    expect(view.opposable).toBe(false);
    expect(view.decide.join(" ")).toContain("is not opposable");
  });
});
