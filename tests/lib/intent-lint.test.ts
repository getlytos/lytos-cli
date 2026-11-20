/**
 * The intent layer's lint rules (ISS-0163, ADR-0009 §2).
 *
 * Four rules, all warnings: `parent` points at an existing epic, the depth is at
 * most two, `phase` only on an epic, `milestone` names an existing file. Each has
 * a negative case, and a card that adopts none of the fields is never flagged.
 */

import { describe, it, expect, afterEach } from "vitest";
import { join } from "path";
import { type Fixture } from "../helpers/fixtures.js";
import {
  createIntentFixture,
  writeCard,
  writeMilestone,
} from "../helpers/cards.js";
import { lintIntent } from "../../src/lib/intent-lint.js";

let fixture: Fixture;

afterEach(() => {
  if (fixture) fixture.cleanup();
});

function setup(): string {
  fixture = createIntentFixture();
  return fixture.cwd;
}

function findings(cwd: string) {
  return lintIntent(join(cwd, ".lytos"));
}

function messages(cwd: string): string[] {
  return findings(cwd).map((f) => f.message);
}

describe("lintIntent — a project that adopts nothing", () => {
  it("reports nothing for cards that use none of the new fields", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0001");
    writeCard(cwd, "ISS-0002", { type: "fix", dir: "2-sprint" });
    writeCard(cwd, "ISS-0003", { type: "chore", dir: "5-done" });
    expect(findings(cwd)).toEqual([]);
  });

  it("reports nothing when there is no board at all", () => {
    fixture = createIntentFixture();
    expect(lintIntent(join(fixture.cwd, "no-such-dir"))).toEqual([]);
  });

  it("treats an empty value as an absent field", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0001", {
      fields: { parent: '""', phase: '""', milestone: '""' },
    });
    expect(findings(cwd)).toEqual([]);
  });

  it("accepts an epic with no phase: the field is optional", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0010", { type: "epic" });
    expect(findings(cwd)).toEqual([]);
  });
});

describe("lintIntent — a well-formed epic and its leaves", () => {
  it("is silent for an epic, two leaves and a milestone", () => {
    const cwd = setup();
    writeMilestone(cwd, "v1.7");
    writeCard(cwd, "ISS-0010", {
      type: "epic",
      fields: { phase: "frozen", milestone: "v1.7" },
    });
    writeCard(cwd, "ISS-0011", {
      fields: { parent: "ISS-0010", milestone: "v1.7" },
    });
    writeCard(cwd, "ISS-0012", { fields: { parent: "ISS-0010" } });
    expect(findings(cwd)).toEqual([]);
  });

  it("accepts both phases on an epic", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0010", {
      type: "epic",
      fields: { phase: "discovery" },
    });
    writeCard(cwd, "ISS-0011", { type: "epic", fields: { phase: "frozen" } });
    expect(findings(cwd)).toEqual([]);
  });

  it("finds an epic that has been archived", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0010", {
      type: "epic",
      dir: "archive/2026-Q4",
      status: "5-done",
    });
    writeCard(cwd, "ISS-0011", {
      dir: "5-done",
      fields: { parent: "ISS-0010" },
    });
    expect(findings(cwd)).toEqual([]);
  });

  it("matches ids without regard to case", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0010", { type: "epic" });
    writeCard(cwd, "ISS-0011", { fields: { parent: "iss-0010" } });
    expect(findings(cwd)).toEqual([]);
  });
});

describe("lintIntent — parent points at an existing epic", () => {
  it("warns on a parent that does not exist, with the remedy", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0011", { fields: { parent: "ISS-0999" } });
    const found = findings(cwd);
    expect(found).toHaveLength(1);
    expect(found[0].severity).toBe("warning");
    expect(found[0].file).toBe("issue-board/1-backlog/ISS-0011-card.md");
    expect(found[0].message).toContain("ISS-0999");
    expect(found[0].message).toContain("no card");
    expect(found[0].fix).toContain("Create the epic");
  });

  it("warns on a parent that is not an epic", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0010", { type: "feat" });
    writeCard(cwd, "ISS-0011", { fields: { parent: "ISS-0010" } });
    const found = findings(cwd);
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain("not an epic");
    expect(found[0].fix).toContain("type: epic");
  });

  it("warns on a parent written as a list: one card id only", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0010", { type: "epic" });
    writeCard(cwd, "ISS-0011", { type: "epic" });
    writeCard(cwd, "ISS-0012", { fields: { parent: "[ISS-0010, ISS-0011]" } });
    const found = findings(cwd);
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain("single card id");
  });

  it("warns on a parent that is not a card id at all", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0011", { fields: { parent: "the-big-one" } });
    expect(messages(cwd)).toEqual([
      expect.stringContaining("not a card id"),
    ]);
  });
});

describe("lintIntent — depth is at most two", () => {
  it("warns on an epic that has a parent", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0010", { type: "epic" });
    writeCard(cwd, "ISS-0011", {
      type: "epic",
      fields: { parent: "ISS-0010" },
    });
    const found = findings(cwd);
    expect(found).toHaveLength(1);
    expect(found[0].file).toContain("ISS-0011");
    expect(found[0].message).toContain("an epic has no parent");
    expect(found[0].fix).toContain("depth is at most two");
  });

  it("warns on a third level: a leaf under a leaf that has a parent", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0010", { type: "epic" });
    writeCard(cwd, "ISS-0011", { fields: { parent: "ISS-0010" } });
    writeCard(cwd, "ISS-0012", { fields: { parent: "ISS-0011" } });
    const found = findings(cwd);
    expect(found).toHaveLength(1);
    expect(found[0].file).toContain("ISS-0012");
    expect(found[0].message).toContain("depth would be three");
    expect(found[0].fix).toContain("sibling");
  });

  it("warns on a card that is its own parent", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0011", { fields: { parent: "ISS-0011" } });
    expect(messages(cwd)).toEqual([
      expect.stringContaining("its own parent"),
    ]);
  });
});

describe("lintIntent — phase belongs to an epic", () => {
  it("warns on a phase set on a leaf", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0011", { fields: { phase: "discovery" } });
    const found = findings(cwd);
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain("phase");
    expect(found[0].message).toContain("not an epic");
    expect(found[0].fix).toContain("Remove `phase`");
  });

  it("warns on a phase that is neither discovery nor frozen", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0010", { type: "epic", fields: { phase: "draft" } });
    const found = findings(cwd);
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain("Invalid `phase`");
    expect(found[0].fix).toContain("discovery, frozen");
  });

  it("flags a card in a closed or parked state too", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0011", { dir: "parked", fields: { phase: "frozen" } });
    expect(findings(cwd)).toHaveLength(1);
  });
});

describe("lintIntent — milestone names an existing file", () => {
  it("warns on a milestone with no file under .lytos/milestones/", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0011", { fields: { milestone: "v9.9" } });
    const found = findings(cwd);
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain("v9.9");
    expect(found[0].message).toContain(".lytos/milestones/v9.9.md");
    expect(found[0].fix).toContain("Create .lytos/milestones/v9.9.md");
  });

  it("accepts the milestone once its file exists", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0011", { fields: { milestone: "v1.7" } });
    expect(findings(cwd)).toHaveLength(1);
    writeMilestone(cwd, "v1.7");
    expect(findings(cwd)).toEqual([]);
  });

  it("refuses an id that could leave the milestones folder", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0011", { fields: { milestone: "../manifest" } });
    const found = findings(cwd);
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain("not a valid milestone id");
  });

  it("applies to an epic as well as to a leaf", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0010", { type: "epic", fields: { milestone: "nope" } });
    expect(findings(cwd)).toHaveLength(1);
  });
});

describe("lintIntent — never an error", () => {
  it("emits only warnings, whatever is wrong", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0010", {
      type: "epic",
      fields: { parent: "ISS-0999", phase: "draft", milestone: "nope" },
    });
    writeCard(cwd, "ISS-0011", {
      fields: { parent: "[a, b]", phase: "frozen", milestone: "../x" },
    });
    const found = findings(cwd);
    expect(found.length).toBeGreaterThanOrEqual(5);
    expect(found.every((f) => f.severity === "warning")).toBe(true);
  });
});
