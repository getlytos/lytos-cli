/**
 * Milestone files and their derived progress (ISS-0164, ADR-0009 §1).
 *
 * A milestone lives in `.lytos/milestones/<id>.md` (frontmatter: id, title,
 * status; the exit criteria are a checklist in the body). Its progress is derived
 * from the epics and leaves that name it — directly, or through their epic.
 */

import { describe, it, expect, afterEach } from "vitest";
import { join } from "path";
import { mkdirSync, symlinkSync, writeFileSync } from "fs";
import { type Fixture } from "../helpers/fixtures.js";
import {
  createIntentFixture,
  moveCard,
  writeCard,
  writeMilestone,
} from "../helpers/cards.js";
import {
  listMilestoneIds,
  milestoneRefusal,
  milestoneSummaries,
  milestoneView,
  readMilestone,
  skippedMilestones,
} from "../../src/lib/milestone.js";

let fixture: Fixture;

afterEach(() => {
  if (fixture) fixture.cleanup();
});

function setup(): string {
  fixture = createIntentFixture();
  return fixture.cwd;
}

const lytos = (cwd: string) => join(cwd, ".lytos");

describe("readMilestone", () => {
  it("reads the frontmatter and the exit criteria checklist", () => {
    const cwd = setup();
    writeMilestone(cwd, "v1.7", {
      title: "The intent layer",
      status: "open",
      criteria: [
        ["Epics and leaves are derived", true],
        ["A fresh init works", false],
      ],
    });
    const m = readMilestone(lytos(cwd), "v1.7")!;
    expect(m).toMatchObject({
      id: "v1.7",
      title: "The intent layer",
      status: "open",
      problems: [],
    });
    expect(m.exitCriteria).toEqual([
      { text: "Epics and leaves are derived", done: true },
      { text: "A fresh init works", done: false },
    ]);
  });

  it("has no exit criteria when the file declares none", () => {
    const cwd = setup();
    writeMilestone(cwd, "v1.7");
    expect(readMilestone(lytos(cwd), "v1.7")!.exitCriteria).toEqual([]);
  });

  it("reads only the exit criteria section, not other checklists", () => {
    const cwd = setup();
    writeMilestone(cwd, "v1.7", {
      raw: [
        "---",
        "id: v1.7",
        'title: "T"',
        "status: open",
        "---",
        "",
        "## Notes",
        "",
        "- [x] a note that looks like a task",
        "",
        "## Exit criteria",
        "",
        "- [ ] the only criterion",
        "",
        "## Later",
        "",
        "- [ ] another list",
        "",
      ].join("\n"),
    });
    expect(readMilestone(lytos(cwd), "v1.7")!.exitCriteria).toEqual([
      { text: "the only criterion", done: false },
    ]);
  });

  it("returns null for a milestone that has no file", () => {
    const cwd = setup();
    expect(readMilestone(lytos(cwd), "v9.9")).toBeNull();
  });

  it("returns null for an id that could leave the folder, and never reads outside it", () => {
    const cwd = setup();
    writeCard(cwd, "ISS-0001");
    expect(readMilestone(lytos(cwd), "../issue-board/1-backlog/ISS-0001-card")).toBeNull();
    expect(readMilestone(lytos(cwd), "..")).toBeNull();
    expect(readMilestone(lytos(cwd), "a/b")).toBeNull();
  });

  it("reports a file with no frontmatter instead of failing", () => {
    const cwd = setup();
    writeMilestone(cwd, "v1.7", { raw: "# just a heading\n" });
    const m = readMilestone(lytos(cwd), "v1.7")!;
    expect(m.id).toBe("v1.7");
    expect(m.problems).toEqual([expect.stringContaining("frontmatter")]);
  });

  it("reports a frontmatter id that differs from the file name", () => {
    const cwd = setup();
    writeMilestone(cwd, "v1.7", {
      raw: "---\nid: v2.0\ntitle: T\nstatus: open\n---\n",
    });
    const m = readMilestone(lytos(cwd), "v1.7")!;
    expect(m.id).toBe("v1.7");
    expect(m.problems).toEqual([expect.stringContaining("v2.0")]);
  });
});

describe("listMilestoneIds", () => {
  it("lists the milestone files by id, sorted", () => {
    const cwd = setup();
    writeMilestone(cwd, "v2.0");
    writeMilestone(cwd, "v1.7");
    expect(listMilestoneIds(lytos(cwd))).toEqual(["v1.7", "v2.0"]);
  });

  it("is empty when there is no milestones folder", () => {
    const cwd = setup();
    expect(listMilestoneIds(lytos(cwd))).toEqual([]);
  });
});

describe("milestoneView — progress derived from epics and leaves", () => {
  function sample(): string {
    const cwd = setup();
    writeMilestone(cwd, "v1.7", {
      criteria: [
        ["one", true],
        ["two", false],
        ["three", false],
      ],
    });
    writeCard(cwd, "ISS-0010", { type: "epic", fields: { milestone: "v1.7" } });
    // Two leaves under the epic: one names the milestone itself, one inherits it.
    writeCard(cwd, "ISS-0011", {
      dir: "5-done",
      fields: { parent: "ISS-0010", milestone: "v1.7" },
    });
    writeCard(cwd, "ISS-0012", { dir: "2-sprint", fields: { parent: "ISS-0010" } });
    // A standalone fix that names the milestone.
    writeCard(cwd, "ISS-0013", {
      type: "fix",
      dir: "5-done",
      fields: { milestone: "v1.7" },
    });
    // Elsewhere: another milestone, and no milestone at all.
    writeCard(cwd, "ISS-0014", { fields: { milestone: "v2.0" } });
    writeCard(cwd, "ISS-0015");
    return cwd;
  }

  it("counts the leaves that name the milestone, directly or through their epic", () => {
    const view = milestoneView(lytos(sample()), "v1.7")!;
    expect(view.leaves).toEqual({ done: 2, total: 3, percent: 67 });
    expect(view.epics.map((e) => [e.id, e.leaves.map((l) => l.id)])).toEqual([
      ["ISS-0010", ["ISS-0011", "ISS-0012"]],
    ]);
    expect(view.otherLeaves.map((l) => l.id)).toEqual(["ISS-0013"]);
  });

  it("counts an epic as accepted only when the epic card itself is done", () => {
    const cwd = sample();
    // Every leaf done is not the epic's acceptance (ADR-0009 §1).
    moveCard(cwd, "ISS-0012", "2-sprint", "5-done");
    let view = milestoneView(lytos(cwd), "v1.7")!;
    expect(view.leaves.done).toBe(3);
    expect(view.epicsAccepted).toEqual({ done: 0, total: 1, percent: 0 });

    moveCard(cwd, "ISS-0010", "1-backlog", "5-done");
    view = milestoneView(lytos(cwd), "v1.7")!;
    expect(view.epicsAccepted).toEqual({ done: 1, total: 1, percent: 100 });
  });

  it("derives the exit criteria count from the ticks", () => {
    expect(milestoneView(lytos(sample()), "v1.7")!.criteria).toEqual({
      done: 1,
      total: 3,
      percent: 33,
    });
  });

  it("lets a leaf name another milestone than its epic's", () => {
    const cwd = sample();
    // Rewrite ISS-0012 in place (same folder, same file) to name v2.0 itself.
    writeCard(cwd, "ISS-0012", {
      dir: "2-sprint",
      fields: { parent: "ISS-0010", milestone: "v2.0" },
    });
    writeMilestone(cwd, "v2.0");
    expect(milestoneView(lytos(cwd), "v1.7")!.leaves.total).toBe(2);
    expect(milestoneView(lytos(cwd), "v2.0")!.leaves.total).toBe(2); // ISS-0012, ISS-0014
  });

  it("counts an archived leaf as done", () => {
    const cwd = sample();
    writeCard(cwd, "ISS-0016", {
      dir: "archive/2026-Q4",
      status: "5-done",
      fields: { milestone: "v1.7" },
    });
    expect(milestoneView(lytos(cwd), "v1.7")!.leaves).toEqual({
      done: 3,
      total: 4,
      percent: 75,
    });
  });

  it("changes when a leaf moves", () => {
    const cwd = sample();
    expect(milestoneView(lytos(cwd), "v1.7")!.leaves.done).toBe(2);
    moveCard(cwd, "ISS-0012", "2-sprint", "5-done");
    expect(milestoneView(lytos(cwd), "v1.7")!.leaves).toEqual({
      done: 3,
      total: 3,
      percent: 100,
    });
    moveCard(cwd, "ISS-0012", "5-done", "parked");
    expect(milestoneView(lytos(cwd), "v1.7")!.leaves.done).toBe(2);
  });

  it("is progress 0 of 0 for a milestone nothing names yet", () => {
    const cwd = setup();
    writeMilestone(cwd, "v3.0");
    const view = milestoneView(lytos(cwd), "v3.0")!;
    expect(view.leaves).toEqual({ done: 0, total: 0, percent: 0 });
    expect(view.epics).toEqual([]);
  });

  it("returns null for an unknown milestone", () => {
    const cwd = setup();
    expect(milestoneView(lytos(cwd), "nope")).toBeNull();
  });

  it("summarizes every milestone, sorted by id", () => {
    const cwd = sample();
    writeMilestone(cwd, "v2.0", { status: "closed" });
    const all = milestoneSummaries(lytos(cwd));
    expect(all.map((m) => [m.id, m.status, m.leaves.total])).toEqual([
      ["v1.7", "open", 3],
      ["v2.0", "closed", 1],
    ]);
  });
});

describe("milestone files that are not plain files (ISS-0178)", () => {
  it("does not read a directory, a link, a dangling link, or anything behind a linked folder", () => {
    const cwd = setup();
    writeMilestone(cwd, "good");
    const dir = join(cwd, ".lytos", "milestones");
    mkdirSync(join(dir, "dir.md"));
    const target = join(cwd, "target.md");
    writeFileSync(target, "---\nid: link\ntitle: T\nstatus: open\n---\n");
    symlinkSync(target, join(dir, "link.md"));
    symlinkSync(join(cwd, "nowhere"), join(dir, "dangling.md"));

    expect(readMilestone(lytos(cwd), "good")).not.toBeNull();
    for (const id of ["dir", "link", "dangling"]) expect(readMilestone(lytos(cwd), id), id).toBeNull();
    expect(listMilestoneIds(lytos(cwd))).toEqual(["good"]);
    expect(milestoneSummaries(lytos(cwd)).map((m) => m.id)).toEqual(["good"]);
  });

  it("names why a path is refused, and nothing for a plain or a missing file", () => {
    const cwd = setup();
    writeMilestone(cwd, "good");
    const dir = join(cwd, ".lytos", "milestones");
    mkdirSync(join(dir, "dir.md"));
    symlinkSync(join(cwd, "x"), join(dir, "link.md"));
    expect(milestoneRefusal(lytos(cwd), "good")).toBeNull();
    expect(milestoneRefusal(lytos(cwd), "missing")).toBeNull();
    expect(milestoneRefusal(lytos(cwd), "dir")).toBe(".lytos/milestones/dir.md is a directory, not a regular file: it is not read");
    expect(milestoneRefusal(lytos(cwd), "link")).toBe(".lytos/milestones/link.md is a symbolic link: it is not read");
  });

  it("refuses everything in a milestones folder that is itself a link", () => {
    const cwd = setup();
    mkdirSync(join(cwd, "real"));
    writeFileSync(join(cwd, "real", "v1.md"), "---\nid: v1\ntitle: T\nstatus: open\n---\n");
    symlinkSync(join(cwd, "real"), join(cwd, ".lytos", "milestones"));
    expect(readMilestone(lytos(cwd), "v1")).toBeNull();
    expect(listMilestoneIds(lytos(cwd))).toEqual([]);
    expect(milestoneRefusal(lytos(cwd), "v1")).toBe(".lytos/milestones is a symbolic link: it is not read");
  });

  it("lists the entries it skipped, so the command can say so", () => {
    const cwd = setup();
    writeMilestone(cwd, "good");
    const dir = join(cwd, ".lytos", "milestones");
    mkdirSync(join(dir, "dir.md"));
    symlinkSync(join(cwd, "x"), join(dir, "link.md"));
    expect(skippedMilestones(lytos(cwd))).toEqual([
      ".lytos/milestones/dir.md is a directory, not a regular file: it is not read",
      ".lytos/milestones/link.md is a symbolic link: it is not read",
    ]);
  });
});
