/**
 * Integration tests for the independence section of `lyt report` (ADR-0010,
 * ISS-0166): what the packet shows, and — above all — that a hand edit of the
 * card cannot make an approval look better than it is.
 */

import { describe, it, expect, afterEach } from "vitest";
import { spawnSync } from "child_process";
import { mkdirSync, writeFileSync } from "fs";
import { resolve, join } from "path";
import { createEmptyFixture, type Fixture } from "../helpers/fixtures.js";

const CLI = resolve(__dirname, "../../dist/cli.js");

function run(args: string[], cwd: string) {
  const r = spawnSync("node", [CLI, ...args], { cwd, encoding: "utf-8" });
  return { stdout: r.stdout || "", stderr: r.stderr || "", exitCode: r.status ?? 0 };
}

let fixture: Fixture;
afterEach(() => fixture?.cleanup());

const KIT =
  "# Kit\n| id | kind | tiers | tool |\n|----|------|-------|------|\n| tests-unit | gate | low,medium,high | npm test |\n";

/** A project with one card in 4-review whose frontmatter is `front`. */
function project(front: string, config?: string): string {
  fixture = createEmptyFixture();
  const cwd = fixture.cwd;
  const lyt = (p: string) => join(cwd, ".lytos", p);
  mkdirSync(lyt("quality"), { recursive: true });
  mkdirSync(lyt("issue-board/4-review"), { recursive: true });
  writeFileSync(lyt("quality/kit.md"), KIT);
  if (config !== undefined) writeFileSync(lyt("config.yml"), config);
  writeFileSync(
    lyt("issue-board/4-review/ISS-0042-x.md"),
    `---\nid: ISS-0042\ntitle: "A change"\nstatus: 4-review\n${front}---\n\n# ISS-0042 — A change\n\n## Definition of done\n\n- [x] Core — verify: auto\n`
  );
  return cwd;
}

const IMPL = "ai_implementer:\n  model: claude-opus-x\n  session: s1\n";
const SAME = "ai_reviewer:\n  model: claude-opus-x\n  session: s2\n";
const OTHER = "ai_reviewer:\n  model: gpt-big\n  session: s2\n";
const SIGNED =
  "review_independence:\n  level: 3\n  risk: high\n  minimum: level-2\n  countersigned_by: alice\n  countersigned_at: 2026-11-20\n  countersigned_as: weak independence\n";

function packet(cwd: string) {
  return JSON.parse(run(["report", "ISS-0042", "--json"], cwd).stdout);
}

describe("the independence section", () => {
  it("shows the level, the minimum for the card's risk and where each value came from", () => {
    const cwd = project(`risk: high\n${IMPL}${SAME}`);
    const md = run(["report", "ISS-0042"], cwd).stdout;
    expect(md).toContain("## Independence");
    expect(md).toContain("Level: **3 — weak independence**");
    expect(md).toContain("minimum at risk **high**: level 1 or 2");
    expect(md).toContain("`claude-opus-x` · session `s2` · provider anthropic (shipped table)");
    expect(md).toContain("ranking: none configured");
    expect(md).toContain(".lytos/config.yml: absent — defaults apply");
    expect(md).toContain("models and sessions: ai_implementer and ai_reviewer in the card frontmatter");
  });

  it("is in the JSON, computed and not declared", () => {
    const cwd = project(`risk: high\n${IMPL}${OTHER}`);
    const i = packet(cwd).independence;
    expect(i).toMatchObject({
      risk: "high",
      level: 1,
      effectiveLevel: 1,
      basis: "different-provider",
      minimum: "level-2",
      belowMinimum: "countersign",
      meetsMinimum: true,
      standing: "meets",
      approved: false,
      opposable: null,
    });
    expect(i.implementer.provider).toBe("anthropic");
    expect(i.reviewer.provider).toBe("openai");
  });

  it("does not trust a level written on the card: only the models count", () => {
    const cwd = project(`risk: high\nindependence_level: 1\nlevel: 1\n${IMPL}${SAME}`);
    expect(packet(cwd).independence.level).toBe(3);
  });

  it("says a go will need the owner's countersignature, before the green evidence", () => {
    const cwd = project(`risk: high\n${IMPL}${SAME}`);
    const md = run(["report", "ISS-0042"], cwd).stdout;
    expect(md).toContain("A `go` on this card will need the owner's countersignature");
    expect(md.indexOf("will need the owner's countersignature")).toBeLessThan(md.indexOf("Evidence (green)"));
    expect(packet(cwd).independence.standing).toBe("needs-countersignature");
  });

  it("reports unknown — treated as level 3 — when the models are not recorded", () => {
    const cwd = project("risk: high\n");
    const i = packet(cwd).independence;
    expect(i.level).toBe("unknown");
    expect(i.effectiveLevel).toBe(3);
    expect(i.flags).toHaveLength(2);
    expect(i.standing).toBe("needs-countersignature");
  });

  it("is quiet where the minimum is met, and asks nothing at low risk", () => {
    expect(packet(project(`risk: high\n${IMPL}${OTHER}`)).independence.decide).toEqual([]);
    const low = packet(project("risk: low\n")).independence;
    expect(low.standing).toBe("meets");
    expect(low.decide).toEqual([]);
  });

  it("reads a ranking from the config and shows it", () => {
    const cwd = project(
      `risk: high\nai_implementer:\n  model: claude-haiku-x\n${SAME.replace("claude-opus-x", "claude-opus-x")}`,
      "independence:\n  ranking: [claude-haiku-x, claude-opus-x]\n"
    );
    const i = packet(cwd).independence;
    expect(i.level).toBe(2);
    expect(run(["report", "ISS-0042"], cwd).stdout).toContain("ranking: .lytos/config.yml (2 models)");
  });

  it("lists what the config could not use", () => {
    const cwd = project(`risk: high\n${IMPL}${SAME}`, "independence:\n  minimum:\n    high: any\n");
    const md = run(["report", "ISS-0042"], cwd).stdout;
    expect(md).toContain("Configuration: independence.minimum.high");
    expect(packet(cwd).independence.minimum).toBe("level-2");
  });
});

describe("a hand edit cannot make an approval look better than it is", () => {
  it("flags a `review: go` written by hand at high risk as not opposable", () => {
    const cwd = project(`risk: high\nreview: go\n${IMPL}${SAME}`);
    const p = packet(cwd);
    expect(p.independence.approved).toBe(true);
    expect(p.independence.opposable).toBe(false);
    expect(p.independence.standing).toBe("needs-countersignature");
    const md = run(["report", "ISS-0042"], cwd).stdout;
    expect(md).toContain("this `review: go` is not opposable");
    expect(md.indexOf("is not opposable")).toBeLessThan(md.indexOf("Evidence (green)"));
    expect(p.independence.flags.join(" ")).toContain("no review_independence block");
  });

  it("flags `go-pending-human` the same way", () => {
    const cwd = project(`risk: high\nreview: go-pending-human\n${IMPL}${SAME}`);
    expect(packet(cwd).independence.opposable).toBe(false);
  });

  it("flags a hand-edited go with no models at all", () => {
    expect(packet(project("risk: high\nreview: go\n")).independence.opposable).toBe(false);
  });

  it("does not take a hand-edited `risk: low` for granted: it is shown, and the record disagrees", () => {
    const cwd = project(`risk: low\nreview: go\n${IMPL}${SAME}${SIGNED.replace("level: 3", "level: 3")}`);
    const i = packet(cwd).independence;
    expect(i.risk).toBe("low");
    expect(i.drift.join(" ")).toContain("recorded at risk high, the card now says low");
    expect(run(["report", "ISS-0042"], cwd).stdout).toContain("no longer matches the card");
  });

  it("flags a model edited after the verdict: the recorded level and the computed one differ", () => {
    // The CLI recorded level 1 (a different provider); the reviewer was then edited to the implementer's model.
    const cwd = project(
      `risk: high\nreview: go\n${IMPL}${SAME}review_independence:\n  level: 1\n  risk: high\n  minimum: level-2\n`
    );
    const i = packet(cwd).independence;
    expect(i.level).toBe(3);
    expect(i.recorded).toEqual({ level: "1", risk: "high", minimum: "level-2" });
    expect(i.drift.join(" ")).toContain("recorded level 1");
    expect(i.opposable).toBe(false);
  });

  it("does not let a forged level in the record stand in for the models", () => {
    const cwd = project(`risk: high\nreview: go\n${IMPL}${SAME}review_independence:\n  level: 3\n  risk: high\n  minimum: any\n`);
    const i = packet(cwd);
    expect(i.independence.minimum).toBe("level-2"); // the minimum is the project's, not the card's
    expect(i.independence.opposable).toBe(false);
  });

  it("shows a typed countersignature as typed, with the name and date, to be confirmed", () => {
    const cwd = project(`risk: high\nreview: go\n${IMPL}${SAME}${SIGNED}`);
    const i = packet(cwd).independence;
    expect(i.standing).toBe("countersigned");
    expect(i.opposable).toBe(true);
    expect(i.countersignature).toEqual({ by: "alice", at: "2026-11-20" });
    const md = run(["report", "ISS-0042"], cwd).stdout;
    expect(md).toContain("Weak independence, countersigned** by alice on 2026-11-20");
    expect(md).toContain("confirm it is the owner's");
  });

  it("ignores an incomplete countersignature", () => {
    for (const broken of [
      SIGNED.replace("  countersigned_by: alice\n", ""),
      SIGNED.replace("2026-11-20", "soon"),
      SIGNED.replace("weak independence", "fine by me"),
    ]) {
      const i = packet(project(`risk: high\nreview: go\n${IMPL}${SAME}${broken}`)).independence;
      expect(i.standing).toBe("needs-countersignature");
      expect(i.opposable).toBe(false);
    }
  });

  it("does not honour a countersignature where the project refuses weak reviews", () => {
    const cwd = project(
      `risk: high\nreview: go\n${IMPL}${SAME}${SIGNED}`,
      "independence:\n  below_minimum:\n    high: refuse\n"
    );
    const i = packet(cwd).independence;
    expect(i.standing).toBe("refused");
    expect(i.opposable).toBe(false);
    expect(i.flags.join(" ")).toContain("this project refuses it");
  });

  it("reads a mistyped risk as high, and says so", () => {
    const i = packet(project(`risk: hgh\nreview: go\n${IMPL}${SAME}`)).independence;
    expect(i.risk).toBe("high");
    expect(i.opposable).toBe(false);
    expect(i.flags.join(" ")).toContain("read as high");
  });

  it("flags a go with no record at medium risk, without blocking it", () => {
    const i = packet(project(`risk: medium\nreview: go\n${IMPL}${SAME}`)).independence;
    expect(i.opposable).toBe(true);
    expect(i.flags.join(" ")).toContain("carries no review_independence block");
    expect(i.decide.join(" ")).toContain("No independence record");
  });

  it("makes a risk lowered by hand, with a go written by hand, impossible to miss", () => {
    // The dodge: the card is high-risk work; `risk: low` and `review: go` are typed in.
    const cwd = project(`risk: low\nreview: go\n${IMPL}${SAME}`);
    const p = packet(cwd);
    expect(p.independence.opposable).toBe(true); // the card, as written, asks nothing at low
    expect(p.independence.decide.join(" ")).toContain("No independence record");
    const md = run(["report", "ISS-0042"], cwd).stdout;
    expect(md).toContain("risk low");
    expect(md.indexOf("No independence record")).toBeLessThan(md.indexOf("Evidence (green)"));
  });

  it("is quiet about an approval the CLI recorded and the card still matches", () => {
    const cwd = project(
      `risk: high\nreview: go\n${IMPL}${OTHER}review_independence:\n  level: 1\n  risk: high\n  minimum: level-2\n`
    );
    const i = packet(cwd).independence;
    expect(i.opposable).toBe(true);
    expect(i.decide).toEqual([]);
    expect(i.drift).toEqual([]);
  });

  it("lists an approval below the minimum as a warning at medium", () => {
    const cwd = project(
      `risk: medium\nreview: go\nai_implementer:\n  model: m\n  session: s\nai_reviewer:\n  model: m\n  session: s\n`
    );
    const i = packet(cwd).independence;
    expect(i.standing).toBe("below-warn");
    expect(i.opposable).toBe(true);
    expect(run(["report", "ISS-0042"], cwd).stdout).toContain("Independence below the minimum");
  });
});

describe("a provider override is shown, and cannot lift a high-risk review (ISS-0176, F4)", () => {
  const OVERRIDE = "independence:\n  providers:\n    claude-opus: someoneelse\n";
  const SONNET = "ai_implementer:\n  model: claude-sonnet-4\n  session: s1\n";
  const OPUS = "ai_reviewer:\n  model: claude-opus-4\n  session: s2\n";

  it("reports the override in the packet and counts the shipped mapping at high risk", () => {
    const cwd = project(`risk: high\nreview: go\n${SONNET}${OPUS}`, OVERRIDE);
    const i = packet(cwd).independence;
    expect(i.level).toBe(1);
    expect(i.appliedLevel).toBe("3");
    expect(i.overrideIgnored).toBe(true);
    expect(i.overrides).toHaveLength(1);
    expect(i.opposable).toBe(false);
    expect(i.configProblems[0]).toContain("reassigns");
    const md = run(["report", "ISS-0042"], cwd).stdout;
    expect(md).toContain("provider override");
    expect(md).toContain("is not opposable");
    expect(md).toContain("counted as level 3");
  });

  it("counts the override at medium risk, flagged", () => {
    const i = packet(project(`risk: medium\nreview: go\n${SONNET}${OPUS}`, OVERRIDE)).independence;
    expect(i.opposable).toBe(true);
    expect(i.overrideIgnored).toBe(false);
    expect(i.flags.join(" ")).toContain("provider override");
  });

  it("is quiet where there is no override", () => {
    const i = packet(project(`risk: high\n${SONNET}${OPUS}`)).independence;
    expect(i.overrides).toEqual([]);
    expect(i.overrideIgnored).toBe(false);
  });
});

describe("the sprint report is unaffected", () => {
  it("still renders", () => {
    const cwd = project(`risk: high\n${IMPL}${SAME}`);
    mkdirSync(join(cwd, ".lytos", "issue-board", "2-sprint"), { recursive: true });
    expect(run(["report", "--sprint"], cwd).exitCode).toBe(0);
  });
});
