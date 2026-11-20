/**
 * Integration tests for `lyt milestone` (ISS-0164) — the read-only view of
 * `.lytos/milestones/<id>.md` with its derived progress.
 */

import { describe, it, expect, afterEach } from "vitest";
import { resolve, join } from "path";
import { mkdirSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from "fs";
import { spawnSync } from "child_process";
import { createEmptyFixture, type Fixture } from "../helpers/fixtures.js";
import {
  createIntentFixture,
  moveCard,
  writeCard,
  writeMilestone,
} from "../helpers/cards.js";

const CLI = resolve(__dirname, "../../dist/cli.js");

function run(args: string, cwd: string) {
  const result = spawnSync("node", [CLI, ...args.split(" ")], {
    cwd,
    encoding: "utf-8",
    env: { ...process.env, NO_COLOR: "1" },
  });
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    exitCode: result.status ?? 0,
  };
}

let fixture: Fixture;

afterEach(() => {
  if (fixture) fixture.cleanup();
});

function project(): string {
  fixture = createIntentFixture();
  const cwd = fixture.cwd;
  writeMilestone(cwd, "v1.7", {
    title: "The intent layer",
    criteria: [
      ["Derived tree shows in the board", true],
      ["A fresh init works", false],
    ],
  });
  writeMilestone(cwd, "v2.0", { title: "Later", status: "closed" });
  writeCard(cwd, "ISS-0010", {
    type: "epic",
    title: "Intent epic",
    fields: { milestone: "v1.7", phase: "frozen" },
  });
  writeCard(cwd, "ISS-0011", {
    title: "Leaf done",
    dir: "5-done",
    fields: { parent: "ISS-0010" },
  });
  writeCard(cwd, "ISS-0012", {
    title: "Leaf open",
    dir: "2-sprint",
    fields: { parent: "ISS-0010" },
  });
  writeCard(cwd, "ISS-0013", {
    type: "fix",
    title: "Loose fix",
    fields: { milestone: "v1.7" },
  });
  return cwd;
}

describe("lyt milestone", () => {
  it("exits 2 when there is no .lytos/", () => {
    fixture = createEmptyFixture();
    const r = run("milestone", fixture.cwd);
    expect(r.exitCode).toBe(2);
    expect(r.stderr).toContain("No .lytos/");
  });

  it("lists every milestone with its derived progress", () => {
    const r = run("milestone", project());
    expect(r.exitCode).toBe(0);
    expect(r.stderr).toContain("v1.7");
    expect(r.stderr).toContain("The intent layer");
    expect(r.stderr).toMatch(/leaves\s+\S+\s+1\/3\s+33%/);
    expect(r.stderr).toContain("0/1 epics accepted");
    expect(r.stderr).toContain("v2.0");
    expect(r.stderr).toContain("closed");
  });

  it("says how to create one when there is none", () => {
    fixture = createIntentFixture();
    const r = run("milestone", fixture.cwd);
    expect(r.exitCode).toBe(0);
    expect(r.stderr).toContain("No milestones");
    expect(r.stderr).toContain(".lytos/milestones/");
  });

  it("shows one milestone: progress, epics accepted, criteria, tree", () => {
    const r = run("milestone v1.7", project());
    expect(r.exitCode).toBe(0);
    expect(r.stderr).toContain("v1.7 — The intent layer");
    expect(r.stderr).toMatch(/Leaves\s+\S+\s+1\/3\s+33%/);
    expect(r.stderr).toMatch(/Epics\s+0\/1 accepted/);
    expect(r.stderr).toMatch(/Exit criteria\s+1\/2/);
    expect(r.stderr).toContain("✓ Derived tree shows in the board");
    expect(r.stderr).toContain("○ A fresh init works");
    expect(r.stderr).toContain("ISS-0010");
    expect(r.stderr).toContain("ISS-0011");
    expect(r.stderr).toContain("ISS-0012");
    expect(r.stderr).toContain("Other leaves");
    expect(r.stderr).toContain("ISS-0013");
  });

  it("changes when a leaf moves", () => {
    const cwd = project();
    moveCard(cwd, "ISS-0012", "2-sprint", "5-done");
    expect(run("milestone v1.7", cwd).stderr).toMatch(/Leaves\s+\S+\s+2\/3\s+67%/);
  });

  it("outputs the derived view as JSON", () => {
    const r = run("milestone v1.7 --json", project());
    expect(r.exitCode).toBe(0);
    const data = JSON.parse(r.stdout);
    expect(data.id).toBe("v1.7");
    expect(data.leaves).toEqual({ done: 1, total: 3, percent: 33 });
    expect(data.epics[0].id).toBe("ISS-0010");
    expect(data.epics[0].leaves.map((l: { id: string }) => l.id)).toEqual([
      "ISS-0011",
      "ISS-0012",
    ]);
    expect(data.otherLeaves.map((l: { id: string }) => l.id)).toEqual(["ISS-0013"]);
    expect(data.exitCriteria).toHaveLength(2);
  });

  it("lists the milestones as JSON when there is no id", () => {
    const r = run("milestone --json", project());
    const data = JSON.parse(r.stdout);
    expect(data.map((m: { id: string }) => m.id)).toEqual(["v1.7", "v2.0"]);
  });

  it("exits 1 on an unknown milestone and names the ones that exist", () => {
    const r = run("milestone v9.9", project());
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("v9.9");
    expect(r.stderr).toContain("v1.7, v2.0");
  });

  it("exits 1 on an id that is not a file name, and reads nothing outside the folder", () => {
    const cwd = project();
    for (const bad of ["../manifest", "..", "a/b"]) {
      const r = run(`milestone ${bad} --json`, cwd);
      expect(r.exitCode).toBe(1);
      expect(JSON.parse(r.stdout)).toMatchObject({ status: "error" });
    }
  });

  it("is read-only: no file in the project changes", () => {
    const cwd = project();
    const snapshot = () =>
      readdirSync(join(cwd, ".lytos", "milestones")).map((f) =>
        readFileSync(join(cwd, ".lytos", "milestones", f), "utf-8")
      );
    const before = snapshot();
    run("milestone", cwd);
    run("milestone v1.7", cwd);
    expect(snapshot()).toEqual(before);
    expect(readdirSync(join(cwd, ".lytos"))).toEqual(["issue-board", "milestones"]);
  });

  it("warns about a malformed milestone file instead of failing", () => {
    const cwd = project();
    writeMilestone(cwd, "broken", { raw: "# no frontmatter\n" });
    const r = run("milestone broken", cwd);
    expect(r.exitCode).toBe(0);
    expect(r.stderr).toContain("frontmatter");
  });
});

describe("lyt milestone — a path that is not a plain file (ISS-0178)", () => {
  /** A project with one good milestone, `v1`, and the hostile entries added by each test. */
  function hostile(): { cwd: string; dir: string; outside: string } {
    fixture = createIntentFixture();
    const cwd = fixture.cwd;
    writeMilestone(cwd, "v1", { title: "Good one" });
    const outside = join(cwd, "outside.txt");
    writeFileSync(outside, "---\nid: hosts\ntitle: Leaked\nstatus: open\n---\n## Exit criteria\n- [ ] leaked line\n");
    return { cwd, dir: join(cwd, ".lytos", "milestones"), outside };
  }

  const lines = (text: string) => text.split("\n").filter((l) => l.trim() !== "");
  const noTrace = (text: string) => {
    expect(text).not.toMatch(/EISDIR|ELOOP|ENOENT|node:internal|node:fs|\n\s+at /);
  };

  it("refuses a milestone that is a directory, with one line and exit 1, not a stack trace", () => {
    const { cwd, dir } = hostile();
    mkdirSync(join(dir, "broken.md"));
    const r = run("milestone broken", cwd);
    expect(r.exitCode).toBe(1);
    expect(r.stdout).toBe("");
    expect(lines(r.stderr)).toHaveLength(1);
    expect(r.stderr).toContain(".lytos/milestones/broken.md");
    expect(r.stderr).toMatch(/directory/);
    expect(r.stderr).toMatch(/not read/);
    noTrace(r.stderr);
  });

  it("refuses a milestone that is a symbolic link, and never reads what it points at", () => {
    const { cwd, dir, outside } = hostile();
    symlinkSync(outside, join(dir, "hosts.md"));
    const r = run("milestone hosts", cwd);
    expect(r.exitCode).toBe(1);
    expect(r.stdout).toBe("");
    expect(lines(r.stderr)).toHaveLength(1);
    expect(r.stderr).toMatch(/symbolic link/);
    expect(r.stderr).not.toContain("leaked line");
    expect(r.stderr).not.toContain("Leaked");
    noTrace(r.stderr);
  });

  it("refuses a link to a directory, a dangling link, and a link inside the folder to another milestone", () => {
    const { cwd, dir } = hostile();
    mkdirSync(join(cwd, "elsewhere"));
    symlinkSync(join(cwd, "elsewhere"), join(dir, "dirlink.md"));
    symlinkSync(join(cwd, "nowhere"), join(dir, "dangling.md"));
    symlinkSync(join(dir, "v1.md"), join(dir, "alias.md"));
    for (const id of ["dirlink", "dangling", "alias"]) {
      const r = run(`milestone ${id}`, cwd);
      expect(r.exitCode, id).toBe(1);
      expect(lines(r.stderr), id).toHaveLength(1);
      expect(r.stderr, id).toMatch(/symbolic link/);
      noTrace(r.stderr);
    }
  });

  it("refuses when the milestones folder itself is a link", () => {
    fixture = createIntentFixture();
    const cwd = fixture.cwd;
    mkdirSync(join(cwd, "real-milestones"));
    writeFileSync(join(cwd, "real-milestones", "v1.md"), "---\nid: v1\ntitle: T\nstatus: open\n---\n");
    symlinkSync(join(cwd, "real-milestones"), join(cwd, ".lytos", "milestones"));
    const r = run("milestone v1", cwd);
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toMatch(/symbolic link/);
    noTrace(r.stderr);
  });

  it("says the same in JSON, with exit 1 and nothing but the error on stdout", () => {
    const { cwd, dir } = hostile();
    mkdirSync(join(dir, "broken.md"));
    const r = run("milestone broken --json", cwd);
    expect(r.exitCode).toBe(1);
    const data = JSON.parse(r.stdout);
    expect(data.status).toBe("error");
    expect(data.message).toMatch(/directory/);
  });

  it("still shows a regular file, in the same folder", () => {
    const { cwd, dir } = hostile();
    mkdirSync(join(dir, "broken.md"));
    const r = run("milestone v1", cwd);
    expect(r.exitCode).toBe(0);
    expect(r.stderr).toContain("Good one");
  });

  it("lists the good milestones, skips the others with a line each, and does not crash", () => {
    const { cwd, dir, outside } = hostile();
    mkdirSync(join(dir, "broken.md"));
    symlinkSync(outside, join(dir, "hosts.md"));
    const r = run("milestone", cwd);
    expect(r.exitCode).toBe(0);
    expect(r.stderr).toContain("Good one");
    expect(r.stderr).toMatch(/broken\.md.*directory/);
    expect(r.stderr).toMatch(/hosts\.md.*symbolic link/);
    expect(r.stderr).not.toContain("Leaked");
    noTrace(r.stderr);
  });

  it("lists as JSON only the good milestones, and keeps stdout a clean array", () => {
    const { cwd, dir, outside } = hostile();
    mkdirSync(join(dir, "broken.md"));
    symlinkSync(outside, join(dir, "hosts.md"));
    const r = run("milestone --json", cwd);
    expect(r.exitCode).toBe(0);
    expect(JSON.parse(r.stdout).map((m: { id: string }) => m.id)).toEqual(["v1"]);
    noTrace(r.stderr);
  });
});
