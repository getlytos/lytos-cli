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
      pin: null,
    });
  });

  it("reads a plain marker, case-insensitive", () => {
    expect(parseVerifyMode("Looks right - VERIFY: Human")).toEqual({
      text: "Looks right",
      verify: "human",
      pin: null,
    });
  });

  it("returns null when no marker is present", () => {
    expect(parseVerifyMode("Just a criterion")).toEqual({
      text: "Just a criterion",
      verify: null,
      pin: null,
    });
  });

  it("does not mistake the word verify without a mode", () => {
    expect(parseVerifyMode("Verify the inputs are sanitized")).toEqual({
      text: "Verify the inputs are sanitized",
      verify: null,
      pin: null,
    });
  });

  it("reads an auto marker that pins a quality-kit gate, and strips the whole marker", () => {
    expect(parseVerifyMode("Secrets scan clean — verify: auto:secrets-scan")).toEqual({
      text: "Secrets scan clean",
      verify: "auto",
      pin: "secrets-scan",
    });
  });

  it("accepts a mixed-case gate id — the shipped kit ships doc-L0 and doc-L3", () => {
    expect(parseVerifyMode("Public API documented — *verify: auto:doc-L0*")).toEqual({
      text: "Public API documented",
      verify: "auto",
      pin: "doc-l0",
    });
  });

  it("refuses a malformed pin rather than accepting it silently", () => {
    // No match ⇒ the item is unqualified, which `lyt lint` already reports.
    expect(parseVerifyMode("Item — verify: auto:").verify).toBeNull();
    expect(parseVerifyMode("Item — verify: human:").verify).toBeNull();
    expect(parseVerifyMode("Item — verify: reviewer:").verify).toBeNull();
    expect(parseVerifyMode("Item — verify: human:-x").verify).toBeNull();
    expect(parseVerifyMode("Item — verify: human:two words").verify).toBeNull();
  });
});

describe("parseVerifyMode — the three modes, each with an optional pin (ISS-0153)", () => {
  const modes = ["auto", "reviewer", "human"] as const;

  it.each(modes)("reads a bare `%s` marker and reports no pin", (mode) => {
    expect(parseVerifyMode(`Item — verify: ${mode}`)).toEqual({
      text: "Item",
      verify: mode,
      pin: null,
    });
  });

  it.each(modes)("reads `%s:<pin>` and strips the whole marker", (mode) => {
    expect(parseVerifyMode(`Item — verify: ${mode}:some-gate`)).toEqual({
      text: "Item",
      verify: mode,
      pin: "some-gate",
    });
  });

  it("reads the forms the kit documents, verbatim", () => {
    expect(parseVerifyMode("No over-engineering — verify: reviewer:over-engineering")).toEqual({
      text: "No over-engineering",
      verify: "reviewer",
      pin: "over-engineering",
    });
    expect(parseVerifyMode("The intent is right — verify: human:product-intent")).toEqual({
      text: "The intent is right",
      verify: "human",
      pin: "product-intent",
    });
  });

  // Every way a marker gets set off from the item text. The forms that were
  // already valid must keep parsing; the new ones must parse the same way.
  const surrounds: Array<[string, (marker: string) => string]> = [
    ["em dash", (m) => `Item — ${m}`],
    ["en dash", (m) => `Item – ${m}`],
    ["hyphen", (m) => `Item - ${m}`],
    ["no separator", (m) => `Item ${m}`],
    ["parentheses", (m) => `Item (${m})`],
    ["dash and parentheses", (m) => `Item — (${m})`],
    ["italic asterisks", (m) => `Item — *${m}*`],
    ["bold asterisks", (m) => `Item — **${m}**`],
    ["underscores", (m) => `Item — _${m}_`],
    ["trailing spaces", (m) => `Item — ${m}   `],
  ];

  describe.each(surrounds)("set off by %s", (_label, wrap) => {
    it.each([
      ["auto", null],
      ["auto:tests-unit", "tests-unit"],
      ["reviewer", null],
      ["reviewer:over-engineering", "over-engineering"],
      ["human", null],
      ["human:product-intent", "product-intent"],
    ] as const)("%s", (form, pin) => {
      const parsed = parseVerifyMode(wrap(`verify: ${form}`));
      expect(parsed.text).toBe("Item");
      expect(parsed.verify).toBe(form.split(":")[0]);
      expect(parsed.pin).toBe(pin);
    });
  });

  it("is case-insensitive on the mode and lowercases the pin", () => {
    expect(parseVerifyMode("Item — VERIFY: Reviewer:Over-Engineering")).toEqual({
      text: "Item",
      verify: "reviewer",
      pin: "over-engineering",
    });
    // The shipped kit carries doc-L0 / doc-L3: a mixed-case id must still pin.
    expect(parseVerifyMode("Item — verify: auto:doc-L0").pin).toBe("doc-l0");
  });

  it("tolerates spaces around the colon after `verify`", () => {
    expect(parseVerifyMode("Item — verify : human:product-intent").verify).toBe("human");
    expect(parseVerifyMode("Item — verify:reviewer:rubric-x").pin).toBe("rubric-x");
  });

  it("does not read a mode that is only the start of a longer word", () => {
    expect(parseVerifyMode("Item — verify: humanoid").verify).toBeNull();
    expect(parseVerifyMode("Item — verify: automatic").verify).toBeNull();
    expect(parseVerifyMode("Item — verify: reviewers").verify).toBeNull();
  });

  it("does not read a marker that is not at the end of the item", () => {
    // Anchored to the end, as before: prose that mentions the marker is not a marker.
    expect(parseVerifyMode("Document verify: human:product-intent in the README").verify).toBeNull();
  });

  it("returns a null pin when there is no marker at all", () => {
    expect(parseVerifyMode("Just a criterion")).toEqual({
      text: "Just a criterion",
      verify: null,
      pin: null,
    });
  });
});

describe("parseVerifyMode — a hostile line cannot freeze the reader (ISS-0153)", () => {
  // Every valid form, set off every way the marker allows. The window cap must not lose any.
  const FORMS = [
    "auto", "auto:tests-unit", "reviewer", "reviewer:over-engineering", "human", "human:product-intent",
  ];
  const WRAPS: Array<(m: string) => string> = [
    (m) => `Item — ${m}`,
    (m) => `Item - ${m}`,
    (m) => `Item (${m})`,
    (m) => `Item — *${m}*`,
    (m) => `Item — _${m}_`,
  ];

  it("keeps all 25-odd valid forms valid, on a short line and behind a very long one", () => {
    const padding = "x".repeat(100_000);
    let checked = 0;
    for (const form of FORMS) {
      for (const wrap of WRAPS) {
        for (const prefix of ["", padding]) {
          const parsed = parseVerifyMode(wrap(`verify: ${form}`).replace(/^Item/, `${prefix}Item`));
          expect(parsed.verify, `${form} / ${wrap("m")}`).toBe(form.split(":")[0]);
          expect(parsed.pin).toBe(form.includes(":") ? form.split(":")[1] : null);
          expect(parsed.text.endsWith("Item")).toBe(true);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThanOrEqual(25);
  });

  it.each([
    ["100 000 dashes", "-".repeat(100_000)],
    ["100 000 spaces", " ".repeat(100_000)],
    ["50 000 dash-space pairs", "- ".repeat(50_000)],
    ["100 000 asterisks then a near-miss", "*".repeat(100_000) + " verify:"],
  ])("handles %s in under 50 ms", (_label, hostile) => {
    const started = performance.now();
    const parsed = parseVerifyMode(`Item ${hostile}`);
    const items = extractDodItems(`## Definition of done\n\n- [ ] Item ${hostile}\n`);
    expect(performance.now() - started).toBeLessThan(50);
    expect(parsed.verify).toBeNull();
    expect(items).toHaveLength(1);
  });

  it("still finds the marker at the end of a 100 000-character item", () => {
    const parsed = parseVerifyMode(`${"word ".repeat(20_000)}— verify: reviewer:over-engineering`);
    expect(parsed.verify).toBe("reviewer");
    expect(parsed.pin).toBe("over-engineering");
    expect(parsed.text.length).toBeGreaterThan(99_000);
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

  it("counts a gate-pinned item as explicit auto, so lint stops flagging it", () => {
    const a = analyzeDod(issue("- [ ] Secrets scan clean — verify: auto:secrets-scan"));
    expect(a.auto).toBe(1);
    expect(a.unqualified).toBe(0); // the counter linter.ts reads
    expect(a.loopEligible).toBe(true);
  });

  it("counts a reviewer item apart: it is neither a machine gate nor a person's call (ISS-0153)", () => {
    const a = analyzeDod(
      issue(
        "- [x] A — verify: auto:tests-unit\n- [ ] B — verify: reviewer:over-engineering\n- [x] C — verify: reviewer\n- [ ] D — verify: human:product-intent"
      )
    );
    expect(a.auto).toBe(1);
    expect(a.reviewer).toBe(2);
    expect(a.human).toBe(1);
    expect(a.unqualified).toBe(0);
    // ADR-0004 §1/§4: only a command that exits non-zero is machine-verifiable.
    expect(a.machine).toBe(1);
    expect(a.autoDone).toBe(1);
    expect(a.autoPending).toBe(0);
    expect(a.reviewerDone).toBe(1);
    expect(a.reviewerPending).toBe(1);
    expect(a.loopEligible).toBe(true); // the one auto item carries it
  });

  it("does not make an issue loop-eligible on reviewer items alone", () => {
    const a = analyzeDod(
      issue("- [ ] A — verify: reviewer:over-engineering\n- [ ] B — verify: reviewer\n- [ ] C — verify: human:product-intent")
    );
    expect(a.machine).toBe(0);
    expect(a.reviewer).toBe(2);
    expect(a.loopEligible).toBe(false);
  });

  it("keeps the pin on the parsed item, whatever the mode", () => {
    const a = analyzeDod(
      issue("- [ ] A — verify: auto:tests-unit\n- [ ] B — verify: human:product-intent\n- [ ] C — verify: reviewer\n- [ ] D")
    );
    expect(a.items.map((i) => [i.verify, i.pin])).toEqual([
      ["auto", "tests-unit"],
      ["human", "product-intent"],
      ["reviewer", null],
      [null, null],
    ]);
  });

  it("no longer reports human:<pin> or reviewer:<pin> as unqualified", () => {
    const a = analyzeDod(issue("- [ ] A — verify: human:product-intent\n- [ ] B — verify: reviewer:over-engineering"));
    expect(a.unqualified).toBe(0);
  });

  it("reports no DoD when the section is empty", () => {
    const a = analyzeDod("---\nid: ISS-0002\n---\n\n# ISS-0002\n\n## Context\n\nno dod here\n");
    expect(a.hasDod).toBe(false);
    expect(a.loopEligible).toBe(false);
  });
});
