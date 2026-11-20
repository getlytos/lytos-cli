/**
 * The reference loop wrapper (ISS-0168): a skill for Claude Code and the contract
 * of what any wrapper must do, shipped as method content.
 *
 * Content cannot fail a build by itself, so these tests are what keeps it from
 * drifting away from the CLI it describes: every `lyt` command and flag it cites
 * must exist in the built CLI, every park reason it names must belong to the
 * closed taxonomy (and the whole taxonomy must be named), and the JSON fields it
 * tells an agent to read must be the ones the commands print. One test then walks
 * the chain it describes on a sample project with the real binary.
 */

import { describe, it, expect, afterEach } from "vitest";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "fs";
import { spawnSync } from "child_process";
import { join, resolve } from "path";
import { PARK_REASONS } from "../../src/commands/park.js";
import { UPGRADEABLE_FILES } from "../../src/lib/method-files.js";
import { createEmptyFixture, type Fixture } from "../helpers/fixtures.js";
import { leaksIn } from "../helpers/shipped-content.js";
import {
  citationProblems,
  citations,
  cliOutput,
  codeSpans,
  reasonsNamed,
  uncheckedCitations,
} from "../helpers/cli-citations.js";

const root = process.cwd();
const read = (p: string): string => readFileSync(join(root, p), "utf-8");
const SKILL = "method/skills/reference-loop/SKILL.md";
const skill = read(SKILL);
const CLI = resolve(root, "dist/cli.js");

/** A heading and everything under it, up to the next heading of the same or a higher level. */
function section(doc: string, heading: RegExp): string {
  const lines = doc.split("\n");
  const start = lines.findIndex((l) => heading.test(l));
  if (start < 0) return "";
  const level = lines[start].match(/^#+/)![0].length;
  const end = lines.findIndex(
    (l, i) => i > start && /^#+ /.test(l) && l.match(/^#+/)![0].length <= level
  );
  return lines.slice(start, end < 0 ? undefined : end).join("\n");
}

const contract = section(skill, /^## Part 1/);
const claudeCode = section(skill, /^## Part 2/);

/** The bold labels that open the numbered items of the section about stopping. */
function stopCases(doc: string): string[] {
  return [...section(doc, /^#+ When the loop stops/).matchAll(/^\d+\. \*\*(.+?)\*\*/gm)].map(
    (m) => m[1]
  );
}

describe("the skill is a well-formed task skill", () => {
  it("has the agentskills.io frontmatter and sits in its own folder", () => {
    expect(skill).toMatch(/^---\nname: reference-loop\ndescription: .{40,}\n---\n/);
    expect(skill).toMatch(/Use when /);
  });

  it("has two parts: a contract for any agent, then Claude Code", () => {
    expect(contract).toMatch(/The wrapper contract \(any agent\)/);
    expect(claudeCode).toMatch(/Running it in Claude Code/);
  });

  it("stays readable in one sitting", () => {
    expect(skill.split(/\s+/).length).toBeLessThan(1800);
  });

  it("carries nothing private (generic checks; private terms only if provided locally)", () => {
    expect(leaksIn(skill)).toEqual([]);
  });
});

describe("the chain: select, take, brief, prove, hand over, park", () => {
  it.each([
    ["select", "next"],
    ["budget", "budget"],
    ["take and start", "start"],
    ["take by hand", "claim"],
    ["brief", "show"],
    ["gates", "gates"],
    ["hand over", "move"],
    ["review packet", "report"],
    ["audit prompt", "review"],
    ["park", "park"],
  ])("cites `lyt %s` through the command `%s`", (_step, verb) => {
    expect(citations(skill).map((c) => c.verb)).toContain(verb);
  });

  it("numbers the steps in the order of the loop", () => {
    const steps = [...contract.matchAll(/^(\d+)\. \*\*(Select|Check the budget|Take and start|Brief|Build and tick as you go|Prove|Hand over|Park, never guess)\.\*\*/gm)];
    expect(steps.map((m) => m[2])).toEqual([
      "Select",
      "Check the budget",
      "Take and start",
      "Brief",
      "Build and tick as you go",
      "Prove",
      "Hand over",
      "Park, never guess",
    ]);
    steps.forEach((m, i) => expect(Number(m[1])).toBe(i + 1));
  });
});

describe("every command and flag the skill cites exists in the CLI", () => {
  it("cites no command the CLI lacks, and no flag a command lacks", () => {
    expect(citations(skill).length).toBeGreaterThanOrEqual(10);
    expect(citationProblems(skill)).toEqual([]);
  });

  it("writes every citation in a code span, so that every citation is checked", () => {
    expect(uncheckedCitations(skill)).toEqual([]);
  });

  it("catches a command that does not exist, a flag that does not, and a hidden command", () => {
    const drift = [
      "Run `npx lyt frobnicate ISS-0001`.",
      "Run `npx lyt park ISS-0001 --because ambiguous-spec`.",
      "Run `lyt _merge-issue`.",
      "Run `lyt next --json` then `lyt gates --json --nope`.",
    ].join("\n");
    expect(citationProblems(drift)).toEqual([
      "`lyt frobnicate` is not a command of the CLI",
      "`lyt park` has no --because",
      "`lyt gates` has no --nope",
    ]);
    expect(uncheckedCitations("Then lyt move it, or run `lyt next`.")).toEqual(["lyt move"]);
  });

  it("names every reason `lyt next` gives for a blocked card, and only those", () => {
    const help = cliOutput(["next", "--help"]);
    const inHelp = [...help.matchAll(/^ {2}([a-z]+(?:-[a-z]+)+)\s{2,}/gm)].map((m) => m[1]);
    expect(inHelp.length).toBe(6);
    const step = contract.split("\n").find((l) => l.startsWith("1. **Select.**"))!;
    const named = codeSpans(step).filter((s) => /^[a-z]+(-[a-z]+)+$/.test(s));
    expect(named.sort()).toEqual(inHelp.sort());
  });
});

describe("every park reason the skill names belongs to the taxonomy", () => {
  const named = reasonsNamed(skill);

  it("names reasons, and every one is in the closed taxonomy", () => {
    expect(named.length).toBeGreaterThanOrEqual(PARK_REASONS.length);
    for (const reason of named) {
      expect(PARK_REASONS as readonly string[], reason).toContain(reason);
    }
  });

  it("names the whole taxonomy, so a reason the CLI adds fails here until the skill covers it", () => {
    for (const reason of PARK_REASONS) expect(named, reason).toContain(reason);
  });

  it("agrees with what `lyt park --help` lists", () => {
    const help = cliOutput(["park", "--help"]);
    for (const reason of named) expect(help, reason).toContain(reason);
  });

  it("catches a reason that is not in the taxonomy", () => {
    const drift = [
      "Run `npx lyt park ISS-0001 --reason made-up-reason`.",
      "Park it as `gate-failed`, or as `sometimes-blocked`.",
      "| `another-reason` | a made-up row |",
    ].join("\n");
    const unknown = reasonsNamed(drift).filter((r) => !(PARK_REASONS as readonly string[]).includes(r));
    expect(unknown.sort()).toEqual(["another-reason", "made-up-reason", "sometimes-blocked"]);
  });
});

describe("the five stop cases and the rule that the loop never closes a card", () => {
  const team = read("method/rules/team-and-loop.md");

  it("states exactly five stop cases", () => {
    const cases = stopCases(skill);
    expect(cases).toHaveLength(5);
    const section_ = section(skill, /^#+ When the loop stops/);
    for (const phrase of [
      /irreversible gesture/i,
      /contradiction the contract does not settle/i,
      /serious finding not lifted/i,
      /budget is exceeded/i,
      /Two failures in a row/i,
    ]) {
      expect(section_).toMatch(phrase);
    }
  });

  it("states the same five as the team-and-loop briefing, so the two cannot part", () => {
    expect(stopCases(skill)).toEqual(stopCases(team));
  });

  it("ties the budget case to `lyt budget` and the park taxonomy", () => {
    const cases = section(skill, /^#+ When the loop stops/);
    expect(cases).toMatch(/`npx lyt budget` exits non-zero/);
    expect(cases).toContain("`budget-exhausted`");
  });

  it("says the loop never closes a card, and that closing is a human act", () => {
    expect(skill).toMatch(/\*\*The loop never closes a card\.\*\*/);
    expect(skill).toMatch(/`npx lyt close` is a human act/);
    expect(skill).toMatch(/last transition the loop makes is `4-review`/);
  });

  it("never tells the agent to close, to approve its own work, or to force", () => {
    const runnable = codeSpans(skill).filter((s) => /\blyt close\b/.test(s));
    // `lyt close` appears twice, both times to say it is not the loop's.
    expect(runnable.length).toBeLessThanOrEqual(2);
    for (const line of skill.split("\n").filter((l) => /\blyt close\b/.test(l))) {
      expect(line, line).toMatch(/never|human|owner/i);
    }
    expect(skill).toMatch(/never writes a verdict on its own work/);
    expect(skill).toMatch(/never ticks a `verify: human` item/);
    expect(skill).toMatch(/never forces/);
  });
});

describe("the contract is neutral, the application is for Claude Code", () => {
  it("names no agent in the contract", () => {
    expect(contract).not.toMatch(/claude|anthropic|cursor|codex|copilot|gemini|windsurf/i);
  });

  it("names Claude Code, its Agent tool and the model choice in part two", () => {
    expect(claudeCode).toMatch(/Claude Code/);
    expect(claudeCode).toMatch(/`Agent` tool/);
    expect(claudeCode).toMatch(/`model`/);
    expect(claudeCode).toMatch(/skills\/session-start\.md/);
  });
});

describe("the skill is delivered like the other method skills", () => {
  it("is on the list `upgrade` replaces from, and on the list `init` writes", () => {
    expect(UPGRADEABLE_FILES).toContain("skills/reference-loop/SKILL.md");
    expect(read("src/lib/scaffold.ts")).toContain('"reference-loop"');
  });

  it("is never left out: every skill file under method/skills is upgradeable", () => {
    const walk = (dir: string): string[] =>
      readdirSync(join(root, dir)).flatMap((name) => {
        const rel = `${dir}/${name}`;
        return statSync(join(root, rel)).isDirectory() ? walk(rel) : [rel];
      });
    const onDisk = walk("method/skills").map((p) => p.replace(/^method\//, ""));
    for (const path of onDisk) expect(UPGRADEABLE_FILES, path).toContain(path);
  });

  it("is the copy this repo runs on", () => {
    expect(read(".lytos/skills/reference-loop/SKILL.md")).toBe(skill);
  });

  it("is pointed to by the briefing that describes the loop", () => {
    expect(read("method/rules/team-and-loop.md")).toContain("`skills/reference-loop/SKILL.md`");
    expect(read(".lytos/rules/team-and-loop.md")).toBe(read("method/rules/team-and-loop.md"));
  });
});

describe("the chain the skill describes runs on a sample project", () => {
  let fixture: Fixture;
  afterEach(() => fixture?.cleanup());

  const run = (args: string[], cwd: string) => {
    const r = spawnSync("node", [CLI, ...args], { cwd, encoding: "utf-8" });
    return { stdout: r.stdout ?? "", stderr: r.stderr ?? "", exitCode: r.status ?? 0 };
  };

  const card = (id: string, priority: string, extra = ""): string =>
    `---\nid: ${id}\ntitle: "Card ${id}"\ntype: feat\npriority: ${priority}\neffort: S\nstatus: 2-sprint\ndepends: []\ncreated: 2026-08-01\n${extra}---\n\n# ${id}\n\n## Ready\n\n- **Out of scope** — nothing else.\n\n## Definition of done\n\n- [ ] It works — verify: auto\n`;

  function project(): string {
    fixture = createEmptyFixture();
    const cwd = fixture.cwd;
    spawnSync("git", ["init", "-q", "-b", "main"], { cwd });
    expect(run(["init", "--yes", "--tool", "none", "--name", "sample"], cwd).exitCode).toBe(0);
    const sprint = join(cwd, ".lytos", "issue-board", "2-sprint");
    mkdirSync(sprint, { recursive: true });
    writeFileSync(join(sprint, "ISS-0001-first.md"), card("ISS-0001", "P1-high", "risk: low\n"));
    writeFileSync(join(sprint, "ISS-0002-second.md"), card("ISS-0002", "P2-normal", "risk: low\n"));
    writeFileSync(join(sprint, "ISS-0003-unready.md"), card("ISS-0003", "P0-critical"));
    return cwd;
  }

  const stageOf = (cwd: string, id: string): string | undefined => {
    const board = join(cwd, ".lytos", "issue-board");
    return readdirSync(board).find(
      (dir) =>
        existsSync(join(board, dir)) &&
        statSync(join(board, dir)).isDirectory() &&
        readdirSync(join(board, dir)).some((f) => f.startsWith(id))
    );
  };

  it("hands the pick over, starts it, lists its gates, packs it and parks another, never closing", () => {
    const cwd = project();

    const next = JSON.parse(run(["next", "--json"], cwd).stdout);
    expect(next.pick.id).toBe("ISS-0001");
    expect(next.blocked.map((b: { id: string; reason: string }) => [b.id, b.reason])).toEqual([
      ["ISS-0003", "not-ready"],
    ]);

    expect(run(["budget", "--max-issues", "9"], cwd).exitCode).toBe(0);
    expect(run(["start", "ISS-0001"], cwd).exitCode).toBe(0);
    expect(stageOf(cwd, "ISS-0001")).toBe("3-in-progress");

    const shown = JSON.parse(run(["show", "ISS-0001", "--json"], cwd).stdout);
    expect(shown.body).toContain("Out of scope");
    expect(shown.dod.items[0].verify).toBe("auto");

    const gates = JSON.parse(run(["gates", "ISS-0001", "--json"], cwd).stdout);
    expect(gates.required.length).toBeGreaterThan(0);
    for (const g of gates.required) {
      expect(typeof g.kind).toBe("string");
      expect(typeof g.tool).toBe("string");
    }

    expect(run(["move", "ISS-0001", "4-review"], cwd).exitCode).toBe(0);
    expect(run(["report", "ISS-0001"], cwd).exitCode).toBe(0);
    expect(run(["review", "ISS-0001"], cwd).stdout).toContain("ISS-0001");

    expect(run(["park", "ISS-0002", "--reason", "ambiguous-spec"], cwd).exitCode).toBe(0);
    expect(stageOf(cwd, "ISS-0002")).toBe("parked");

    // The loop's last transition is the review column: nothing here closed a card.
    expect(stageOf(cwd, "ISS-0001")).toBe("4-review");
    expect(existsSync(join(cwd, ".lytos", "issue-board", "5-done", "ISS-0001-first.md"))).toBe(false);
  });

  it("stops on a breached budget: the exit code is the signal the skill names", () => {
    const cwd = project();
    expect(run(["budget", "--max-issues", "1"], cwd).exitCode).toBe(1);
  });

  it("refuses a reason outside the taxonomy and leaves the card where it was", () => {
    const cwd = project();
    const refused = run(["park", "ISS-0001", "--reason", "made-up-reason"], cwd);
    expect(refused.exitCode).toBe(1);
    expect(refused.stderr).toContain("Valid reasons");
    expect(stageOf(cwd, "ISS-0001")).toBe("2-sprint");
  });

  it("prints the JSON fields the skill tells an agent to read", () => {
    const cwd = project();
    expect(Object.keys(JSON.parse(run(["next", "--json"], cwd).stdout))).toEqual(
      expect.arrayContaining(["pick", "blocked"])
    );
    for (const field of ["pick", "blocked", "reason", "required", "kind", "tool", "body", "dod"]) {
      expect(skill, field).toContain(`\`${field}\``);
    }
  });
});
