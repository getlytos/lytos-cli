/**
 * ISS-0176, F7 — the guarantee is worded as what is delivered.
 *
 * The ISS-0166 Definition-of-Done item said the rule "cannot be bypassed by
 * editing a field". It can be, before the first verdict (a hand-lowered `risk:`),
 * and the models a review declares can lie. ADR-0010 now lists those limits and
 * the card says exactly what is guaranteed and what is not, leaving the
 * reviewer's box open.
 */

import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "fs";
import { join, resolve } from "path";

const ROOT = resolve(__dirname, "../..");

function adr(): string {
  const dir = join(ROOT, ".lytos", "adr");
  const file = readdirSync(dir).find((f) => f.startsWith("ADR-0010-"))!;
  return readFileSync(join(dir, file), "utf-8");
}

function card(id: string): string {
  const board = join(ROOT, ".lytos", "issue-board");
  for (const stage of readdirSync(board)) {
    const dir = join(board, stage);
    if (!existsSync(dir) || !readdirSync(dir).length) continue;
    const file = readdirSync(dir).find((f) => f.startsWith(`${id}-`) && f.endsWith(".md"));
    if (file) return readFileSync(join(dir, file), "utf-8");
  }
  throw new Error(`${id} not found`);
}

describe("ADR-0010 — Known limits", () => {
  it("has the section, after the decision, listing the honest limits", () => {
    const text = adr();
    expect(text).toContain("\n## Known limits\n");
    const limits = text.slice(text.indexOf("## Known limits"));
    for (const phrase of [
      "hand-lowered `risk:`",
      "declared",
      "countersignature",
      "provider override",
      "lyt close",
      "Guaranteed",
      "Not guaranteed",
    ]) {
      expect(limits, phrase).toContain(phrase);
    }
  });

  it("changes nothing of the decision above it", () => {
    const text = adr();
    expect(text).toContain("### 3. The minimum depends on risk (ADR-0007)");
    expect(text).toContain("A team may tighten this to a refusal in `.lytos/config.yml`.");
    expect(text).toContain("## Non-goals");
  });
});

describe("ISS-0166 — the Definition-of-Done item", () => {
  const dod = (): string[] =>
    card("ISS-0166")
      .split("\n")
      .filter((line) => line.startsWith("- ["));

  it("no longer claims the rule cannot be bypassed by editing a field", () => {
    expect(card("ISS-0166")).not.toContain("cannot be bypassed by editing a field");
  });

  it("says what is guaranteed and what is not, and points at the ADR", () => {
    const item = dod().find((line) => line.includes("verify: reviewer:security-review"))!;
    expect(item).toBeDefined();
    expect(item).toContain("refused");
    expect(item).toContain("after the verdict");
    expect(item).toContain("show in the packet");
    expect(item).toContain("not prevented");
    expect(item).toContain("ADR-0010");
    expect(item).toContain("Known limits");
  });

  it("leaves the reviewer's box open, and the four auto boxes ticked", () => {
    const items = dod();
    expect(items).toHaveLength(5);
    expect(items.slice(0, 4).every((line) => line.startsWith("- [x]"))).toBe(true);
    expect(items[4].startsWith("- [ ]")).toBe(true);
  });
});
