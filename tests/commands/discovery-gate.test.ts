/**
 * Integration tests for the discovery gate (ISS-0165, ADR-0009 §3): `lyt move`,
 * `lyt start`, `lyt claim`, `lyt unpark` refuse the leaves of an epic in
 * `phase: discovery`; `lyt next` excludes them. A `spike` leaf and a recorded
 * human override pass; a card with no parent epic is unaffected.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { resolve, join } from "path";
import { existsSync, readFileSync } from "fs";
import { execSync, spawnSync } from "child_process";
import { type Fixture } from "../helpers/fixtures.js";
import { createIntentFixture, writeCard } from "../helpers/cards.js";
import { bodyOf, parseFrontmatter } from "../../src/lib/frontmatter.js";

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

// Several tests start a handful of processes; a loaded machine must not turn that into a failure.
vi.setConfig({ testTimeout: 30_000 });

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

  it("gates every move out of the backlog, not only the one into the sprint (F2)", () => {
    // `move 4-review` then `move 2-sprint` used to put the leaf in the sprint, and
    // `move 4-review` then `lyt close` to deliver it, with no override.
    const cwd = project();
    const refused = lyt(cwd, "move", "ISS-0011", "4-review");
    expect(refused.exitCode).toBe(1);
    expect(refused.stderr).toContain("ISS-0010");
    expect(existsSync(cardPath(cwd, "1-backlog", "ISS-0011"))).toBe(true);
    expect(lyt(cwd, "move", "ISS-0011", "2-sprint").exitCode).toBe(1);
  });

  it("gates a move into review from the icebox and from parked too", () => {
    const cwd = project();
    lyt(cwd, "move", "ISS-0011", "0-icebox");
    expect(lyt(cwd, "move", "ISS-0011", "4-review").exitCode).toBe(1);
    const other = project();
    lyt(other, "park", "ISS-0011", "--reason", "ambiguous-spec");
    expect(lyt(other, "move", "ISS-0011", "4-review").exitCode).toBe(1);
    expect(lyt(other, "move", "ISS-0011", "2-sprint").exitCode).toBe(1);
  });

  it("does not gate the stages before the sprint: nothing is committed yet", () => {
    const cwd = project();
    expect(lyt(cwd, "move", "ISS-0011", "0-icebox").exitCode).toBe(0);
    expect(lyt(cwd, "move", "ISS-0011", "1-backlog").exitCode).toBe(0);
  });

  it("keeps a send-back working: a leaf that passed the gate returns from review, and from the sprint", () => {
    const cwd = project({ phase: "frozen" });
    expect(lyt(cwd, "move", "ISS-0011", "2-sprint").exitCode).toBe(0); // the gate is satisfied
    expect(lyt(cwd, "move", "ISS-0011", "4-review").exitCode).toBe(0); // beyond the backlog: not asked again
    expect(lyt(cwd, "move", "ISS-0011", "2-sprint").exitCode).toBe(0); // a send-back from review
    expect(lyt(cwd, "move", "ISS-0011", "1-backlog").exitCode).toBe(0); // and back to the backlog
  });

  it("asks again when a card re-enters from the backlog after its epic went back to discovery", () => {
    const cwd = project({ phase: "frozen" });
    expect(lyt(cwd, "move", "ISS-0011", "2-sprint").exitCode).toBe(0);
    expect(lyt(cwd, "move", "ISS-0011", "1-backlog").exitCode).toBe(0);
    writeCard(cwd, "ISS-0010", { type: "epic", title: "Big outcome", fields: { phase: "discovery" } });
    expect(lyt(cwd, "move", "ISS-0011", "2-sprint").exitCode).toBe(1);
  });

  it("lets a person take a leaf straight to review, with the override recorded, and send it back", () => {
    const cwd = project();
    const r = lyt(cwd, "move", "ISS-0011", "4-review", "--discovery-override", "the demo needs it");
    expect(r.exitCode).toBe(0);
    expect((fmOf(cwd, "4-review", "ISS-0011").discovery_override as Record<string, string>).reason).toBe("the demo needs it");
    expect(lyt(cwd, "move", "ISS-0011", "2-sprint").exitCode).toBe(0);
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
        discovery_override:
          '\n  reason: "agreed with the owner"\n  date: 2026-11-20\n  epic: ISS-0010\n  by: Someone',
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

describe("lyt close — a leaf that never passed the gate is not delivered (F2)", () => {
  /** A leaf found in review under an epic in discovery: the state the old two-step bypass left. */
  function reviewProject(
    leafFields: Record<string, string> = {},
    epicFields: Record<string, string> = { phase: "discovery" },
    dir = "4-review"
  ): string {
    const cwd = project(epicFields);
    writeCard(cwd, "ISS-0012", { title: "In review", dir, fields: { parent: "ISS-0010", ...leafFields } });
    return cwd;
  }

  it("refuses to close it, names the epic, and says a person must decide", () => {
    const cwd = reviewProject();
    const r = lyt(cwd, "close", "ISS-0012");
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("ISS-0010");
    expect(r.stderr).toMatch(/a person must decide/i);
    expect(existsSync(cardPath(cwd, "4-review", "ISS-0012"))).toBe(true);
    expect(existsSync(cardPath(cwd, "5-done", "ISS-0012"))).toBe(false);
  });

  it("refuses from the sprint's in-progress stage too, and explains as JSON", () => {
    const cwd = reviewProject({}, { phase: "discovery" }, "3-in-progress");
    const r = lyt(cwd, "close", "ISS-0012", "--json");
    expect(r.exitCode).toBe(1);
    expect(JSON.parse(r.stdout)).toMatchObject({ status: "error", reason: "epic-in-discovery", epic: "ISS-0010" });
  });

  it("closes it with an explicit override, and records it in the card", () => {
    const cwd = reviewProject();
    const r = lyt(cwd, "close", "ISS-0012", "--discovery-override", "accepted by the owner");
    expect(r.exitCode).toBe(0);
    const record = fmOf(cwd, "5-done", "ISS-0012").discovery_override as Record<string, string>;
    expect(record).toMatchObject({ reason: "accepted by the owner", epic: "ISS-0010", by: "Test" });
  });

  it("refuses a blank override on close", () => {
    const cwd = reviewProject();
    const r = lyt(cwd, "close", "ISS-0012", "--discovery-override", "  ");
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("needs a reason");
    expect(existsSync(cardPath(cwd, "4-review", "ISS-0012"))).toBe(true);
  });

  it("closes it when it carries a complete record made for its epic", () => {
    const cwd = reviewProject({
      discovery_override: '\n  reason: "agreed"\n  date: 2026-11-20\n  epic: ISS-0010\n  by: Someone',
    });
    expect(lyt(cwd, "close", "ISS-0012").exitCode).toBe(0);
  });

  it("does not close it on a bare record, or on a record made for another epic", () => {
    const bare = reviewProject({ discovery_override: "\n  reason: x" });
    expect(lyt(bare, "close", "ISS-0012").exitCode).toBe(1);
    const other = reviewProject({
      discovery_override: '\n  reason: "agreed"\n  date: 2026-11-20\n  epic: ISS-0099\n  by: Someone',
    });
    expect(lyt(other, "close", "ISS-0012").exitCode).toBe(1);
  });

  it("closes a spike, a leaf of a frozen epic, and a card with no parent", () => {
    expect(lyt(reviewProject({ type: "spike" }), "close", "ISS-0012").exitCode).toBe(0);
    expect(lyt(reviewProject({}, { phase: "frozen" }), "close", "ISS-0012").exitCode).toBe(0);
    const cwd = project();
    writeCard(cwd, "ISS-0020", { type: "fix", dir: "4-review" });
    expect(lyt(cwd, "close", "ISS-0020").exitCode).toBe(0);
  });

  it("previews nothing different: --dry-run refuses too, and changes nothing", () => {
    const cwd = reviewProject();
    expect(lyt(cwd, "close", "ISS-0012", "--dry-run").exitCode).toBe(1);
    expect(existsSync(cardPath(cwd, "4-review", "ISS-0012"))).toBe(true);
  });

  it("batch close skips the gated leaf, says why, and closes the others", () => {
    const cwd = reviewProject();
    writeCard(cwd, "ISS-0020", { type: "fix", title: "Plain fix", dir: "4-review" });
    const r = lyt(cwd, "close", "--yes");
    expect(r.exitCode).toBe(0);
    expect(r.stderr).toContain("ISS-0012");
    expect(r.stderr).toContain("ISS-0010");
    expect(existsSync(cardPath(cwd, "5-done", "ISS-0020"))).toBe(true);
    expect(existsSync(cardPath(cwd, "4-review", "ISS-0012"))).toBe(true);
  });

  it("batch close reports the skipped leaf in JSON, and --dry-run says it would skip it", () => {
    const cwd = reviewProject();
    const dry = JSON.parse(lyt(cwd, "close", "--dry-run", "--json").stdout);
    expect(dry.candidates).toEqual([expect.objectContaining({ id: "ISS-0012", wouldSkip: true })]);
    const done = JSON.parse(lyt(cwd, "close", "--yes", "--json").stdout);
    expect(done.closed).toEqual([]);
    expect(done.skipped).toEqual([expect.objectContaining({ id: "ISS-0012", reason: expect.stringContaining("epic-in-discovery") })]);
  });
});

describe("an override record counts only when complete and made for the current parent (F3)", () => {
  it("does not let a leaf into the sprint on a bare, hand-written record, and says why", () => {
    const cwd = project();
    writeCard(cwd, "ISS-0012", { title: "Bare", fields: { parent: "ISS-0010", discovery_override: "\n  reason: x" } });
    const r = lyt(cwd, "move", "ISS-0012", "2-sprint");
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toMatch(/discovery_override/);
    expect(r.stderr).toMatch(/missing: date, by, epic/);
    expect(existsSync(cardPath(cwd, "1-backlog", "ISS-0012"))).toBe(true);
  });

  it("does not let a leaf start, or be claimed, on a bare record", () => {
    const cwd = project();
    writeCard(cwd, "ISS-0012", { title: "Bare", fields: { parent: "ISS-0010", discovery_override: "\n  reason: x" } });
    expect(lyt(cwd, "start", "ISS-0012").exitCode).toBe(1);
    expect(lyt(cwd, "claim", "ISS-0012").exitCode).toBe(1);
  });

  it("does not keep an override once the leaf moves under another epic in discovery", () => {
    const cwd = project();
    writeCard(cwd, "ISS-0030", { type: "epic", title: "Another outcome", fields: { phase: "discovery" } });
    expect(lyt(cwd, "move", "ISS-0011", "2-sprint", "--discovery-override", "for the first epic").exitCode).toBe(0);
    expect(lyt(cwd, "move", "ISS-0011", "1-backlog").exitCode).toBe(0);
    writeCard(cwd, "ISS-0011", {
      title: "A leaf",
      fields: {
        parent: "ISS-0030",
        discovery_override: '\n  reason: "for the first epic"\n  date: 2026-11-20\n  epic: ISS-0010\n  by: Test',
      },
    });
    const r = lyt(cwd, "move", "ISS-0011", "2-sprint");
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("ISS-0010");
    expect(r.stderr).toContain("ISS-0030");
  });

  it("is not honoured by `lyt next` either", () => {
    const cwd = project({ phase: "frozen" });
    lyt(cwd, "move", "ISS-0011", "2-sprint");
    writeCard(cwd, "ISS-0010", { type: "epic", title: "Big outcome", fields: { phase: "discovery" } });
    writeCard(cwd, "ISS-0011", {
      title: "A leaf",
      dir: "2-sprint",
      fields: { parent: "ISS-0010", discovery_override: "\n  reason: x" },
      body: `# ISS-0011\n\n${AUTO_DOD}`,
    });
    const next = JSON.parse(lyt(cwd, "next", "--json").stdout);
    expect(next.pick).toBeNull();
    expect(next.blocked[0]).toMatchObject({ id: "ISS-0011", reason: "epic-in-discovery" });
  });
});

describe("the refusal says the override is a person's decision", () => {
  it("in the text and in the JSON hints of move, start, claim and unpark", () => {
    const cwd = project();
    for (const args of [["move", "ISS-0011", "2-sprint"], ["start", "ISS-0011"], ["claim", "ISS-0011"]]) {
      const r = lyt(cwd, ...args);
      expect(r.exitCode, args.join(" ")).toBe(1);
      expect(r.stderr, args.join(" ")).toMatch(/a person must decide/i);
      expect(r.stderr, args.join(" ")).toMatch(/an agent or a wrapper never/i);
    }
    const json = JSON.parse(lyt(cwd, "move", "ISS-0011", "2-sprint", "--json").stdout);
    expect(json.hints.join("\n")).toMatch(/a person must decide/i);
  });
});

describe("a reason cannot corrupt the card (F1)", () => {
  /** A card without the lines `lyt` rewrites on every move. */
  const volatile = /^(status|updated|assignee|started_at|review|review_at|reviewer|completed_at|commits):.*$/gm;
  const mask = (text: string) => text.replace(volatile, "");
  const delimiters = (text: string) => (text.match(/^---$/gm) ?? []).length;
  const read = (cwd: string, dir: string, id: string) => readFileSync(cardPath(cwd, dir, id), "utf-8");

  /** Same card but for what the writing command is meant to change: fields, body and delimiters. */
  function expectSameCard(after: string, before: string, label: string): void {
    const meant = ["status", "updated", "assignee", "started_at", "schema_version", "review", "review_at", "reviewer", "review_independence", "ai_reviewer", "completed_at", "commits"];
    const strip = (fm: ReturnType<typeof parseFrontmatterOf>) => {
      const copy = { ...fm };
      for (const key of meant) delete copy[key];
      return copy;
    };
    expect(delimiters(after), label).toBe(2);
    expect(strip(parseFrontmatterOf(after)), label).toEqual(strip(parseFrontmatterOf(before)));
    expect(bodyOf(after), label).toBe(bodyOf(before));
  }

  const REASONS = ["agreed ---", "---", "a\n---\nb", "x: y", "---\nstatus: 5-done", "before --- after"];

  it("keeps the card whole and the other fields untouched, or refuses the reason", () => {
    for (const reason of REASONS) {
      const cwd = project();
      const original = read(cwd, "1-backlog", "ISS-0011");
      const r = lyt(cwd, "move", "ISS-0011", "2-sprint", "--discovery-override", reason);
      if (r.exitCode !== 0) {
        // Refused (nothing left of the reason): the card is exactly as it was.
        expect(r.stderr, JSON.stringify(reason)).toContain("needs a reason");
        expect(read(cwd, "1-backlog", "ISS-0011"), JSON.stringify(reason)).toBe(original);
        continue;
      }
      const after = read(cwd, "2-sprint", "ISS-0011");
      const fm = fmOf(cwd, "2-sprint", "ISS-0011");
      const before = parseFrontmatterOf(original);
      expect(delimiters(after), JSON.stringify(reason)).toBe(2);
      for (const key of Object.keys(before)) {
        if (["status", "updated"].includes(key)) continue;
        expect(fm[key], `${JSON.stringify(reason)} / ${key}`).toEqual(before[key]);
      }
      expect(fm.status).toBe("2-sprint");
      expect(bodyOf(after), JSON.stringify(reason)).toBe(bodyOf(original));
    }
  });

  it("stays stable through every later write: move out and back, start, review", () => {
    for (const reason of ["agreed ---", "x: y"]) {
      const cwd = project();
      expect(lyt(cwd, "move", "ISS-0011", "2-sprint", "--discovery-override", reason).exitCode).toBe(0);
      const first = read(cwd, "2-sprint", "ISS-0011");
      lyt(cwd, "move", "ISS-0011", "1-backlog");
      expect(mask(read(cwd, "1-backlog", "ISS-0011")), "back to backlog").toBe(mask(first));
      expect(lyt(cwd, "move", "ISS-0011", "2-sprint").exitCode).toBe(0); // the record counts: it passes
      expect(mask(read(cwd, "2-sprint", "ISS-0011")), "again in the sprint").toBe(mask(first));
      expect(lyt(cwd, "start", "ISS-0011").exitCode).toBe(0);
      expectSameCard(read(cwd, "3-in-progress", "ISS-0011"), first, "start");
      expect(lyt(cwd, "move", "ISS-0011", "4-review").exitCode).toBe(0);
      expect(lyt(cwd, "review", "ISS-0011", "--verdict", "go").exitCode).toBe(0);
      expectSameCard(read(cwd, "4-review", "ISS-0011"), first, "review verdict");
    }
  }, 60_000);

  it("keeps a claimed card whole", () => {
    const cwd = project();
    expect(lyt(cwd, "move", "ISS-0011", "2-sprint", "--discovery-override", "agreed ---").exitCode).toBe(0);
    const first = read(cwd, "2-sprint", "ISS-0011");
    expect(lyt(cwd, "claim", "ISS-0011").exitCode).toBe(0);
    const claimed = read(cwd, "3-in-progress", "ISS-0011");
    expectSameCard(claimed, first, "claim");
  });

  it("refuses a reason with nothing in it but dashes, and leaves the card untouched", () => {
    const cwd = project();
    const original = read(cwd, "1-backlog", "ISS-0011");
    const r = lyt(cwd, "move", "ISS-0011", "2-sprint", "--discovery-override", "-----");
    expect(r.exitCode).toBe(1);
    expect(read(cwd, "1-backlog", "ISS-0011")).toBe(original);
  });
});

function parseFrontmatterOf(text: string) {
  return parseFrontmatter(text)!;
}
