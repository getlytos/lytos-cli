/**
 * The derived tree and progress of an epic (ISS-0164, ADR-0009 §2).
 *
 * Children and progress are computed on read from the `parent` fields of the
 * leaves — never stored. The tests prove the derivation (a leaf that moves changes
 * the figures) and that no hand-written list or count is ever read.
 */

import { describe, it, expect, afterEach } from "vitest";
import { join } from "path";
import { readFileSync } from "fs";
import { type Fixture } from "../helpers/fixtures.js";
import { createIntentFixture, moveCard, writeCard } from "../helpers/cards.js";
import { loadIntentCards } from "../../src/lib/intent.js";
import {
  buildEpicViews,
  describeIntent,
  progressOf,
} from "../../src/lib/intent-tree.js";
import { parseFrontmatter } from "../../src/lib/frontmatter.js";

let fixture: Fixture;

afterEach(() => {
  if (fixture) fixture.cleanup();
});

function setup(): string {
  fixture = createIntentFixture();
  return fixture.cwd;
}

function views(cwd: string) {
  return buildEpicViews(loadIntentCards(join(cwd, ".lytos")));
}

describe("progressOf", () => {
  it("counts the leaves in 5-done", () => {
    expect(progressOf(["5-done", "1-backlog", "5-done", "parked"])).toEqual({
      done: 2,
      total: 4,
      percent: 50,
    });
  });

  it("is 0 of 0 for an epic with no leaf yet, not a division by zero", () => {
    expect(progressOf([])).toEqual({ done: 0, total: 0, percent: 0 });
  });

  it("rounds the percentage", () => {
    expect(progressOf(["5-done", "1-backlog", "1-backlog"]).percent).toBe(33);
    expect(progressOf(["5-done", "5-done", "1-backlog"]).percent).toBe(67);
  });
});

describe("buildEpicViews", () => {
  it("derives the leaves and the progress of an epic from the parent fields", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0010", { type: "epic", title: "Outcome" });
    writeCard(cwd, "ISS-0011", { dir: "5-done", fields: { parent: "ISS-0010" } });
    writeCard(cwd, "ISS-0012", { dir: "2-sprint", fields: { parent: "ISS-0010" } });
    writeCard(cwd, "ISS-0013", { dir: "1-backlog", fields: { parent: "ISS-0010" } });
    const [epic] = views(cwd);
    expect(epic.id).toBe("ISS-0010");
    expect(epic.leaves.map((l) => [l.id, l.status])).toEqual([
      ["ISS-0011", "5-done"],
      ["ISS-0012", "2-sprint"],
      ["ISS-0013", "1-backlog"],
    ]);
    expect(epic.progress).toEqual({ done: 1, total: 3, percent: 33 });
  });

  it("changes when a leaf moves", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0010", { type: "epic" });
    writeCard(cwd, "ISS-0011", { fields: { parent: "ISS-0010" } });
    expect(views(cwd)[0].progress.done).toBe(0);

    moveCard(cwd, "ISS-0011", "1-backlog", "5-done");
    expect(views(cwd)[0].progress).toEqual({ done: 1, total: 1, percent: 100 });
    expect(views(cwd)[0].leaves[0].status).toBe("5-done");
  });

  it("counts an archived leaf as done: archiving must not lower the progress", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0010", { type: "epic" });
    writeCard(cwd, "ISS-0011", {
      dir: "archive/2026-Q4",
      status: "5-done",
      fields: { parent: "ISS-0010" },
    });
    writeCard(cwd, "ISS-0012", { fields: { parent: "ISS-0010" } });
    expect(views(cwd)[0].progress).toEqual({ done: 1, total: 2, percent: 50 });
  });

  it("counts a parked leaf as not done", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0010", { type: "epic" });
    writeCard(cwd, "ISS-0011", { dir: "parked", fields: { parent: "ISS-0010" } });
    expect(views(cwd)[0].progress).toEqual({ done: 0, total: 1, percent: 0 });
  });

  it("carries the phase and the milestone of the epic", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0010", {
      type: "epic",
      fields: { phase: "discovery", milestone: "v1.7" },
    });
    expect(views(cwd)[0]).toMatchObject({ phase: "discovery", milestone: "v1.7" });
  });

  it("returns nothing when no card is an epic", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0001");
    writeCard(cwd, "ISS-0002", { fields: { depends: "[ISS-0001]" } });
    expect(views(cwd)).toEqual([]);
  });

  it("does not file a card under something that is not an epic", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0010", { type: "epic" });
    writeCard(cwd, "ISS-0011", { fields: { parent: "ISS-0010" } });
    writeCard(cwd, "ISS-0012", { fields: { parent: "ISS-0011" } }); // a depth of three
    writeCard(cwd, "ISS-0013", { fields: { parent: "ISS-0999" } }); // an orphan
    const [epic] = views(cwd);
    expect(epic.leaves.map((l) => l.id)).toEqual(["ISS-0011"]);
  });

  it("does not file an epic under another epic", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0010", { type: "epic" });
    writeCard(cwd, "ISS-0011", { type: "epic", fields: { parent: "ISS-0010" } });
    const all = views(cwd);
    expect(all.map((e) => e.id)).toEqual(["ISS-0010", "ISS-0011"]);
    expect(all[0].leaves).toEqual([]);
  });

  it("leaves an archived epic out: it is history", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0010", {
      type: "epic",
      dir: "archive/2026-Q4",
      status: "5-done",
    });
    expect(views(cwd)).toEqual([]);
  });

  it("orders epics and leaves by id", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0020", { type: "epic" });
    writeCard(cwd, "ISS-0010", { type: "epic" });
    writeCard(cwd, "ISS-0023", { fields: { parent: "ISS-0010" } });
    writeCard(cwd, "ISS-0021", { fields: { parent: "ISS-0010" } });
    const all = views(cwd);
    expect(all.map((e) => e.id)).toEqual(["ISS-0010", "ISS-0020"]);
    expect(all[0].leaves.map((l) => l.id)).toEqual(["ISS-0021", "ISS-0023"]);
  });
});

describe("nothing is read from a hand-written list or count", () => {
  it("ignores children, progress and counts written into the epic", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0010", {
      type: "epic",
      fields: {
        children: "[ISS-0098, ISS-0099]",
        leaves: "[ISS-0098]",
        progress: "100",
        done: "9",
        total: "9",
      },
    });
    writeCard(cwd, "ISS-0011", { fields: { parent: "ISS-0010" } });
    const [epic] = views(cwd);
    expect(epic.leaves.map((l) => l.id)).toEqual(["ISS-0011"]);
    expect(epic.progress).toEqual({ done: 0, total: 1, percent: 0 });
  });

  it("writes nothing: reading the tree leaves every card byte for byte as it was", () => {
    const cwd = setup();
    const epic = writeCard(cwd, "ISS-0010", { type: "epic" });
    const leaf = writeCard(cwd, "ISS-0011", { fields: { parent: "ISS-0010" } });
    const before = [readFileSync(epic, "utf-8"), readFileSync(leaf, "utf-8")];
    views(cwd);
    describeIntent(join(cwd, ".lytos"), "ISS-0010", parseFrontmatter(before[0])!);
    expect([readFileSync(epic, "utf-8"), readFileSync(leaf, "utf-8")]).toEqual(before);
  });
});

describe("describeIntent", () => {
  function detail(cwd: string, id: string, content: string) {
    return describeIntent(join(cwd, ".lytos"), id, parseFrontmatter(content)!);
  }

  it("is undefined for a card that adopts none of the fields", () => {
    const cwd = setup();
    const path = writeCard(cwd, "ISS-0001");
    expect(detail(cwd, "ISS-0001", readFileSync(path, "utf-8"))).toBeUndefined();
  });

  it("gives an epic its leaves and its progress", () => {
    const cwd = setup();
    const epic = writeCard(cwd, "ISS-0010", {
      type: "epic",
      fields: { phase: "discovery", milestone: "v1.7" },
    });
    writeCard(cwd, "ISS-0011", { dir: "5-done", fields: { parent: "ISS-0010" } });
    writeCard(cwd, "ISS-0012", { fields: { parent: "ISS-0010" } });
    const d = detail(cwd, "ISS-0010", readFileSync(epic, "utf-8"))!;
    expect(d.phase).toBe("discovery");
    expect(d.milestone).toBe("v1.7");
    expect(d.leaves!.map((l) => l.id)).toEqual(["ISS-0011", "ISS-0012"]);
    expect(d.progress).toEqual({ done: 1, total: 2, percent: 50 });
    expect(d.parent).toBeUndefined();
  });

  it("gives a leaf its epic", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0010", {
      type: "epic",
      title: "Outcome",
      fields: { phase: "discovery" },
    });
    const leaf = writeCard(cwd, "ISS-0011", { fields: { parent: "ISS-0010" } });
    const d = detail(cwd, "ISS-0011", readFileSync(leaf, "utf-8"))!;
    expect(d.parent).toEqual({
      id: "ISS-0010",
      title: "Outcome",
      status: "1-backlog",
      phase: "discovery",
      found: true,
    });
    expect(d.leaves).toBeUndefined();
  });

  it("says so when the parent is not on the board", () => {
    const cwd = setup();
    const leaf = writeCard(cwd, "ISS-0011", { fields: { parent: "ISS-0999" } });
    const d = detail(cwd, "ISS-0011", readFileSync(leaf, "utf-8"))!;
    expect(d.parent).toMatchObject({ id: "ISS-0999", found: false });
  });
});
