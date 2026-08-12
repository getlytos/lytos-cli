/**
 * Integration tests for `lyt next` — loop-eligible selection (ISS-0099).
 */

import { describe, it, expect, afterEach } from "vitest";
import { resolve } from "path";
import { mkdirSync, writeFileSync } from "fs";
import { createEmptyFixture, type Fixture } from "../helpers/fixtures.js";

const CLI = resolve(__dirname, "../../dist/cli.js");

function run(args: string, cwd: string): { stdout: string; stderr: string; exitCode: number } {
  const { spawnSync } = require("child_process");
  const result = spawnSync("node", [CLI, ...args.split(" ")], { cwd, encoding: "utf-8" });
  return { stdout: result.stdout || "", stderr: result.stderr || "", exitCode: result.status ?? 0 };
}

const AUTO_DOD = "## Definition of done\n\n- [ ] Ship it — verify: auto\n";
const HUMAN_DOD = "## Definition of done\n\n- [ ] Looks right — verify: human\n";

function issue(id: string, opts: { status: string; priority?: string; depends?: string; dod?: string; risk?: string }): string {
  const risk = opts.risk ? `risk: ${opts.risk}\n` : "";
  // The out-of-scope must sit in `## Ready` to count (ISS-0115 audit, 2026-08-12) —
  // a loose mention anywhere in the fiche no longer makes an issue ready.
  const body = `## Ready\n\n- **Out of scope** — none.\n\n${opts.dod ?? "## Context\n\nno dod\n"}\n`;
  return `---\nid: ${id}\ntitle: "${id} title"\ntype: feat\npriority: ${opts.priority ?? "P2-normal"}\neffort: S\n${risk}status: ${opts.status}\ndepends: [${opts.depends ?? ""}]\ncreated: 2026-08-01\n---\n\n# ${id}\n\n${body}`;
}

function createFixture(cwd: string): void {
  const lyt = (p: string) => resolve(cwd, ".lytos", p);
  for (const dir of [
    "issue-board/0-icebox", "issue-board/1-backlog", "issue-board/2-sprint",
    "issue-board/3-in-progress", "issue-board/4-review", "issue-board/5-done",
  ]) {
    mkdirSync(lyt(dir), { recursive: true });
  }
  const w = (dir: string, id: string, content: string) =>
    writeFileSync(lyt(`issue-board/${dir}/${id}.md`), content);

  w("5-done", "ISS-0010-dep-done", issue("ISS-0010", { status: "5-done" }));
  w("1-backlog", "ISS-0011-dep-pending", issue("ISS-0011", { status: "1-backlog" }));

  // Eligible (ready: risk + out-of-scope, deps done, DoD auto), P1
  w("2-sprint", "ISS-0001-a", issue("ISS-0001", { status: "2-sprint", priority: "P1-high", depends: "ISS-0010", dod: AUTO_DOD, risk: "low" }));
  // Eligible, P0 → should be the pick
  w("2-sprint", "ISS-0002-b", issue("ISS-0002", { status: "2-sprint", priority: "P0-critical", dod: AUTO_DOD, risk: "high" }));
  // Blocked: deps pending (ready otherwise)
  w("2-sprint", "ISS-0003-c", issue("ISS-0003", { status: "2-sprint", depends: "ISS-0011", dod: AUTO_DOD, risk: "low" }));
  // Blocked: all-human DoD
  w("2-sprint", "ISS-0004-d", issue("ISS-0004", { status: "2-sprint", dod: HUMAN_DOD }));
  // Blocked: no DoD
  w("2-sprint", "ISS-0005-e", issue("ISS-0005", { status: "2-sprint" }));
  // Blocked: not ready (good DoD + deps ok, but no risk field)
  w("2-sprint", "ISS-0006-f", issue("ISS-0006", { status: "2-sprint", dod: AUTO_DOD }));
}

let fixture: Fixture;
afterEach(() => { if (fixture) fixture.cleanup(); });

describe("lyt next", () => {
  it("exits 2 when no .lytos/ exists", () => {
    fixture = createEmptyFixture();
    expect(run("next", fixture.cwd).exitCode).toBe(2);
  });

  it("picks the highest-priority eligible issue", () => {
    fixture = createEmptyFixture();
    createFixture(fixture.cwd);
    const r = run("next --json", fixture.cwd);
    const json = JSON.parse(r.stdout);
    expect(json.pick.id).toBe("ISS-0002"); // P0 beats P1
    expect(json.eligible.map((e: { id: string }) => e.id)).toEqual(["ISS-0002", "ISS-0001"]);
  });

  it("classifies the blocked issues with reasons", () => {
    fixture = createEmptyFixture();
    createFixture(fixture.cwd);
    const json = JSON.parse(run("next --json", fixture.cwd).stdout);
    const byId = Object.fromEntries(json.blocked.map((b: { id: string; reason: string }) => [b.id, b.reason]));
    expect(byId["ISS-0003"]).toBe("deps-pending");
    expect(byId["ISS-0004"]).toBe("all-human-dod");
    expect(byId["ISS-0005"]).toBe("no-dod");
    expect(byId["ISS-0006"]).toBe("not-ready");
  });

  it("returns pick=null and lists blockers when nothing is eligible", () => {
    fixture = createEmptyFixture();
    const lyt = (p: string) => resolve(fixture.cwd, ".lytos", p);
    for (const dir of ["issue-board/2-sprint", "issue-board/5-done", "issue-board/1-backlog"]) {
      mkdirSync(lyt(dir), { recursive: true });
    }
    writeFileSync(lyt("issue-board/2-sprint/ISS-0004-d.md"), issue("ISS-0004", { status: "2-sprint", dod: HUMAN_DOD }));
    const r = run("next --json", fixture.cwd);
    const json = JSON.parse(r.stdout);
    expect(json.pick).toBeNull();
    expect(json.blocked).toHaveLength(1);
  });

  it("returns pick=null on an empty sprint", () => {
    fixture = createEmptyFixture();
    mkdirSync(resolve(fixture.cwd, ".lytos/issue-board/2-sprint"), { recursive: true });
    const json = JSON.parse(run("next --json", fixture.cwd).stdout);
    expect(json.pick).toBeNull();
    expect(json.eligible).toHaveLength(0);
  });
});
