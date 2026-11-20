/**
 * The intent fields through the commands that rewrite a card (ISS-0163).
 *
 * `lyt start` and `lyt move` re-serialize the frontmatter. The optional fields
 * `parent`, `milestone` and `phase` must come back untouched, and the `epic`
 * type must not produce a branch name the shipped pre-commit hook refuses.
 */

import { describe, it, expect, afterEach } from "vitest";
import { resolve, join } from "path";
import { readFileSync } from "fs";
import { execSync, spawnSync } from "child_process";
import { type Fixture } from "../helpers/fixtures.js";
import { createIntentFixture, writeCard } from "../helpers/cards.js";
import { parseFrontmatter } from "../../src/lib/frontmatter.js";

const CLI = resolve(__dirname, "../../dist/cli.js");

function run(args: string, cwd: string) {
  const result = spawnSync("node", [CLI, ...args.split(" ")], {
    cwd,
    encoding: "utf-8",
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
  writeCard(cwd, "ISS-0010", {
    type: "epic",
    title: "Big outcome",
    fields: { phase: "discovery", milestone: "v1.7" },
  });
  writeCard(cwd, "ISS-0011", {
    fields: { parent: "ISS-0010", milestone: "v1.7" },
  });
  execSync("git init -b main", { cwd, stdio: "pipe" });
  execSync("git config user.email 'test@test.com'", { cwd, stdio: "pipe" });
  execSync("git config user.name 'Test'", { cwd, stdio: "pipe" });
  execSync("git add -A && git commit -m 'init' --no-gpg-sign", {
    cwd,
    stdio: "pipe",
  });
  return cwd;
}

function frontmatterOf(cwd: string, dir: string, name: string) {
  const content = readFileSync(
    join(cwd, ".lytos", "issue-board", dir, name),
    "utf-8"
  );
  return parseFrontmatter(content)!;
}

describe("the intent fields survive a rewrite of the card", () => {
  it("keeps parent and milestone through `lyt move`", () => {
    const cwd = project();
    // Out of the backlog the discovery gate would refuse a leaf of this epic: the
    // icebox is a move that rewrites the card all the same.
    const r = run("move ISS-0011 0-icebox", cwd);
    expect(r.exitCode).toBe(0);
    const fm = frontmatterOf(cwd, "0-icebox", "ISS-0011-card.md");
    expect(fm.parent).toBe("ISS-0010");
    expect(fm.milestone).toBe("v1.7");
    expect(fm.status).toBe("0-icebox");
  });

  it("keeps phase and milestone on an epic through `lyt start`", () => {
    const cwd = project();
    const r = run("start ISS-0010", cwd);
    expect(r.exitCode).toBe(0);
    const fm = frontmatterOf(cwd, "3-in-progress", "ISS-0010-card.md");
    expect(fm.type).toBe("epic");
    expect(fm.phase).toBe("discovery");
    expect(fm.milestone).toBe("v1.7");
  });
});

describe("lyt start on an epic", () => {
  it("names the branch feat/..., a prefix the pre-commit hook accepts", () => {
    const cwd = project();
    const r = run("start ISS-0010 --json", cwd);
    expect(r.exitCode).toBe(0);
    const data = JSON.parse(r.stdout);
    expect(data.branch).toMatch(/^feat\/ISS-0010-big-outcome$/);
    expect(execSync("git branch --show-current", { cwd }).toString().trim()).toBe(
      data.branch
    );
  });

  it("leaves the prefix of every other type alone", () => {
    const cwd = project();
    writeCard(cwd, "ISS-0012", { type: "fix", title: "Small fix" });
    const data = JSON.parse(run("start ISS-0012 --json", cwd).stdout);
    expect(data.branch).toBe("fix/ISS-0012-small-fix");
  });
});
