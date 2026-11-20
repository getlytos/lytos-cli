/**
 * The discovery gate (ISS-0165, ADR-0009 §3).
 *
 * While an epic is in `phase: discovery`, its leaves cannot enter the sprint. Two
 * exemptions: a `spike` leaf, and a recorded human override. A card with no parent
 * epic is not concerned.
 */

import { describe, it, expect, afterEach } from "vitest";
import { join } from "path";
import { readFileSync } from "fs";
import { type Fixture } from "../helpers/fixtures.js";
import { createIntentFixture, writeCard } from "../helpers/cards.js";
import { parseFrontmatter, serializeFrontmatter } from "../../src/lib/frontmatter.js";
import {
  cleanReason,
  decideDiscoveryGate,
  entersSprint,
  hasDiscoveryOverride,
  type GateDecision,
} from "../../src/lib/discovery-gate.js";

let fixture: Fixture;

afterEach(() => {
  if (fixture) fixture.cleanup();
});

function setup(epicFields: Record<string, string> = { phase: "discovery" }): string {
  fixture = createIntentFixture();
  writeCard(fixture.cwd, "ISS-0010", {
    type: "epic",
    title: "Big outcome",
    fields: epicFields,
  });
  return fixture.cwd;
}

function decide(
  cwd: string,
  id: string,
  override?: string
): GateDecision {
  const fm = parseFrontmatter(
    readFileSync(
      join(cwd, ".lytos/issue-board/1-backlog", `${id}-card.md`),
      "utf-8"
    )
  )!;
  return decideDiscoveryGate(join(cwd, ".lytos"), fm, { override, by: "Tester" });
}

describe("entersSprint", () => {
  it("is true for a move into the sprint from an earlier stage, or from parked", () => {
    expect(entersSprint("1-backlog", "2-sprint")).toBe(true);
    expect(entersSprint("0-icebox", "2-sprint")).toBe(true);
    expect(entersSprint("parked", "2-sprint")).toBe(true);
  });

  it("is false for anything else: a send-back, or a move that is not into the sprint", () => {
    expect(entersSprint("3-in-progress", "2-sprint")).toBe(false);
    expect(entersSprint("4-review", "2-sprint")).toBe(false);
    expect(entersSprint("5-done", "2-sprint")).toBe(false);
    expect(entersSprint("1-backlog", "4-review")).toBe(false);
    expect(entersSprint("2-sprint", "1-backlog")).toBe(false);
    expect(entersSprint("2-sprint", "2-sprint")).toBe(false);
  });
});

describe("decideDiscoveryGate — who is refused", () => {
  it("refuses a leaf of an epic in discovery, naming the epic and the way forward", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0011", { fields: { parent: "ISS-0010" } });
    const d = decide(cwd, "ISS-0011");
    expect(d.action).toBe("refuse");
    if (d.action !== "refuse") return;
    expect(d.reason).toBe("epic-in-discovery");
    expect(d.epic).toBe("ISS-0010");
    expect(d.message).toContain("ISS-0010");
    expect(d.message).toContain("Big outcome");
    expect(d.message).toContain("discovery");
    const hints = d.hints.join("\n");
    expect(hints).toContain("phase: frozen");
    expect(hints).toContain("type: spike");
    expect(hints).toContain("--discovery-override");
  });

  it("does not concern a card that has no parent epic", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0011", { type: "fix" });
    expect(decide(cwd, "ISS-0011").action).toBe("pass");
  });

  it("does not concern a leaf whose epic is frozen", () => {
    const cwd = setup({ phase: "frozen" });
    writeCard(cwd, "ISS-0011", { fields: { parent: "ISS-0010" } });
    expect(decide(cwd, "ISS-0011").action).toBe("pass");
  });

  it("does not concern a leaf whose epic has no phase: the field is optional", () => {
    const cwd = setup({});
    writeCard(cwd, "ISS-0011", { fields: { parent: "ISS-0010" } });
    expect(decide(cwd, "ISS-0011").action).toBe("pass");
  });

  it("does not concern a card whose parent is missing or is not an epic (lint warns)", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0011", { fields: { parent: "ISS-0999" } });
    writeCard(cwd, "ISS-0012", { fields: { parent: "ISS-0013" } });
    writeCard(cwd, "ISS-0013", { fields: { phase: "discovery" } }); // a leaf, not an epic
    expect(decide(cwd, "ISS-0011").action).toBe("pass");
    expect(decide(cwd, "ISS-0012").action).toBe("pass");
  });

  it("does not concern the epic itself", () => {
    const cwd = setup();
    const fm = parseFrontmatter(
      readFileSync(join(cwd, ".lytos/issue-board/1-backlog/ISS-0010-card.md"), "utf-8")
    )!;
    expect(decideDiscoveryGate(join(cwd, ".lytos"), fm, {}).action).toBe("pass");
  });

  it("does not concern a card whose parent epic is closed and archived", () => {
    fixture = createIntentFixture();
    writeCard(fixture.cwd, "ISS-0010", {
      type: "epic",
      dir: "archive/2026-Q4",
      status: "5-done",
      fields: { phase: "discovery" },
    });
    writeCard(fixture.cwd, "ISS-0011", { fields: { parent: "ISS-0010" } });
    expect(decide(fixture.cwd, "ISS-0011").action).toBe("pass");
  });
});

describe("decideDiscoveryGate — the two exemptions", () => {
  it("lets a spike leaf through, without recording anything", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0011", { type: "spike", fields: { parent: "ISS-0010" } });
    expect(decide(cwd, "ISS-0011")).toEqual({ action: "pass" });
  });

  it("lets a leaf through when its card already records an override", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0011", {
      fields: {
        parent: "ISS-0010",
        discovery_override: "\n  reason: \"the owner asked for it\"\n  date: 2026-11-20",
      },
    });
    expect(decide(cwd, "ISS-0011")).toEqual({ action: "pass" });
  });

  it("does not take an empty override record for an override", () => {
    expect(hasDiscoveryOverride({ discovery_override: { date: "2026-11-20" } })).toBe(false);
    expect(hasDiscoveryOverride({ discovery_override: { reason: "  " } })).toBe(false);
    expect(hasDiscoveryOverride({ discovery_override: "yes" })).toBe(false);
    expect(hasDiscoveryOverride({})).toBe(false);
    expect(hasDiscoveryOverride({ discovery_override: { reason: "why" } })).toBe(true);
  });

  it("lets a leaf through with an explicit override, and returns the record to write", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0011", { fields: { parent: "ISS-0010" } });
    const d = decide(cwd, "ISS-0011", "the owner asked for it");
    expect(d.action).toBe("override");
    if (d.action !== "override") return;
    expect(d.record).toEqual({
      reason: "the owner asked for it",
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      epic: "ISS-0010",
      by: "Tester",
    });
  });

  it("refuses an override with no reason, and says a reason is required", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0011", { fields: { parent: "ISS-0010" } });
    for (const blank of ["", "   ", "\n\t"]) {
      const d = decide(cwd, "ISS-0011", blank);
      expect(d.action).toBe("refuse");
      if (d.action === "refuse") expect(d.reason).toBe("override-needs-reason");
    }
  });

  it("records nothing when the override is not needed", () => {
    const cwd = setup({ phase: "frozen" });
    writeCard(cwd, "ISS-0011", { fields: { parent: "ISS-0010" } });
    writeCard(cwd, "ISS-0012", { type: "spike", fields: { parent: "ISS-0010" } });
    expect(decide(cwd, "ISS-0011", "not needed")).toEqual({ action: "pass" });
    expect(decide(cwd, "ISS-0012", "not needed")).toEqual({ action: "pass" });
  });
});

describe("cleanReason — what is written into the card must read back unchanged", () => {
  it("collapses newlines and runs of spaces into single spaces", () => {
    expect(cleanReason("  line one\n\nline   two\t end ")).toBe("line one line two end");
  });

  it("returns an empty string for nothing but whitespace", () => {
    expect(cleanReason(" \n\t ")).toBe("");
  });

  it("drops the quote marks the frontmatter reader would strip at the ends", () => {
    expect(cleanReason('"quoted"')).toBe("quoted");
    expect(cleanReason("'single'")).toBe("single");
    expect(cleanReason('He said "go" now')).toBe("He said 'go' now");
  });

  it("round-trips through the frontmatter, whatever the reason holds", () => {
    const reasons = [
      "plain reason",
      "has: a colon",
      "has a # hash",
      'says "quoted" things',
      "ends with a quote'",
      "multi\nline\nreason",
      "[looks like a list]",
      "tab\tseparated",
    ];
    for (const raw of reasons) {
      const reason = cleanReason(raw);
      const text = serializeFrontmatter({
        id: "ISS-0001",
        discovery_override: { reason, date: "2026-11-20", epic: "ISS-0010", by: "Tester" },
      });
      const back = parseFrontmatter(text + "\n")!;
      expect((back.discovery_override as { reason: string }).reason).toBe(reason);
      expect((back.discovery_override as { date: string }).date).toBe("2026-11-20");
    }
  });
});
