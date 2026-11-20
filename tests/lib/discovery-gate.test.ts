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
import { parseFrontmatter } from "../../src/lib/frontmatter.js";
import {
  decideDiscoveryGate,
  leavesTheBacklog,
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

describe("leavesTheBacklog — where the gate runs, and what a send-back is", () => {
  const BEYOND = ["2-sprint", "3-in-progress", "4-review", "5-done"];

  it("is true for any move out of the icebox, the backlog or parked into a stage beyond the backlog", () => {
    for (const from of ["0-icebox", "1-backlog", "parked"]) {
      for (const to of BEYOND) expect(leavesTheBacklog(from, to), `${from} -> ${to}`).toBe(true);
    }
  });

  it("is false between the stages before the sprint: nothing has been committed yet", () => {
    expect(leavesTheBacklog("1-backlog", "0-icebox")).toBe(false);
    expect(leavesTheBacklog("0-icebox", "1-backlog")).toBe(false);
    expect(leavesTheBacklog("parked", "1-backlog")).toBe(false);
    expect(leavesTheBacklog("parked", "0-icebox")).toBe(false);
  });

  it("is false for a send-back: a card that is already in the sprint or beyond, going anywhere", () => {
    // Every way into those stages is gated (move, start, claim, unpark, and close),
    // so a card found there is not asked again.
    for (const from of BEYOND) {
      for (const to of ["0-icebox", "1-backlog", "2-sprint", "4-review", "parked"]) {
        expect(leavesTheBacklog(from, to), `${from} -> ${to}`).toBe(false);
      }
    }
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
        discovery_override:
          '\n  reason: "the owner asked for it"\n  date: 2026-11-20\n  epic: ISS-0010\n  by: Someone',
      },
    });
    expect(decide(cwd, "ISS-0011")).toEqual({ action: "pass" });
  });

  it("does not let a leaf through on a bare record, and says the record does not count", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0011", {
      fields: { parent: "ISS-0010", discovery_override: "\n  reason: x" },
    });
    const d = decide(cwd, "ISS-0011");
    expect(d.action).toBe("refuse");
    if (d.action !== "refuse") return;
    expect(d.hints.join("\n")).toMatch(/discovery_override.*(incomplete|missing).*does not count/s);
    expect(d.hints.join("\n")).toContain("date, by, epic");
  });

  it("does not let a leaf through on a record made for another epic", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0011", {
      fields: {
        parent: "ISS-0010",
        discovery_override:
          '\n  reason: "fine"\n  date: 2026-11-20\n  epic: ISS-0099\n  by: Someone',
      },
    });
    const d = decide(cwd, "ISS-0011");
    expect(d.action).toBe("refuse");
    if (d.action === "refuse") expect(d.hints.join("\n")).toContain("ISS-0099");
  });

  it("replaces an invalid record with a new, complete one when a person overrides", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0011", {
      fields: { parent: "ISS-0010", discovery_override: "\n  reason: x" },
    });
    expect(decide(cwd, "ISS-0011", "a real reason").action).toBe("override");
  });

  it("says the override is a person's decision, so an agent never takes it on itself", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0011", { fields: { parent: "ISS-0010" } });
    const d = decide(cwd, "ISS-0011");
    expect(d.action).toBe("refuse");
    if (d.action !== "refuse") return;
    const text = `${d.message}\n${d.hints.join("\n")}`;
    expect(text).toMatch(/a person must decide/i);
    expect(text).toMatch(/never (passed|passes|taken) by an agent|an agent or a wrapper never/i);
  });

  it("refuses a reason that is nothing but dashes, as no reason at all", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0011", { fields: { parent: "ISS-0010" } });
    for (const raw of ["---", "-----"]) {
      const d = decide(cwd, "ISS-0011", raw);
      expect(d.action, raw).toBe("refuse");
      if (d.action === "refuse") expect(d.reason).toBe("override-needs-reason");
    }
  });

  it("writes a reason that cannot be read as a delimiter, and a clean author", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0011", { fields: { parent: "ISS-0010" } });
    const fm = parseFrontmatter(
      readFileSync(join(cwd, ".lytos/issue-board/1-backlog/ISS-0011-card.md"), "utf-8")
    )!;
    const d = decideDiscoveryGate(join(cwd, ".lytos"), fm, { override: "agreed ---", by: "---\nstatus: x" });
    expect(d.action).toBe("override");
    if (d.action !== "override") return;
    expect(d.record.reason).toBe("agreed -");
    expect(d.record.by).toBe("status: x");
    const blank = decideDiscoveryGate(join(cwd, ".lytos"), fm, { override: "ok", by: "---" });
    if (blank.action === "override") expect(blank.record.by).toBe("unknown");
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
