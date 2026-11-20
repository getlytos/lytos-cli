/**
 * The method content of the intent layer (ISS-0167, ADR-0009): the epic and
 * milestone templates, and the text that explains the three levels, the discovery
 * phase, the freeze checklist and the gate.
 *
 * The text is prose, so these tests pin what a reader must be able to rely on and
 * what the CLI reads from the templates, not the wording.
 */

import { describe, it, expect, afterEach } from "vitest";
import { readFileSync, existsSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { join, resolve } from "path";
import { execFileSync, execSync, spawnSync } from "child_process";
import { createEmptyFixture, type Fixture } from "../helpers/fixtures.js";
import { createIntentFixture, writeCard } from "../helpers/cards.js";
import { leaksIn } from "../helpers/shipped-content.js";
import { analyzeDod } from "../../src/lib/dod.js";
import { analyzeReady } from "../../src/lib/ready.js";
import { parseFrontmatter } from "../../src/lib/frontmatter.js";
import { readMilestone } from "../../src/lib/milestone.js";
import { UPGRADEABLE_FILES } from "../../src/lib/method-files.js";

const root = process.cwd();
const CLI = resolve(__dirname, "../../dist/cli.js");
const read = (p: string): string => readFileSync(join(root, p), "utf-8");

const EPIC = "issue-board/templates/issue-epic.md";
const MILESTONE = "templates/milestone.md";
const TEMPLATES = [EPIC, MILESTONE];

function lyt(cwd: string, ...args: string[]) {
  const r = spawnSync("node", [CLI, ...args], { cwd, encoding: "utf-8", env: { ...process.env, NO_COLOR: "1" } });
  return { stdout: r.stdout || "", stderr: r.stderr || "", exitCode: r.status ?? 0 };
}

let fixture: Fixture;

afterEach(() => {
  if (fixture) fixture.cleanup();
});

function initProject(): string {
  fixture = createEmptyFixture();
  expect(lyt(fixture.cwd, "init", "--name", "Test Project", "--tool", "none", "--yes").exitCode).toBe(0);
  return fixture.cwd;
}

describe("the two templates ship through the method-file mechanism", () => {
  it("are in the list `upgrade` reads, and on disk in the method folder", () => {
    for (const path of TEMPLATES) {
      expect(UPGRADEABLE_FILES, path).toContain(path);
      expect(existsSync(join(root, "method", path)), path).toBe(true);
    }
  });

  it("`init` scaffolds both, identical to the bundled ones", () => {
    const cwd = initProject();
    for (const path of TEMPLATES) {
      expect(readFileSync(join(cwd, ".lytos", path), "utf-8"), path).toBe(read(`method/${path}`));
    }
  });

  it("`upgrade` adds both to a project that lacks them, and a second run adds nothing", () => {
    const cwd = initProject();
    for (const path of TEMPLATES) rmSync(join(cwd, ".lytos", path));

    const first = lyt(cwd, "upgrade");
    expect(first.exitCode).toBe(0);
    for (const path of TEMPLATES) {
      expect(first.stderr, path).toContain(path);
      expect(readFileSync(join(cwd, ".lytos", path), "utf-8"), path).toBe(read(`method/${path}`));
    }
    expect(first.stderr).toContain("(new)");
    expect(lyt(cwd, "upgrade").stderr).not.toContain("(new)");
  });

  it("`upgrade --dry-run` lists them as new and writes neither", () => {
    const cwd = initProject();
    for (const path of TEMPLATES) rmSync(join(cwd, ".lytos", path));
    const r = lyt(cwd, "upgrade", "--dry-run");
    for (const path of TEMPLATES) {
      expect(r.stderr, path).toContain(path);
      expect(existsSync(join(cwd, ".lytos", path)), path).toBe(false);
    }
  });

  it("`upgrade` keeps a template the project modified, and says it differs", () => {
    const cwd = initProject();
    const mine = "# Our own epic template\n";
    writeFileSync(join(cwd, ".lytos", EPIC), mine);
    const r = lyt(cwd, "upgrade");
    expect(r.exitCode).toBe(0);
    expect(r.stderr).toContain(EPIC);
    expect(r.stderr).toContain("differs");
    expect(readFileSync(join(cwd, ".lytos", EPIC), "utf-8")).toBe(mine);
  });

  it("this repo's own copies are the shipped ones, and so are the rules that mention them", () => {
    expect(read(`.lytos/${EPIC}`)).toBe(read(`method/${EPIC}`));
    expect(read(`.lytos/${MILESTONE}`)).toBe(read(`method/${MILESTONE}`));
    expect(read(".lytos/rules/default-rules.md")).toBe(read("method/rules/default-rules.md"));
    expect(read(".lytos/rules/team-and-loop.md")).toBe(read("method/rules/team-and-loop.md"));
  });

  it("carry nothing private", () => {
    for (const path of TEMPLATES) expect(leaksIn(read(`method/${path}`)), path).toEqual([]);
  });
});

/** The epic template with its placeholders replaced by a real card's values. */
function fillEpic(status: string, phase = "discovery"): string {
  return read(`method/${EPIC}`)
    .replace("id: ISS-XXXX", "id: ISS-0500")
    .replace(/^title: .*$/m, 'title: "Customers can pay by card"')
    .replace(/^priority: .*$/m, "priority: P1-high")
    .replace(/^effort: .*$/m, "effort: L")
    .replace(/^status: .*$/m, `status: ${status}`)
    .replace(/^branch: .*$/m, 'branch: "feat/ISS-0500-pay-by-card"')
    .replace(/^created: .*$/m, "created: 2026-11-20")
    .replace(/^updated: .*$/m, "updated: 2026-11-20")
    .replace(/^phase: .*$/m, `phase: ${phase}`)
    .replace(/ISS-XXXX/g, "ISS-0500")
    .replace("- Artifact: [link]", "- Artifact: the checkout mock-up")
    .replace("- Decision: [one line]", "- Decision: card payments only in this version")
    .replace("Scenario 1: given [state], when [gesture], then [observable result]", "Scenario 1: given a basket, when the customer pays by card, then the order is confirmed")
    .replace("Scenario 2: given [state], when [gesture], then [observable result]", "Scenario 2: given a declined card, when the customer pays, then an error explains what to do");
}

describe("the epic template, filled in", () => {
  it("is a card the CLI reads: type epic, discovery phase, a risk, schema v2", () => {
    const fm = parseFrontmatter(fillEpic("2-sprint"))!;
    expect(fm).toMatchObject({ id: "ISS-0500", type: "epic", phase: "discovery", risk: "medium", schema_version: "2" });
  });

  it("is read as ready by the Ready analysis: nothing is misread", () => {
    const content = fillEpic("2-sprint");
    const ready = analyzeReady(content, parseFrontmatter(content)!);
    expect(ready).toEqual({ ready: true, missing: [] });
  });

  it("has a Definition of done made of its scenarios and the owner's acceptance only", () => {
    const dod = analyzeDod(fillEpic("2-sprint"));
    expect(dod.hasDod).toBe(true);
    // The freeze checklist and the other lists are not Definition-of-done items.
    expect(dod.items).toHaveLength(3);
    expect(dod).toMatchObject({ auto: 2, human: 1, unqualified: 0, loopEligible: true });
    expect(dod.items.filter((i) => i.verify === "human").map((i) => i.pin)).toEqual(["product-intent"]);
  });

  it("makes `lyt lint` raise no warning of any kind on the card", () => {
    fixture = createIntentFixture();
    const cwd = fixture.cwd;
    for (const f of ["manifest.md", "LYTOS.md"]) writeFileSync(join(cwd, ".lytos", f), "# x\n");
    const dir = join(cwd, ".lytos/issue-board/2-sprint");
    writeFileSync(join(dir, "ISS-0500-pay-by-card.md"), fillEpic("2-sprint"));
    writeCard(cwd, "ISS-0501", { fields: { parent: "ISS-0500" } });
    const data = JSON.parse(lyt(cwd, "lint", "--json").stdout);
    const about = data.findings.filter((f: { file: string }) => f.file.includes("ISS-0500"));
    expect(about).toEqual([]);
  });

  it("carries the phase the gate reads: its leaves are refused, then pass once it is frozen", () => {
    fixture = createIntentFixture();
    const cwd = fixture.cwd;
    writeFileSync(join(cwd, ".lytos/issue-board/1-backlog/ISS-0500-pay-by-card.md"), fillEpic("1-backlog"));
    writeCard(cwd, "ISS-0501", { fields: { parent: "ISS-0500" } });
    execSync("git init -b main && git config user.email t@t.io && git config user.name T && git add -A && git commit -qm i --no-gpg-sign", { cwd, stdio: "pipe" });

    const refused = lyt(cwd, "move", "ISS-0501", "2-sprint");
    expect(refused.exitCode).toBe(1);
    expect(refused.stderr).toContain("ISS-0500");

    writeFileSync(join(cwd, ".lytos/issue-board/1-backlog/ISS-0500-pay-by-card.md"), fillEpic("1-backlog", "frozen"));
    expect(lyt(cwd, "move", "ISS-0501", "2-sprint").exitCode).toBe(0);
  });

  it("asks for the freeze checklist the rules state, one line each", () => {
    const section = read(`method/${EPIC}`).split("## Freeze checklist")[1].split("\n## ")[0];
    const items = section.split("\n").filter((l) => l.startsWith("- [ ] "));
    expect(items).toHaveLength(5);
    const text = items.join("\n").toLowerCase();
    for (const phrase of ["product words", "thin slice", "feasibility matrix", "two rounds", "links to the design artifacts"]) {
      expect(text, phrase).toContain(phrase);
    }
  });

  it("holds the feasibility matrix: the three verdicts, a cost and an alternative", () => {
    const header = read(`method/${EPIC}`).split("\n").find((l) => l.startsWith("| Element |"))!;
    for (const column of ["Feasible as is", "Feasible with an adjustment", "Not feasible or too costly", "Cost", "Alternative"]) {
      expect(header).toContain(column);
    }
  });
});

describe("the milestone template", () => {
  it("is read by `lyt milestone` as a well-formed milestone, with its exit criteria", () => {
    fixture = createIntentFixture();
    const dir = join(fixture.cwd, ".lytos", "milestones");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "v1.0.md"), read(`method/${MILESTONE}`));
    const m = readMilestone(join(fixture.cwd, ".lytos"), "v1.0")!;
    expect(m.problems).toEqual([]);
    expect(m.status).toBe("open");
    expect(m.exitCriteria).toHaveLength(2);
    const r = lyt(fixture.cwd, "milestone", "v1.0");
    expect(r.exitCode).toBe(0);
    expect(r.stderr).toContain("Exit criteria");
  });

  it("says where it is copied to and how the milestone is joined", () => {
    const doc = read(`method/${MILESTONE}`);
    expect(doc).toContain(".lytos/milestones/<id>.md");
    expect(doc).toContain("milestone: <id>");
    expect(doc).toContain("status: closed");
  });
});

describe("the rules state the three levels, the freeze checklist and the gate", () => {
  const rules = read("method/rules/default-rules.md");
  const section = rules.slice(rules.indexOf("## Three Levels"), rules.indexOf("## How to Apply"));

  it("names the three levels and how each is closed", () => {
    for (const level of ["Milestone", "Epic", "Leaf"]) expect(section).toMatch(new RegExp(`\\*\\*${level}\\*\\*`));
    expect(section).toMatch(/Three levels, never more/);
    expect(section).toMatch(/no grandchildren/i);
    expect(section).toMatch(/not the sum of its leaves/);
    for (const field of ["type: epic", "parent: ISS-XXXX", "milestone: <id>", "phase"]) expect(section).toContain(field);
  });

  it("says children and progress are derived, and names the commands that read them", () => {
    expect(section).toMatch(/\*\*derived\*\*[^.]*never written by hand/);
    for (const verb of ["board", "show", "milestone", "lint"]) expect(section).toContain(`npx lyt ${verb}`);
  });

  it("states the gate: what is refused, what skips, the two exemptions, who is not concerned", () => {
    expect(section).toMatch(/its leaves\s+cannot leave the backlog/);
    for (const verb of ["move", "start", "claim", "unpark", "close", "next"]) expect(section).toContain(`npx lyt ${verb}`);
    expect(section).toMatch(/send-back/);
    expect(section).toMatch(/override is a person's decision/);
    expect(section).toMatch(/an agent or a wrapper never passes it/);
    expect(section).toContain("type: spike");
    expect(section).toContain('--discovery-override "<reason>"');
    expect(section).toMatch(/A card with no\s+parent epic\s+is not concerned/);
  });

  it("lists the five lines of the freeze, and says a later change is a change request", () => {
    const list = section.slice(section.indexOf("freeze checklist")).split("\n").filter((l) => /^\d\. /.test(l));
    expect(list).toHaveLength(5);
    const text = section.toLowerCase();
    for (const phrase of ["product words", "thin slice", "feasibility matrix", "two rounds", "design artifacts", "change request"]) {
      expect(text, phrase).toContain(phrase);
    }
  });

  it("names only commands and options the CLI has", () => {
    const help = execFileSync("node", [CLI, "--help"], { encoding: "utf-8" });
    for (const m of section.matchAll(/npx lyt ([a-z-]+)/g)) expect(help, m[1]).toMatch(new RegExp(`\\b${m[1]}\\b`));
    for (const verb of ["move", "start", "close"]) {
      expect(execFileSync("node", [CLI, verb, "--help"], { encoding: "utf-8" }), verb).toContain("--discovery-override");
    }
  });

  it("points at the two templates, which ship", () => {
    expect(section).toContain("issue-board/templates/issue-epic.md");
    expect(section).toContain("templates/milestone.md");
  });
});

describe("the loop briefing places the epic in the loop", () => {
  const doc = read("method/rules/team-and-loop.md");

  it("frames an intent that covers several cards as an epic in discovery, frozen by the owner", () => {
    expect(doc).toMatch(/epic in\s+`phase: discovery`/);
    expect(doc).toMatch(/the owner freezes the epic/);
    expect(doc).toMatch(/skips them until then/);
  });

  it("accepts an epic on its scenarios and the packet, not on its leaves", () => {
    expect(doc).toMatch(/An epic is accepted on its scenarios and the packet, not because its leaves are done/);
  });

  it("stays within two pages", () => {
    expect(doc.split(/\s+/).length).toBeLessThan(1300);
  });
});
