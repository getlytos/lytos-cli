/**
 * The merge driver splits a card with the shared reader (ISS-0180).
 *
 * `lyt _merge-issue` kept its own copy of the expression that cuts a card into
 * frontmatter and body, looser than the one `frontmatter.ts` owns: it closed the
 * frontmatter at the FIRST `---` that is followed by a line end, wherever it was.
 * A card whose title contains `---`, merged from two branches, exited 0 and left
 * part of its frontmatter inside the body. The driver now uses `bodyOf`, the
 * parser's own closing-line logic.
 *
 * Each case runs twice: through `mergeIssue` for the exact bytes, and through a
 * real `git merge` of two branches in a temporary repository.
 */

import { describe, it, expect, afterEach } from "vitest";
import { resolve, join } from "path";
import { mkdirSync, writeFileSync, readFileSync } from "fs";
import { execSync, spawnSync } from "child_process";
import { mergeIssue } from "../../src/lib/merge-issue.js";
import { bodyOf, parseFrontmatter } from "../../src/lib/frontmatter.js";
import { createEmptyFixture, type Fixture } from "../helpers/fixtures.js";

const CLI = resolve(__dirname, "../../dist/cli.js");

let fixture: Fixture;

afterEach(() => {
  if (fixture) fixture.cleanup();
});

/** A card: the given frontmatter lines, then a body with a context section. */
function card(title: string, status = "3-in-progress", bodyExtra = ""): string {
  return [
    "---",
    "id: ISS-0100",
    `title: ${title}`,
    "type: feat",
    `status: ${status}`,
    "---",
    "",
    "# ISS-0100",
    "",
    "Intro paragraph.",
    bodyExtra,
    "## Context",
    "",
    "The initial context.",
    "",
  ].join("\n");
}

const DELIVERY = "\n## Delivery\n\nShipped on the second branch.\n";

/** What the driver must produce when ours changes the status and theirs appends a section. */
function expected(title: string, bodyExtra = ""): string {
  return [
    "---",
    "id: ISS-0100",
    `title: ${title}`,
    "type: feat",
    "status: 4-review",
    "---",
    "",
    "# ISS-0100",
    "",
    "Intro paragraph.",
    ...(bodyExtra === "" ? [] : ["", bodyExtra.trim()]),
    "",
    "## Context",
    "",
    "The initial context.",
    "",
    "## Delivery",
    "",
    "Shipped on the second branch.",
    "",
  ].join("\n");
}

const delimiters = (text: string) => (text.match(/^---\s*$/gm) ?? []).length;

describe("mergeIssue — a card whose frontmatter has a --- that does not close it", () => {
  const TITLES = [
    "Split the --- separator",
    "Ends with ---",
    "--- starts with dashes",
    '"Quoted --- title"',
  ];

  it.each(TITLES)("keeps the frontmatter and the body byte-correct: %s", (title) => {
    const base = card(title);
    const ours = base.replace("status: 3-in-progress", "status: 4-review");
    const theirs = base + DELIVERY;
    const result = mergeIssue(base, ours, theirs);
    expect(result.conflicts).toEqual([]);
    const shown = title.replace(/^"|"$/g, "");
    expect(result.content).toBe(expected(shown));
    // Nothing of the frontmatter leaked into the body.
    expect(bodyOf(result.content)).not.toMatch(/^(type|status|id):/m);
    expect(delimiters(result.content)).toBe(2);
  });

  it("does not invent a conflict when both sides change the frontmatter", () => {
    const base = card("Split the --- separator");
    const ours = base.replace("status: 3-in-progress", "status: 4-review");
    const theirs = base.replace("type: feat", "type: fix");
    const result = mergeIssue(base, ours, theirs);
    expect(result.conflicts).toEqual([]);
    expect(parseFrontmatter(result.content)).toMatchObject({
      title: "Split the --- separator",
      status: "4-review",
      type: "fix",
    });
    expect(delimiters(result.content)).toBe(2);
  });

  it("still reports a real conflict: the same field changed on both sides", () => {
    const base = card("Split the --- separator");
    const ours = base.replace("status: 3-in-progress", "status: 4-review");
    const theirs = base.replace("status: 3-in-progress", "status: 2-sprint");
    const result = mergeIssue(base, ours, theirs);
    expect(result.conflicts).toEqual(["frontmatter field `status` changed on both sides"]);
    expect(result.content).toContain("<<<<<<< ours");
    expect(result.content).toContain("title: Split the --- separator");
  });
});

describe("mergeIssue — a body with a --- line of its own", () => {
  it("keeps the rule in the body and both sections", () => {
    const base = card("A plain title", "3-in-progress", "\n---\n\nBelow the rule.\n");
    const ours = base.replace("status: 3-in-progress", "status: 4-review");
    const theirs = base + DELIVERY;
    const result = mergeIssue(base, ours, theirs);
    expect(result.conflicts).toEqual([]);
    expect(result.content).toBe(expected("A plain title", "---\n\nBelow the rule."));
    // open, close, and the rule in the body
    expect(delimiters(result.content)).toBe(3);
  });

  it("keeps a --- line in a section that both sides left alone", () => {
    const base = card("A plain title") + "\n## Notes\n\nabove\n\n---\n\nbelow\n";
    const ours = base.replace("status: 3-in-progress", "status: 4-review");
    const theirs = base + DELIVERY;
    const result = mergeIssue(base, ours, theirs);
    expect(result.conflicts).toEqual([]);
    expect(result.content).toContain("## Notes\n\nabove\n\n---\n\nbelow");
    expect(result.content).toContain("## Delivery");
    expect(parseFrontmatter(result.content)).toMatchObject({ status: "4-review" });
  });
});

describe("mergeIssue — other shapes of card", () => {
  it("merges Windows line endings without leaking the frontmatter into the body", () => {
    const crlf = (s: string) => s.replace(/\n/g, "\r\n");
    const base = crlf(card("Split the --- separator"));
    const ours = base.replace("status: 3-in-progress", "status: 4-review");
    const theirs = base + crlf(DELIVERY);
    const result = mergeIssue(base, ours, theirs);
    expect(result.conflicts).toEqual([]);
    expect(parseFrontmatter(result.content)).toMatchObject({
      id: "ISS-0100",
      title: "Split the --- separator",
      status: "4-review",
    });
    const body = bodyOf(result.content);
    expect(body).toContain("## Context");
    expect(body).toContain("## Delivery");
    expect(body).not.toMatch(/^(type|status|id|title):/m);
    expect(delimiters(result.content)).toBe(2);
  });

  it("merges a card with no newline at the end of the file", () => {
    const base = card("Split the --- separator").replace(/\n$/, "");
    expect(base.endsWith("\n")).toBe(false);
    const ours = base.replace("status: 3-in-progress", "status: 4-review");
    const theirs = base + "\n" + DELIVERY.replace(/\n$/, "");
    const result = mergeIssue(base, ours, theirs);
    expect(result.conflicts).toEqual([]);
    expect(result.content).toBe(expected("Split the --- separator"));
  });

  it("merges a card that has no body at all", () => {
    const base = "---\nid: ISS-0100\ntitle: A --- title\nstatus: 3-in-progress\n---\n";
    const ours = base.replace("3-in-progress", "4-review");
    const result = mergeIssue(base, ours, base);
    expect(result.conflicts).toEqual([]);
    expect(parseFrontmatter(result.content)).toMatchObject({ title: "A --- title", status: "4-review" });
    expect(bodyOf(result.content).trim()).toBe("");
    expect(delimiters(result.content)).toBe(2);
  });

  it("keeps the indentation of the first line of the body", () => {
    const base = "---\nid: ISS-0100\nstatus: 3-in-progress\n---\n\n    indented first line\n\n## Context\n\nc\n";
    const ours = base.replace("3-in-progress", "4-review");
    const result = mergeIssue(base, ours, base + DELIVERY);
    expect(bodyOf(result.content).startsWith("    indented first line")).toBe(true);
  });

  it("merges a card file added on both branches with no common ancestor", () => {
    const ours = card("Split the --- separator");
    const theirs = card("Split the --- separator") + DELIVERY;
    const result = mergeIssue("", ours, theirs);
    expect(result.conflicts).toEqual([]);
    expect(result.content).toContain("## Delivery");
    expect(parseFrontmatter(result.content)).toMatchObject({ title: "Split the --- separator" });
    expect(delimiters(result.content)).toBe(2);
  });
});

describe("the driver in a real git merge", () => {
  /** Two branches off a base, merged with the driver configured. Returns the merged file. */
  function mergeTwoBranches(
    base: string,
    a: string,
    b: string
  ): { merged: string; status: number | null; stderr: string } {
    fixture = createEmptyFixture();
    const cwd = fixture.cwd;
    const sh = (cmd: string) => execSync(cmd, { cwd, encoding: "utf-8", stdio: "pipe" });
    const dir = join(cwd, ".lytos", "issue-board", "4-review");
    mkdirSync(dir, { recursive: true });
    const file = join(dir, "ISS-0100-sample.md");
    writeFileSync(file, base);
    writeFileSync(join(cwd, ".gitattributes"), ".lytos/issue-board/**/*.md merge=lytos-issue\n");
    sh("git init -q -b main");
    sh("git config user.email 'test@test.com'");
    sh("git config user.name 'Test'");
    sh("git config core.autocrlf false");
    sh(`git config merge.lytos-issue.driver "node ${CLI} _merge-issue %O %A %B"`);
    sh("git add -A && git commit -q -m base --no-gpg-sign");
    sh("git checkout -q -b branch-a");
    writeFileSync(file, a);
    sh("git add -A && git commit -q -m a --no-gpg-sign");
    sh("git checkout -q main && git checkout -q -b branch-b");
    writeFileSync(file, b);
    sh("git add -A && git commit -q -m b --no-gpg-sign");
    const merge = spawnSync("git", ["merge", "branch-a", "--no-gpg-sign", "-m", "merge"], { cwd, encoding: "utf-8" });
    return { merged: readFileSync(file, "utf-8"), status: merge.status, stderr: merge.stderr };
  }

  it("a title with --- : status on one branch, a section on the other, exit 0 and the right bytes", () => {
    for (const title of ["Split the --- separator", "Ends with ---"]) {
      const base = card(title);
      const r = mergeTwoBranches(base, base.replace("status: 3-in-progress", "status: 4-review"), base + DELIVERY);
      expect(r.status, title).toBe(0);
      expect(r.merged, title).toBe(expected(title));
      expect(delimiters(r.merged), title).toBe(2);
    }
  });

  it("a body with a --- line of its own", () => {
    const base = card("A plain title", "3-in-progress", "\n---\n\nBelow the rule.\n");
    const r = mergeTwoBranches(base, base.replace("status: 3-in-progress", "status: 4-review"), base + DELIVERY);
    expect(r.status).toBe(0);
    expect(r.merged).toBe(expected("A plain title", "---\n\nBelow the rule."));
  });

  it("both branches change the frontmatter, the title has ---: no false conflict", () => {
    const base = card("Split the --- separator");
    const r = mergeTwoBranches(
      base,
      base.replace("status: 3-in-progress", "status: 4-review"),
      base.replace("type: feat", "type: fix")
    );
    expect(r.status).toBe(0);
    expect(r.merged).not.toContain("<<<<<<<");
    expect(parseFrontmatter(r.merged)).toMatchObject({ title: "Split the --- separator", status: "4-review", type: "fix" });
  });

  it("a real conflict on the same field is still left for the human, with the title intact", () => {
    const base = card("Split the --- separator");
    const r = mergeTwoBranches(
      base,
      base.replace("status: 3-in-progress", "status: 4-review"),
      base.replace("status: 3-in-progress", "status: 2-sprint")
    );
    expect(r.status).not.toBe(0);
    expect(r.merged).toContain("<<<<<<< ours");
    expect(r.merged).toContain("title: Split the --- separator");
  });

  it("Windows line endings", () => {
    const crlf = (s: string) => s.replace(/\n/g, "\r\n");
    const base = crlf(card("Split the --- separator"));
    const r = mergeTwoBranches(base, base.replace("status: 3-in-progress", "status: 4-review"), base + crlf(DELIVERY));
    expect(r.status).toBe(0);
    expect(parseFrontmatter(r.merged)).toMatchObject({ title: "Split the --- separator", status: "4-review" });
    expect(bodyOf(r.merged)).toContain("## Delivery");
    expect(bodyOf(r.merged)).not.toMatch(/^(type|status|id|title):/m);
    expect(delimiters(r.merged)).toBe(2);
  });

  it("no newline at the end of the file", () => {
    const base = card("Split the --- separator").replace(/\n$/, "");
    const r = mergeTwoBranches(
      base,
      base.replace("status: 3-in-progress", "status: 4-review"),
      base + "\n" + DELIVERY.replace(/\n$/, "")
    );
    expect(r.status).toBe(0);
    expect(r.merged).toBe(expected("Split the --- separator"));
  });
});
