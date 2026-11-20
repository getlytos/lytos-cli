/**
 * The reference loop wrapper never passes a flag that overrides a refusal of the
 * CLI (ISS-0177).
 *
 * Two refusals of the CLI suggest a flag to their caller: a review whose
 * independence is below the minimum for the card's risk suggests
 * `--countersign` (ISS-0166), and a leaf of an epic still in discovery suggests
 * `--discovery-override` (ISS-0165). Both flags record a person's decision, and
 * an agent that follows the printed advice would record its own as the owner's.
 * So the wrapper contract must say that both are a person's decision, and the
 * tests below hold it to the CLI: the skill must keep naming both, every flag
 * it forbids must exist, and any flag a real refusal suggests must be named.
 */

import { describe, it, expect, afterEach } from "vitest";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { spawnSync } from "child_process";
import { join, resolve } from "path";
import { createEmptyBoardFixture, type Fixture } from "../helpers/fixtures.js";
import {
  citations,
  cliHasFlag,
  codeSpans,
  flagsIn,
} from "../helpers/cli-citations.js";
import { section } from "../helpers/markdown.js";

const root = process.cwd();
const read = (p: string): string => readFileSync(join(root, p), "utf-8");
const CLI = resolve(root, "dist/cli.js");

const SKILL = read("method/skills/reference-loop/SKILL.md");
const TEAM = read("method/rules/team-and-loop.md");
const BYPASS_FLAGS = ["--countersign", "--discovery-override"];

const contractOf = (doc: string): string => section(doc, /^## Part 1/);
const bendOf = (doc: string): string =>
  section(doc, /^### The lines that do not bend/);
const firstStopCase = (doc: string): string =>
  section(doc, /^#+ When the loop stops/).match(/^1\. .*$/m)?.[0] ?? "";

/** The flags a document names in code spans inside `text`. */
const flagsNamed = (text: string): string[] => flagsIn(codeSpans(text).join(" "));

/** The flags of `flags` that `doc` does not name as forbidden in its lines that do not bend. */
const unnamed = (doc: string, flags: string[]): string[] =>
  flags.filter((f) => !flagsNamed(bendOf(doc)).includes(f));

describe("the wrapper contract names the flags that are a person's decision", () => {
  it("names both flags in Part 1, the agent-neutral contract, under the lines that do not bend", () => {
    expect(bendOf(SKILL)).not.toBe("");
    expect(unnamed(SKILL, BYPASS_FLAGS)).toEqual([]);
    for (const flag of BYPASS_FLAGS) {
      expect(contractOf(SKILL), flag).toContain(`\`${flag}\``);
    }
  });

  it("says in the same breath that each one is a person's decision and that the wrapper never passes it", () => {
    const bullets = bendOf(SKILL).split("\n").filter((l) => l.startsWith("- "));
    for (const flag of BYPASS_FLAGS) {
      const bullet = bullets.find((b) => b.includes(`\`${flag}\``)) ?? "";
      expect(bullet, flag).toMatch(/never/i);
      expect(bullet, flag).toMatch(/person's decision/i);
    }
    expect(bendOf(SKILL)).toMatch(/never writes a verdict/);
    expect(bendOf(SKILL)).toMatch(/never closes a card/);
  });

  it("ties each flag to the command that takes it, so a rename in the CLI fails here", () => {
    const cited = citations(bendOf(SKILL));
    const has = (verb: string, flag: string) =>
      cited.some((c) => c.verb === verb && c.flags.includes(flag));
    expect(has("review", "--countersign")).toBe(true);
    expect(has("move", "--discovery-override")).toBe(true);
    expect(has("start", "--discovery-override")).toBe(true);
  });

  it("says that a refusal which suggests one of them stops the wrapper and calls the human", () => {
    const bend = bendOf(SKILL);
    expect(bend).toMatch(/When the CLI refuses and suggests/);
    expect(bend).toMatch(/does not run it/);
    expect(bend).toMatch(/stops and calls the human/);
    expect(bend).toMatch(/case 1/);
  });

  it("keeps the five stop cases: the override is the first, not a sixth", () => {
    const labels = (doc: string) =>
      [...section(doc, /^#+ When the loop stops/).matchAll(/^\d+\. \*\*(.+?)\*\*/gm)].map((m) => m[1]);
    expect(labels(SKILL)).toHaveLength(5);
    expect(labels(SKILL)).toEqual(labels(TEAM));
    for (const doc of [SKILL, TEAM]) {
      expect(firstStopCase(doc)).toMatch(/An irreversible gesture to authorize/);
      expect(firstStopCase(doc)).toMatch(/an action only a person may take/);
      for (const flag of BYPASS_FLAGS) expect(firstStopCase(doc), flag).toContain(`\`${flag}\``);
    }
  });
});

describe("every flag the skill forbids exists in the CLI", () => {
  it("finds each forbidden flag in the help of some command", () => {
    const forbidden = flagsNamed(bendOf(SKILL));
    expect(forbidden).toEqual(expect.arrayContaining(BYPASS_FLAGS));
    for (const flag of forbidden) expect(cliHasFlag(flag), flag).toBe(true);
  });

  it("catches a forbidden flag the CLI does not have, and a flag the skill stopped naming", () => {
    expect(cliHasFlag("--no-such-flag")).toBe(false);
    const renamed = SKILL.replaceAll("--countersign", "--counter-sign");
    expect(flagsNamed(bendOf(renamed)).filter((f) => !cliHasFlag(f))).toEqual(["--counter-sign"]);
    const dropped = SKILL.replaceAll("--discovery-override", "--discovery");
    expect(unnamed(dropped, BYPASS_FLAGS)).toEqual(["--discovery-override"]);
    const silent = SKILL.replaceAll("--countersign", "").replaceAll("--discovery-override", "");
    expect(unnamed(silent, BYPASS_FLAGS)).toEqual(BYPASS_FLAGS);
  });
});

describe("every flag a real refusal suggests is named by the skill", () => {
  let fixture: Fixture;
  afterEach(() => fixture?.cleanup());

  const lyt = (cwd: string, ...args: string[]) => {
    const r = spawnSync("node", [CLI, ...args], {
      cwd,
      encoding: "utf-8",
      env: { ...process.env, NO_COLOR: "1" },
    });
    return { stderr: r.stderr ?? "", exitCode: r.status ?? 0 };
  };

  const git = (cwd: string): void => {
    spawnSync("git", ["init", "-q", "-b", "main"], { cwd });
    spawnSync("git", ["config", "user.name", "alice"], { cwd });
    spawnSync("git", ["config", "user.email", "alice@test.invalid"], { cwd });
  };

  const card = (cwd: string, dir: string, id: string, front: string): void => {
    const board = join(cwd, ".lytos", "issue-board", dir);
    mkdirSync(board, { recursive: true });
    writeFileSync(
      join(board, `${id}-card.md`),
      `---\nid: ${id}\ntitle: "Card ${id}"\nstatus: ${dir}\n${front}---\n\n# ${id}\n\n## Definition of done\n\n- [x] a — verify: auto\n`
    );
  };

  /** A leaf of an epic in discovery, refused entry into the sprint. */
  function discoveryRefusal(): string {
    fixture = createEmptyBoardFixture();
    git(fixture.cwd);
    card(fixture.cwd, "1-backlog", "ISS-0010", "type: epic\nphase: discovery\n");
    card(fixture.cwd, "1-backlog", "ISS-0011", "type: feat\nparent: ISS-0010\n");
    const r = lyt(fixture.cwd, "move", "ISS-0011", "2-sprint");
    expect(r.exitCode).toBe(1);
    return r.stderr;
  }

  /** A high-risk card whose review has no recorded independence, refused its verdict. */
  function independenceRefusal(): string {
    fixture = createEmptyBoardFixture();
    git(fixture.cwd);
    card(fixture.cwd, "4-review", "ISS-0901", "risk: high\n");
    const r = lyt(fixture.cwd, "review", "ISS-0901", "--verdict", "go");
    expect(r.exitCode).toBe(1);
    return r.stderr;
  }

  it("is refused by the CLI, and the refusal does suggest both flags (or this test proves nothing)", () => {
    const suggested = new Set([
      ...flagsIn(discoveryRefusal()),
      ...flagsIn(independenceRefusal()),
    ]);
    for (const flag of BYPASS_FLAGS) expect(suggested, flag).toContain(flag);
  });

  it("names, as a person's decision, every flag those refusals suggest", () => {
    const suggested = [
      ...new Set([...flagsIn(discoveryRefusal()), ...flagsIn(independenceRefusal())]),
    ];
    expect(unnamed(SKILL, suggested)).toEqual([]);
  });
});
