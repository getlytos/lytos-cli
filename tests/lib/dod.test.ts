/**
 * Unit tests for the DoD verification-mode analysis (ADR-0004 §4, ISS-0101).
 */

import { describe, it, expect } from "vitest";
import { parseVerifyMode, extractDodItems, analyzeDod } from "../../src/lib/dod.js";

function issue(dodBody: string): string {
  return `---\nid: ISS-0001\ntitle: t\nstatus: 2-sprint\n---\n\n# ISS-0001 — t\n\n## Definition of done\n\n${dodBody}\n\n## Notes\n\n- [ ] not a dod item\n`;
}

describe("parseVerifyMode", () => {
  it("reads an em-dash italic marker and strips it", () => {
    expect(parseVerifyMode("Tests green — *verify: auto*")).toEqual({
      text: "Tests green",
      verify: "auto",
    });
  });

  it("reads a plain marker, case-insensitive", () => {
    expect(parseVerifyMode("Looks right - VERIFY: Human")).toEqual({
      text: "Looks right",
      verify: "human",
    });
  });

  it("returns null when no marker is present", () => {
    expect(parseVerifyMode("Just a criterion")).toEqual({
      text: "Just a criterion",
      verify: null,
    });
  });

  it("does not mistake the word verify without a mode", () => {
    expect(parseVerifyMode("Verify the inputs are sanitized")).toEqual({
      text: "Verify the inputs are sanitized",
      verify: null,
    });
  });
});

describe("extractDodItems", () => {
  it("only reads items under the Definition of done heading", () => {
    const items = extractDodItems(issue("- [x] A — verify: auto\n- [ ] B — verify: human"));
    expect(items.map((i) => i.text)).toEqual(["A", "B"]);
  });

  it("ignores checklist items inside fenced code blocks", () => {
    const body = "- [ ] Real item — verify: auto\n\n```\n- [ ] fake item — verify: auto\n```";
    const items = extractDodItems(issue(body));
    expect(items).toHaveLength(1);
    expect(items[0].text).toBe("Real item");
  });
});

describe("analyzeDod", () => {
  it("counts modes and treats unmarked as machine-by-default", () => {
    const a = analyzeDod(issue("- [x] A — verify: auto\n- [ ] B — verify: human\n- [ ] C"));
    expect(a.auto).toBe(1);
    expect(a.human).toBe(1);
    expect(a.unqualified).toBe(1);
    expect(a.machine).toBe(2); // auto + unqualified
    expect(a.autoDone).toBe(1);
    expect(a.autoPending).toBe(1);
    expect(a.loopEligible).toBe(true);
  });

  it("marks an all-human DoD as loop-ineligible", () => {
    const a = analyzeDod(issue("- [ ] Looks right — verify: human\n- [ ] Tone ok — verify: human"));
    expect(a.machine).toBe(0);
    expect(a.loopEligible).toBe(false);
  });

  it("reports no DoD when the section is empty", () => {
    const a = analyzeDod("---\nid: ISS-0002\n---\n\n# ISS-0002\n\n## Context\n\nno dod here\n");
    expect(a.hasDod).toBe(false);
    expect(a.loopEligible).toBe(false);
  });
});
