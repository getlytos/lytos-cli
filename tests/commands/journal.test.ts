/**
 * Integration tests for `lyt journal` — the derived logbook (ISS-0124).
 */

import { describe, it, expect, afterEach } from "vitest";
import { resolve } from "path";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { createEmptyFixture, type Fixture } from "../helpers/fixtures.js";

const CLI = resolve(__dirname, "../../dist/cli.js");

function run(args: string, cwd: string): { stdout: string; stderr: string; exitCode: number } {
  const { spawnSync } = require("child_process");
  const result = spawnSync("node", [CLI, ...args.split(" ")], { cwd, encoding: "utf-8" });
  return { stdout: result.stdout || "", stderr: result.stderr || "", exitCode: result.status ?? 0 };
}

function createFixture(cwd: string): void {
  const lyt = (p: string) => resolve(cwd, ".lytos", p);
  for (const dir of ["issue-board/5-done", "issue-board/archive/2026-Q2"]) {
    mkdirSync(lyt(dir), { recursive: true });
  }
  writeFileSync(
    lyt("issue-board/5-done/ISS-0050.md"),
    `---\nid: ISS-0050\ntitle: "Add parking"\nstatus: 5-done\nreview: go\ncompleted_at: 2026-08-05\n---\n\n# ISS-0050 — Add parking\n\n## Context\n\nThe loop must halt, not guess, on ambiguity.\n`
  );
  writeFileSync(
    lyt("issue-board/archive/2026-Q2/ISS-0009.md"),
    `---\nid: ISS-0009\ntitle: "Doctor command"\nstatus: 5-done\nreview: go\ncompleted_at: 2026-04-15\n---\n\n# ISS-0009\n\n## Context\n\nDeep diagnostics beyond lint.\n`
  );
}

let fixture: Fixture;
afterEach(() => { if (fixture) fixture.cleanup(); });

describe("lyt journal", () => {
  it("exits 2 without .lytos/", () => {
    fixture = createEmptyFixture();
    expect(run("journal", fixture.cwd).exitCode).toBe(2);
  });

  it("derives entries from 5-done + archive, newest group first", () => {
    fixture = createEmptyFixture();
    createFixture(fixture.cwd);
    const groups = JSON.parse(run("journal --json", fixture.cwd).stdout);
    expect(groups.map((g: { key: string }) => g.key)).toEqual(["2026-08", "2026-04"]);
    const aug = groups[0].entries[0];
    expect(aug.id).toBe("ISS-0050");
    expect(aug.verdict).toBe("go");
    expect(aug.why).toContain("halt, not guess");
    expect(aug.link).toBe("issue-board/5-done/ISS-0050.md");
  });

  it("reads the whole wrapped paragraph, not the first physical line", () => {
    fixture = createEmptyFixture();
    createFixture(fixture.cwd);
    // Two defects in one fixture (ISS-0124 audit, 2026-08-12): real fiches hard-wrap
    // around 90 columns, so reading one physical line cut every "why" mid-sentence;
    // and they title the section `## Context — <subtitle>`, which an exact `^context$`
    // match sent to the fallback paragraph. The original fixture used a one-line
    // Context with a bare heading, so it exercised neither.
    writeFileSync(
      resolve(fixture.cwd, ".lytos/issue-board/5-done/ISS-0051.md"),
      `---\nid: ISS-0051\ntitle: "Wrapped"\nstatus: 5-done\nreview: go\ncompleted_at: 2026-08-06\n---\n\n# ISS-0051 — Wrapped\n\n## Context — why this exists\n\nA DoD box ticked by the agent itself is worth nothing: the implementer's\nconfidence replaces the actual state.\n\nA second paragraph that must not be picked.\n`
    );
    const groups = JSON.parse(run("journal --json", fixture.cwd).stdout);
    const entry = groups[0].entries.find((e: { id: string }) => e.id === "ISS-0051");
    expect(entry.why).toBe(
      "A DoD box ticked by the agent itself is worth nothing: the implementer's confidence replaces the actual state."
    );
  });

  it("renders a readable markdown logbook with links", () => {
    fixture = createEmptyFixture();
    createFixture(fixture.cwd);
    const md = run("journal", fixture.cwd).stdout;
    expect(md).toContain("# Journal");
    expect(md).toContain("**ISS-0050** Add parking");
    expect(md).toContain("[detail](issue-board/5-done/ISS-0050.md)");
  });

  it("handles an empty board", () => {
    fixture = createEmptyFixture();
    mkdirSync(resolve(fixture.cwd, ".lytos/issue-board/5-done"), { recursive: true });
    expect(JSON.parse(run("journal --json", fixture.cwd).stdout)).toEqual([]);
  });

  it("ignores open stages on a mixed board — only closed work has a story", () => {
    fixture = createEmptyFixture();
    createFixture(fixture.cwd);
    const lyt = (p: string) => resolve(fixture.cwd, ".lytos", p);
    for (const stage of ["1-backlog", "2-sprint", "3-in-progress", "4-review"]) {
      mkdirSync(lyt(`issue-board/${stage}`), { recursive: true });
      writeFileSync(
        lyt(`issue-board/${stage}/ISS-07${stage[0]}0.md`),
        `---\nid: ISS-07${stage[0]}0\ntitle: "Still open"\nstatus: ${stage}\nreview: go\n---\n\n## Context\n\nNot closed yet.\n`
      );
    }
    const groups = JSON.parse(run("journal --json", fixture.cwd).stdout);
    const ids = groups.flatMap((g: { entries: { id: string }[] }) => g.entries.map((e) => e.id));
    expect(ids).toEqual(["ISS-0050", "ISS-0009"]);
    expect(run("journal", fixture.cwd).stdout).not.toContain("Still open");
  });

  it("groups by period even when the issue carries a sprint field (ISS-0124)", () => {
    fixture = createEmptyFixture();
    mkdirSync(resolve(fixture.cwd, ".lytos/issue-board/5-done"), { recursive: true });
    writeFileSync(
      resolve(fixture.cwd, ".lytos/issue-board/5-done/ISS-0061.md"),
      `---\nid: ISS-0061\ntitle: "Closed without audit"\nstatus: 5-done\nsprint: "Sprint #06"\ncompleted_at: 2026-08-07\n---\n\n## Context\n\nShipped before the audit loop existed.\n`
    );
    const groups = JSON.parse(run("journal --json", fixture.cwd).stdout);
    expect(groups).toHaveLength(1);
    // `sprint:` used to override the period, so a logbook's sections were
    // sometimes months and sometimes sprint names depending on which fiches
    // happened to carry the field. One rule, applied to every entry; grouping by
    // sprint objective belongs to ISS-0131, which reads sprint.md.
    expect(groups[0].key).toBe("2026-08");
    expect(groups[0].entries[0].verdict).toBe("—");
    expect(run("journal", fixture.cwd).stdout).toContain("**ISS-0061** Closed without audit");
  });

  it("writes .lytos/JOURNAL.md only when asked (ISS-0124)", () => {
    fixture = createEmptyFixture();
    mkdirSync(resolve(fixture.cwd, ".lytos/issue-board/5-done"), { recursive: true });
    writeFileSync(
      resolve(fixture.cwd, ".lytos/issue-board/5-done/ISS-0062.md"),
      `---\nid: ISS-0062\ntitle: "Shipped"\nstatus: 5-done\ncompleted_at: 2026-08-07\n---\n\n## Context\n\nWhy it mattered.\n`
    );
    const target = resolve(fixture.cwd, ".lytos/JOURNAL.md");

    // A read has no business touching the working tree.
    run("journal", fixture.cwd);
    expect(existsSync(target)).toBe(false);

    run("journal --write", fixture.cwd);
    expect(existsSync(target)).toBe(true);
    const written = readFileSync(target, "utf-8");
    expect(written).toContain("# Journal");
    expect(written).toContain("**ISS-0062** Shipped");
    // The file and stdout are the same rendering — one source, two surfaces.
    expect(run("journal", fixture.cwd).stdout.trim()).toBe(written.trim());
  });
});

describe("lyt journal — a digest is not a place to navigate from (ISS-0124)", () => {
  /**
   * `--write` put the rendering in `.lytos/JOURNAL.md`, one directory above the
   * fiches. The `[detail]` link the journal builds is correct there; the links
   * *inside* the excerpted context are not — they were written relative to the
   * fiche's own directory. `lyt doctor` found eight dead links the moment the
   * file existed.
   */
  it("flattens inline links in the excerpt, keeping the words", () => {
    fixture = createEmptyFixture();
    mkdirSync(resolve(fixture.cwd, ".lytos/issue-board/5-done"), { recursive: true });
    writeFileSync(
      resolve(fixture.cwd, ".lytos/issue-board/5-done/ISS-0063.md"),
      `---\nid: ISS-0063\ntitle: "Linked context"\nstatus: 5-done\ncompleted_at: 2026-08-07\n---\n\n## Context\n\nThis follows [ISS-0079](ISS-0079-gitignore-board-md.md) and the [skill](../../skills/session-start.md).\n`
    );

    const out = run("journal", fixture.cwd).stdout;
    expect(out).toContain("This follows ISS-0079 and the skill.");
    expect(out).not.toContain("ISS-0079-gitignore-board-md.md");
    expect(out).not.toContain("session-start.md");
    // The entry's own way in is untouched — that link is built, not excerpted.
    expect(out).toContain("[detail](issue-board/5-done/ISS-0063.md)");
  });
});
