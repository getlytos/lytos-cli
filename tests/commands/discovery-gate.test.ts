/**
 * Integration tests for the discovery gate (ISS-0165, ADR-0009 §3): `lyt move`,
 * `lyt start`, `lyt claim`, `lyt unpark` refuse the leaves of an epic in
 * `phase: discovery`; `lyt next` excludes them. A `spike` leaf and a recorded
 * human override pass; a card with no parent epic is unaffected.
 */

import { describe, it, expect, afterEach } from "vitest";
import { resolve, join } from "path";
import { existsSync, readFileSync } from "fs";
import { execSync, spawnSync } from "child_process";
import { type Fixture } from "../helpers/fixtures.js";
import { createIntentFixture, writeCard } from "../helpers/cards.js";
import { parseFrontmatter } from "../../src/lib/frontmatter.js";

const CLI = resolve(__dirname, "../../dist/cli.js");

/** Arguments are passed as an array so a reason can hold spaces and quotes. */
function lyt(cwd: string, ...args: string[]) {
  const result = spawnSync("node", [CLI, ...args], {
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

const AUTO_DOD =
  "## Ready\n\n- **Scope** — s\n- **Constraints** — c\n- **Out of scope** — nothing\n\n## Definition of done\n\n- [ ] It works — verify: auto\n";

/** A discovery epic ISS-0010 with a leaf ISS-0011 in the backlog, in a git repo. */
function project(epicFields: Record<string, string> = { phase: "discovery" }): string {
  fixture = createIntentFixture();
  const cwd = fixture.cwd;
  writeCard(cwd, "ISS-0010", { type: "epic", title: "Big outcome", fields: epicFields });
  writeCard(cwd, "ISS-0011", {
    title: "A leaf",
    fields: { parent: "ISS-0010" },
    body: `# ISS-0011\n\n${AUTO_DOD}`,
  });
  execSync("git init -b main", { cwd, stdio: "pipe" });
  execSync("git config user.email 'test@test.com'", { cwd, stdio: "pipe" });
  execSync("git config user.name 'Test'", { cwd, stdio: "pipe" });
  execSync("git add -A && git commit -m 'init' --no-gpg-sign", { cwd, stdio: "pipe" });
  return cwd;
}

const cardPath = (cwd: string, dir: string, id: string) =>
  join(cwd, ".lytos/issue-board", dir, `${id}-card.md`);

const fmOf = (cwd: string, dir: string, id: string) =>
  parseFrontmatter(readFileSync(cardPath(cwd, dir, id), "utf-8"))!;

describe("lyt move — the entry into the sprint", () => {
  it("refuses a leaf of an epic in discovery, names the epic and the way forward", () => {
    const cwd = project();
    const r = lyt(cwd, "move", "ISS-0011", "2-sprint");
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("ISS-0010");
    expect(r.stderr).toContain("Big outcome");
    expect(r.stderr).toContain("discovery");
    expect(r.stderr).toContain("phase: frozen");
    expect(r.stderr).toContain("type: spike");
    expect(r.stderr).toContain("--discovery-override");
  });

  it("changes nothing when it refuses", () => {
    const cwd = project();
    const before = readFileSync(cardPath(cwd, "1-backlog", "ISS-0011"), "utf-8");
    lyt(cwd, "move", "ISS-0011", "2-sprint");
    expect(existsSync(cardPath(cwd, "1-backlog", "ISS-0011"))).toBe(true);
    expect(existsSync(cardPath(cwd, "2-sprint", "ISS-0011"))).toBe(false);
    expect(readFileSync(cardPath(cwd, "1-backlog", "ISS-0011"), "utf-8")).toBe(before);
  });

  it("explains the refusal as JSON", () => {
    const r = lyt(project(), "move", "ISS-0011", "2-sprint", "--json");
    expect(r.exitCode).toBe(1);
    const data = JSON.parse(r.stdout);
    expect(data).toMatchObject({
      status: "error",
      reason: "epic-in-discovery",
      epic: "ISS-0010",
    });
    expect(data.message).toContain("Big outcome");
    expect(data.hints.length).toBeGreaterThanOrEqual(3);
  });

  it("refuses from the icebox as well, and from parked", () => {
    const cwd = project();
    lyt(cwd, "move", "ISS-0011", "0-icebox");
    expect(lyt(cwd, "move", "ISS-0011", "2-sprint").exitCode).toBe(1);
  });

  it("gates only the entry: other moves, and a send-back into the sprint, pass", () => {
    const cwd = project();
    expect(lyt(cwd, "move", "ISS-0011", "4-review").exitCode).toBe(0);
    expect(lyt(cwd, "move", "ISS-0011", "2-sprint").exitCode).toBe(0); // from review: a send-back
    expect(lyt(cwd, "move", "ISS-0011", "1-backlog").exitCode).toBe(0);
  });

  it("lets a leaf through once the epic is frozen", () => {
    const cwd = project({ phase: "frozen" });
    expect(lyt(cwd, "move", "ISS-0011", "2-sprint").exitCode).toBe(0);
  });

  it("lets a leaf through when the epic has no phase", () => {
    const cwd = project({});
    expect(lyt(cwd, "move", "ISS-0011", "2-sprint").exitCode).toBe(0);
  });

  it("does not touch a card with no parent epic", () => {
    const cwd = project();
    writeCard(cwd, "ISS-0020", { type: "fix", title: "A fix" });
    expect(lyt(cwd, "move", "ISS-0020", "2-sprint").exitCode).toBe(0);
  });

  it("does not touch the epic itself", () => {
    const cwd = project();
    expect(lyt(cwd, "move", "ISS-0010", "2-sprint").exitCode).toBe(0);
  });

  it("lets a spike leaf through, with nothing recorded", () => {
    const cwd = project();
    writeCard(cwd, "ISS-0012", { type: "spike", title: "Measure it", fields: { parent: "ISS-0010" } });
    expect(lyt(cwd, "move", "ISS-0012", "2-sprint").exitCode).toBe(0);
    expect(fmOf(cwd, "2-sprint", "ISS-0012").discovery_override).toBeUndefined();
  });
});

describe("the recorded human override", () => {
  it("lets a leaf through and writes reason, date, epic and author into the card", () => {
    const cwd = project();
    const r = lyt(cwd, "move", "ISS-0011", "2-sprint", "--discovery-override", "the owner needs it for the demo");
    expect(r.exitCode).toBe(0);
    const fm = fmOf(cwd, "2-sprint", "ISS-0011");
    const record = fm.discovery_override as Record<string, string>;
    expect(record.reason).toBe("the owner needs it for the demo");
    expect(record.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(record.epic).toBe("ISS-0010");
    expect(record.by).toBe("Test");
    expect(fm.parent).toBe("ISS-0010"); // the rest of the card is intact
  });

  it("reads the reason back as written when it holds a colon, a hash, quotes or a line break", () => {
    // [what is typed, what the card holds]: a quote at either end would be
    // stripped by the frontmatter reader, so it is dropped on the way in.
    const cases: Array<[string, string]> = [
      ["why: because", "why: because"],
      ["ticket #42", "ticket #42"],
      ['the "demo" needs it', "the 'demo' needs it"],
      ['says "yes"', "says 'yes"],
      ["two\nlines", "two lines"],
    ];
    const cwd = project();
    cases.forEach(([typed, held], i) => {
      const id = `ISS-002${i}`;
      writeCard(cwd, id, { title: `Leaf ${i}`, fields: { parent: "ISS-0010" } });
      expect(lyt(cwd, "move", id, "2-sprint", "--discovery-override", typed).exitCode).toBe(0);
      const record = fmOf(cwd, "2-sprint", id).discovery_override as Record<string, string>;
      expect(record.reason).toBe(held);
      expect(record.epic).toBe("ISS-0010");
    });
  });

  it("refuses an override with no reason, and changes nothing", () => {
    const cwd = project();
    for (const blank of ["", "   "]) {
      const r = lyt(cwd, "move", "ISS-0011", "2-sprint", "--discovery-override", blank);
      expect(r.exitCode).toBe(1);
      expect(r.stderr).toContain("needs a reason");
    }
    expect(existsSync(cardPath(cwd, "1-backlog", "ISS-0011"))).toBe(true);
  });

  it("writes nothing when no override was needed", () => {
    const cwd = project({ phase: "frozen" });
    lyt(cwd, "move", "ISS-0011", "2-sprint", "--discovery-override", "not needed");
    expect(fmOf(cwd, "2-sprint", "ISS-0011").discovery_override).toBeUndefined();
  });

  it("is shown by `lyt show`", () => {
    const cwd = project();
    lyt(cwd, "move", "ISS-0011", "2-sprint", "--discovery-override", "for the demo");
    const r = lyt(cwd, "show", "ISS-0011");
    expect(r.stderr).toMatch(/Discovery override:\s+for the demo/);
    const d = JSON.parse(lyt(cwd, "show", "ISS-0011", "--json").stdout);
    expect(d.intent.discoveryOverride).toMatchObject({ reason: "for the demo", epic: "ISS-0010" });
  });
});

describe("lyt start", () => {
  it("refuses a leaf of an epic in discovery and creates no branch", () => {
    const cwd = project();
    const r = lyt(cwd, "start", "ISS-0011");
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("ISS-0010");
    expect(r.stderr).toContain("--discovery-override");
    expect(existsSync(cardPath(cwd, "1-backlog", "ISS-0011"))).toBe(true);
    expect(execSync("git branch --show-current", { cwd }).toString().trim()).toBe("main");
  });

  it("refuses a leaf already in the sprint when its epic is in discovery", () => {
    const cwd = project({ phase: "frozen" });
    lyt(cwd, "move", "ISS-0011", "2-sprint");
    writeCard(cwd, "ISS-0010", { type: "epic", title: "Big outcome", fields: { phase: "discovery" } });
    expect(lyt(cwd, "start", "ISS-0011").exitCode).toBe(1);
  });

  it("explains the refusal as JSON", () => {
    const r = lyt(project(), "start", "ISS-0011", "--json");
    expect(r.exitCode).toBe(1);
    expect(JSON.parse(r.stdout)).toMatchObject({ status: "error", reason: "epic-in-discovery", epic: "ISS-0010" });
  });

  it("starts with an explicit override, and records it", () => {
    const cwd = project();
    const r = lyt(cwd, "start", "ISS-0011", "--discovery-override", "unblocking the team");
    expect(r.exitCode).toBe(0);
    const fm = fmOf(cwd, "3-in-progress", "ISS-0011");
    expect((fm.discovery_override as Record<string, string>).reason).toBe("unblocking the team");
    expect(fm.assignee).toBe("Test");
  });

  it("starts a spike leaf with no override", () => {
    const cwd = project();
    writeCard(cwd, "ISS-0012", { type: "spike", title: "Measure it", fields: { parent: "ISS-0010" } });
    const r = lyt(cwd, "start", "ISS-0012", "--json");
    expect(r.exitCode).toBe(0);
    expect(JSON.parse(r.stdout).branch).toBe("chore/ISS-0012-measure-it");
    expect(fmOf(cwd, "3-in-progress", "ISS-0012").discovery_override).toBeUndefined();
  });

  it("does not touch a card with no parent epic", () => {
    const cwd = project();
    writeCard(cwd, "ISS-0020", { type: "fix", title: "A fix" });
    expect(lyt(cwd, "start", "ISS-0020").exitCode).toBe(0);
  });
});

describe("lyt claim and lyt unpark — the other ways into the flow", () => {
  it("refuses to claim a leaf of an epic in discovery", () => {
    const cwd = project();
    const r = lyt(cwd, "claim", "ISS-0011");
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("ISS-0010");
    expect(existsSync(cardPath(cwd, "1-backlog", "ISS-0011"))).toBe(true);
  });

  it("lets a leaf of a frozen epic be claimed", () => {
    expect(lyt(project({ phase: "frozen" }), "claim", "ISS-0011").exitCode).toBe(0);
  });

  it("refuses to unpark a leaf into the sprint while its epic is in discovery", () => {
    const cwd = project({ phase: "frozen" });
    expect(lyt(cwd, "park", "ISS-0011", "--reason", "ambiguous-spec").exitCode).toBe(0);
    writeCard(cwd, "ISS-0010", { type: "epic", title: "Big outcome", fields: { phase: "discovery" } });
    const r = lyt(cwd, "unpark", "ISS-0011");
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("ISS-0010");
    expect(existsSync(cardPath(cwd, "parked", "ISS-0011"))).toBe(true);
  });
});

describe("lyt next — the loop never picks a leaf of an unfrozen epic", () => {
  function sprintProject(epicFields: Record<string, string> = { phase: "discovery" }): string {
    const cwd = project(epicFields);
    writeCard(cwd, "ISS-0011", {
      title: "A leaf",
      dir: "2-sprint",
      fields: { parent: "ISS-0010" },
      body: `# ISS-0011\n\n${AUTO_DOD}`,
    });
    return cwd;
  }

  const blocked = (cwd: string) =>
    JSON.parse(lyt(cwd, "next", "--json").stdout) as {
      pick: { id: string } | null;
      blocked: Array<{ id: string; reason: string; detail: string }>;
    };

  it("excludes the leaf and says why", () => {
    const result = blocked(sprintProject());
    expect(result.pick).toBeNull();
    expect(result.blocked).toHaveLength(1);
    expect(result.blocked[0]).toMatchObject({ id: "ISS-0011", reason: "epic-in-discovery" });
    expect(result.blocked[0].detail).toContain("ISS-0010");
    expect(result.blocked[0].detail).toContain("discovery");
  });

  it("says so in the human output", () => {
    const r = lyt(sprintProject(), "next");
    expect(r.stderr).toContain("epic-in-discovery");
    expect(r.stderr).toContain("ISS-0010");
  });

  it("picks the leaf once the epic is frozen", () => {
    expect(blocked(sprintProject({ phase: "frozen" })).pick?.id).toBe("ISS-0011");
  });

  it("picks a spike leaf under an epic in discovery", () => {
    const cwd = sprintProject();
    writeCard(cwd, "ISS-0012", {
      type: "spike",
      dir: "2-sprint",
      fields: { parent: "ISS-0010" },
      body: `# ISS-0012\n\n${AUTO_DOD}`,
    });
    expect(blocked(cwd).pick?.id).toBe("ISS-0012");
  });

  it("picks a leaf that carries a recorded override", () => {
    const cwd = sprintProject();
    writeCard(cwd, "ISS-0013", {
      dir: "2-sprint",
      fields: {
        parent: "ISS-0010",
        discovery_override: '\n  reason: "agreed with the owner"\n  date: 2026-11-20',
      },
      body: `# ISS-0013\n\n${AUTO_DOD}`,
    });
    expect(blocked(cwd).pick?.id).toBe("ISS-0013");
  });

  it("does not touch a card with no parent epic", () => {
    const cwd = sprintProject();
    writeCard(cwd, "ISS-0020", { type: "fix", dir: "2-sprint", body: `# ISS-0020\n\n${AUTO_DOD}` });
    expect(blocked(cwd).pick?.id).toBe("ISS-0020");
  });
});
