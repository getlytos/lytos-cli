/**
 * Unit tests for the AI-wrapper journal aggregation (ISS-0076, ADR-0003).
 * Pure logic — synthetic journal lines, no filesystem, no AI wrapper.
 */

import { describe, it, expect } from "vitest";
import { parseJournal, aggregate, absorbPlan } from "../../src/lib/absorb.js";

function jsonl(...objs: object[]): string {
  return objs.map((o) => JSON.stringify(o)).join("\n");
}

describe("parseJournal", () => {
  it("parses valid lines and counts malformed ones without throwing", () => {
    const content = [
      JSON.stringify({ issue: "ISS-0001", role: "implementer" }),
      "",
      "not json",
      "[1,2,3]", // array is not a journal object
      JSON.stringify({ issue: "ISS-0001", tokens_in: 5 }),
    ].join("\n");

    const { lines, malformed } = parseJournal(content);
    expect(lines).toHaveLength(2);
    expect(malformed).toBe(2);
  });
});

describe("aggregate", () => {
  it("sums counters, unions skills, and maps roles to ai_* objects", () => {
    const content = jsonl(
      { issue: "ISS-0076", role: "implementer", model: "claude-opus-4-7", session: "s1", prompt_ref: "skills/code-structure/SKILL.md", tokens_in: 1200, tokens_out: 340, cost_usd: 0.018, skills: ["code-structure"] },
      { issue: "ISS-0076", role: "implementer", model: "claude-opus-4-7", session: "s1", tokens_in: 800, tokens_out: 210, cost_usd: 0.012, skills: ["testing"] },
      { issue: "ISS-0076", role: "reviewer", model: "gpt-5", session: "r1", tokens_in: 500, tokens_out: 100, cost_usd: 0.01, skills: ["code-review"] }
    );
    const { lines } = parseJournal(content);
    const { delta, linesUsed } = aggregate(lines, "ISS-0076");

    expect(linesUsed).toBe(3);
    expect(delta.ai_implementer).toEqual({
      model: "claude-opus-4-7",
      session: "s1",
      prompt_ref: "skills/code-structure/SKILL.md",
    });
    expect(delta.ai_reviewer).toEqual({ model: "gpt-5", session: "r1" });
    expect(delta.tokens_in).toBe("2500");
    expect(delta.tokens_out).toBe("650");
    expect(delta.cost_usd).toBe("0.04");
    expect(delta.skills_used).toEqual(["code-review", "code-structure", "testing"]);
  });

  it("last non-empty value wins for identity fields", () => {
    const content = jsonl(
      { issue: "ISS-0001", role: "implementer", model: "claude-sonnet-4-6", session: "old" },
      { issue: "ISS-0001", role: "implementer", model: "claude-opus-4-8", session: "new" }
    );
    const { lines } = parseJournal(content);
    const { delta } = aggregate(lines, "ISS-0001");
    expect(delta.ai_implementer).toEqual({ model: "claude-opus-4-8", session: "new" });
  });

  it("attributes issue-less lines to the target and ignores other issues", () => {
    const content = jsonl(
      { role: "implementer", tokens_in: 100 }, // no issue → attributed
      { issue: "ISS-0001", tokens_in: 50 },
      { issue: "ISS-9999", tokens_in: 999 } // different issue → ignored
    );
    const { lines } = parseJournal(content);
    const { delta, linesUsed } = aggregate(lines, "ISS-0001");
    expect(linesUsed).toBe(2);
    expect(delta.tokens_in).toBe("150");
  });

  it("emits no counter fields when the journal has none (never zero-fills)", () => {
    const content = jsonl({ issue: "ISS-0001", role: "implementer", model: "m" });
    const { lines } = parseJournal(content);
    const { delta } = aggregate(lines, "ISS-0001");
    expect(delta.tokens_in).toBeUndefined();
    expect(delta.cost_usd).toBeUndefined();
    expect(delta.skills_used).toBeUndefined();
  });

  it("matches the issue id case-insensitively", () => {
    const content = jsonl({ issue: "iss-0001", tokens_in: 7 });
    const { lines } = parseJournal(content);
    expect(aggregate(lines, "ISS-0001").delta.tokens_in).toBe("7");
  });
});

describe("absorbPlan", () => {
  it("is deterministic — same journal yields the same delta (idempotent SET)", () => {
    const content = jsonl(
      { issue: "ISS-0001", role: "implementer", model: "m", tokens_in: 10, cost_usd: 0.001 }
    );
    const a = absorbPlan(content, "ISS-0001");
    const b = absorbPlan(content, "ISS-0001");
    expect(a.delta).toEqual(b.delta);
    expect(a.malformed).toBe(0);
    expect(a.linesUsed).toBe(1);
  });
});
