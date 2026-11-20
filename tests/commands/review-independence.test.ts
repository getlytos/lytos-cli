/**
 * Integration tests for reviewer independence at `lyt review` (ADR-0010, ISS-0166):
 * the verdict paths that may and may not record an approval, as the CLI binary
 * runs them.
 */

import { describe, it, expect, afterEach } from "vitest";
import { spawnSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve, join } from "path";
import { createEmptyBoardFixture, type Fixture } from "../helpers/fixtures.js";

const CLI = resolve(__dirname, "../../dist/cli.js");

function run(args: string[], cwd: string, input?: string) {
  const result = spawnSync("node", [CLI, ...args], { cwd, encoding: "utf-8", input });
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    exitCode: result.status ?? 0,
  };
}

function git(args: string[], cwd: string): void {
  const r = spawnSync("git", args, { cwd, encoding: "utf-8" });
  if ((r.status ?? 0) !== 0) throw new Error(r.stderr || `git ${args.join(" ")} failed`);
}

let fixture: Fixture;
afterEach(() => fixture?.cleanup());

interface Card {
  risk?: string;
  implementer?: string; // "model" or "model/session"
}

function ai(name: string, spec?: string): string {
  if (!spec) return "";
  const [model, session] = spec.split("/");
  return `${name}:\n  model: ${model}\n${session ? `  session: ${session}\n` : ""}`;
}

/** A project with one card in 4-review, a git identity, and an optional config. */
function project(card: Card = {}, config?: string): { file: string; cwd: string } {
  fixture = createEmptyBoardFixture();
  const cwd = fixture.cwd;
  git(["init", "-b", "main"], cwd);
  git(["config", "user.name", "alice"], cwd);
  git(["config", "user.email", "alice@test"], cwd);
  const file = join(cwd, ".lytos", "issue-board", "4-review", "ISS-0901-x.md");
  writeFileSync(
    file,
    `---\nid: ISS-0901\ntitle: "Sample"\nstatus: 4-review\n${card.risk ? `risk: ${card.risk}\n` : ""}${ai("ai_implementer", card.implementer)}---\n\n# ISS-0901 — Sample\n\n## Definition of done\n\n- [x] a — verify: auto\n`
  );
  if (config !== undefined) writeFileSync(join(cwd, ".lytos", "config.yml"), config);
  return { file, cwd };
}

const read = (file: string) => readFileSync(file, "utf-8");

describe("lyt review --verdict at high risk", () => {
  it("refuses `go` from the same model, exits 1 and leaves the card untouched", () => {
    const { file, cwd } = project({ risk: "high", implementer: "claude-opus-x/s1" });
    const before = read(file);
    const r = run(["review", "ISS-0901", "--verdict", "go", "--ai-model", "claude-opus-x", "--ai-session", "s2"], cwd);
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("cannot produce `review: go` at risk high");
    expect(r.stderr).toContain("--countersign");
    expect(r.stderr).toContain("Nothing was written");
    expect(read(file)).toBe(before);
  });

  it("refuses when the card records no models at all", () => {
    const { file, cwd } = project({ risk: "high" });
    const before = read(file);
    const r = run(["review", "ISS-0901", "--verdict", "go"], cwd);
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("level unknown");
    expect(read(file)).toBe(before);
  });

  it("refuses `go-pending-human` the same way", () => {
    const { cwd } = project({ risk: "high", implementer: "claude-opus-x/s1" });
    const r = run(["review", "ISS-0901", "--verdict", "go-pending-human", "--ai-model", "claude-opus-x"], cwd);
    expect(r.exitCode).toBe(1);
  });

  it("records `go` with --countersign: who, when and weak independence", () => {
    const { file, cwd } = project({ risk: "high", implementer: "claude-opus-x/s1" });
    const r = run(
      ["review", "ISS-0901", "--verdict", "go", "--ai-model", "claude-opus-x", "--ai-session", "s2", "--countersign"],
      cwd
    );
    expect(r.exitCode).toBe(0);
    const content = read(file);
    expect(content).toMatch(/^review:\s*go$/m);
    expect(content).toMatch(/^\s+countersigned_by:\s*alice$/m);
    expect(content).toMatch(/^\s+countersigned_at:\s*\d{4}-\d{2}-\d{2}$/m);
    expect(content).toMatch(/^\s+countersigned_as:\s*weak independence$/m);
    expect(r.stderr).toContain("Countersigned by alice");
  });

  it("records `go` from a different provider with no countersignature", () => {
    const { file, cwd } = project({ risk: "high", implementer: "claude-opus-x/s1" });
    const r = run(["review", "ISS-0901", "--verdict", "go", "--ai-model", "gpt-big", "--ai-session", "s2"], cwd);
    expect(r.exitCode).toBe(0);
    expect(r.stderr).toContain("Independence: level 1 — different provider");
    expect(read(file)).not.toContain("countersigned_by");
    expect(read(file)).toMatch(/^\s+level:\s*1$/m);
  });

  it("refuses --countersign when the review is independent enough", () => {
    const { file, cwd } = project({ risk: "high", implementer: "claude-opus-x/s1" });
    const before = read(file);
    const r = run(["review", "ISS-0901", "--verdict", "go", "--ai-model", "gpt-big", "--countersign"], cwd);
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("Nothing to countersign");
    expect(read(file)).toBe(before);
  });

  it("refuses --countersign with a verdict that does not approve", () => {
    const { file, cwd } = project({ risk: "high", implementer: "claude-opus-x/s1" });
    const before = read(file);
    const r = run(["review", "ISS-0901", "--verdict", "no-go", "--countersign"], cwd);
    expect(r.exitCode).toBe(1);
    expect(existsSync(file)).toBe(true);
    expect(read(file)).toBe(before);
  });

  it("refuses --countersign when git has no user name to record", () => {
    const { file, cwd } = project({ risk: "high", implementer: "claude-opus-x/s1" });
    git(["config", "user.name", ""], cwd);
    const before = read(file);
    const r = spawnSync(
      "node",
      [CLI, "review", "ISS-0901", "--verdict", "go", "--ai-model", "claude-opus-x", "--countersign"],
      { cwd, encoding: "utf-8", env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_SYSTEM: "/dev/null" } }
    );
    expect(r.status).toBe(1);
    expect(read(file)).toBe(before);
  });

  it("always records a rejection, whatever the independence", () => {
    const { cwd } = project({ risk: "high", implementer: "claude-opus-x/s1" });
    const r = run(["review", "ISS-0901", "--verdict", "no-go", "--ai-model", "claude-opus-x"], cwd);
    expect(r.exitCode).toBe(0);
    expect(existsSync(join(cwd, ".lytos/issue-board/3-in-progress/ISS-0901-x.md"))).toBe(true);
  });

  it("rejects --countersign with no --verdict", () => {
    const { cwd } = project({ risk: "high" });
    const r = run(["review", "ISS-0901", "--countersign"], cwd);
    expect(r.exitCode).toBe(2);
    expect(r.stderr).toContain("--countersign goes with --verdict");
  });
});

describe("lyt review — the project's configuration", () => {
  it("refuses a weak review outright when the team tightens it to `refuse`, countersignature or not", () => {
    const { file, cwd } = project(
      { risk: "high", implementer: "claude-opus-x/s1" },
      "independence:\n  below_minimum:\n    high: refuse\n"
    );
    const before = read(file);
    for (const extra of [[], ["--countersign"]]) {
      const r = run(["review", "ISS-0901", "--verdict", "go", "--ai-model", "claude-opus-x", ...extra], cwd);
      expect(r.exitCode).toBe(1);
      expect(r.stderr).toContain("refuses it");
    }
    expect(read(file)).toBe(before);
  });

  it("uses a configured ranking to reach level 2", () => {
    const { file, cwd } = project(
      { risk: "high", implementer: "claude-haiku-x/s1" },
      "independence:\n  ranking: [claude-haiku-x, claude-opus-x]\n"
    );
    const r = run(["review", "ISS-0901", "--verdict", "go", "--ai-model", "claude-opus-x", "--ai-session", "s2"], cwd);
    expect(r.exitCode).toBe(0);
    expect(r.stderr).toContain("level 2 — same provider, stronger model");
    expect(read(file)).toMatch(/^review:\s*go$/m);
  });

  it("warns about, and ignores, an attempt to loosen the high-risk minimum", () => {
    const { file, cwd } = project(
      { risk: "high", implementer: "claude-opus-x/s1" },
      "independence:\n  minimum:\n    high: any\n  below_minimum:\n    high: warn\n"
    );
    const before = read(file);
    const r = run(["review", "ISS-0901", "--verdict", "go", "--ai-model", "claude-opus-x", "--ai-session", "s2"], cwd);
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("may only tighten");
    expect(read(file)).toBe(before);
  });

  it("warns about a config line it cannot read, and carries on with the defaults", () => {
    const { cwd } = project({ risk: "low" }, "independence:\n\tminimum: x\n");
    const r = run(["review", "ISS-0901", "--verdict", "go"], cwd);
    expect(r.exitCode).toBe(0);
    expect(r.stderr).toContain("tab indentation");
  });
});

describe("lyt review --verdict at lower risk", () => {
  it("records a medium-risk self-review and says it is below the minimum", () => {
    const { file, cwd } = project({ risk: "medium", implementer: "claude-opus-x/s1" });
    const r = run(["review", "ISS-0901", "--verdict", "go", "--ai-model", "claude-opus-x", "--ai-session", "s1"], cwd);
    expect(r.exitCode).toBe(0);
    expect(r.stderr).toContain("below the minimum");
    expect(read(file)).toMatch(/^review:\s*go$/m);
  });

  it("changes nothing for a card with no risk and no AI flags (the pre-1.7 flow)", () => {
    const { file, cwd } = project();
    const r = run(["review", "ISS-0901", "--verdict", "go"], cwd);
    expect(r.exitCode).toBe(0);
    expect(read(file)).toMatch(/^review:\s*go$/m);
    expect(read(file)).not.toMatch(/^ai_reviewer:/m);
  });

  it("records anything at low risk, quietly meeting the minimum", () => {
    const { cwd } = project({ risk: "low" });
    const r = run(["review", "ISS-0901", "--verdict", "go"], cwd);
    expect(r.exitCode).toBe(0);
    expect(r.stderr).toContain("meets it");
  });
});

describe("lyt review --accept", () => {
  const GO = "## Audit — 2026-11-20\n\n**Verdict:** GO\n\n### Checks\n- [x] Tests pass\n";

  it("records the AI reviewer it is given, never writes `review:`, and says what `go` will need", () => {
    const { file, cwd } = project({ risk: "high", implementer: "claude-opus-x/s1" });
    const audit = join(cwd, "audit.md");
    writeFileSync(audit, GO);
    const r = run(["review", "ISS-0901", "--accept", audit, "--ai-model", "claude-opus-x", "--ai-session", "s2"], cwd);
    expect(r.exitCode).toBe(0);
    const content = read(file);
    expect(content).toContain("**Verdict:** GO");
    expect(content).toMatch(/^ai_reviewer:\s*$/m);
    expect(content).toMatch(/^\s+model:\s*claude-opus-x$/m);
    expect(content).not.toMatch(/^review:/m);
    expect(r.stderr).toContain("will need --countersign");
  });

  it("says nothing alarming when the audit is independent enough", () => {
    const { cwd } = project({ risk: "high", implementer: "claude-opus-x/s1" });
    const audit = join(cwd, "audit.md");
    writeFileSync(audit, GO);
    const r = run(["review", "ISS-0901", "--accept", audit, "--ai-model", "gpt-big"], cwd);
    expect(r.exitCode).toBe(0);
    expect(r.stderr).toContain("Independence: level 1");
    expect(r.stderr).not.toContain("--countersign");
  });

  it("leaves the card as it was when the audit comes with no AI flags", () => {
    const { file, cwd } = project({ risk: "low" });
    const audit = join(cwd, "audit.md");
    writeFileSync(audit, GO);
    expect(run(["review", "ISS-0901", "--accept", audit], cwd).exitCode).toBe(0);
    expect(read(file)).not.toMatch(/^ai_reviewer:/m);
  });

  it("still records the AI reviewer on a NO_GO, which moves the card", () => {
    const { cwd } = project({ risk: "high", implementer: "claude-opus-x/s1" });
    const audit = join(cwd, "audit.md");
    writeFileSync(audit, "## Audit — 2026-11-20\n\n**Verdict:** NO_GO\n\n### To fix before next review\n- [ ] x\n");
    const r = run(["review", "ISS-0901", "--accept", audit, "--ai-model", "claude-opus-x"], cwd);
    expect(r.exitCode).toBe(0);
    const moved = read(join(cwd, ".lytos/issue-board/3-in-progress/ISS-0901-x.md"));
    expect(moved).toMatch(/^\s+model:\s*claude-opus-x$/m);
  });
});

describe("no other verb writes `review:` — the one door is --verdict", () => {
  /** The card wherever it now sits on the board. */
  function cardOf(cwd: string): string {
    const board = join(cwd, ".lytos", "issue-board");
    for (const dir of ["0-icebox", "1-backlog", "2-sprint", "3-in-progress", "4-review", "5-done", "parked"]) {
      const file = join(board, dir, "ISS-0901-x.md");
      if (existsSync(file)) return read(file);
    }
    throw new Error("card not found");
  }

  /** High risk, the same model on both sides: the card no approval may be recorded on alone. */
  function weakCard(): string {
    const { cwd, file } = project({ risk: "high", implementer: "claude-opus-x/s1" });
    writeFileSync(file, read(file).replace("---\n\n#", "ai_reviewer:\n  model: claude-opus-x\n  session: s2\n---\n\n#"));
    return cwd;
  }

  it("`lyt move` and `lyt close` leave `review:` alone", () => {
    const cwd = weakCard();
    for (const args of [["move", "ISS-0901", "2-sprint", "--force"], ["move", "ISS-0901", "4-review", "--force"], ["close", "ISS-0901"]]) {
      expect(run(args, cwd).exitCode, args.join(" ")).toBe(0);
      expect(cardOf(cwd)).not.toMatch(/^review:/m);
    }
  });

  it("`lyt absorb` writes the AI fields from the journal and never `review:`", () => {
    const cwd = weakCard();
    mkdirSync(join(cwd, ".lytos", ".runtime"), { recursive: true });
    writeFileSync(
      join(cwd, ".lytos", ".runtime", "session.jsonl"),
      '{"issue":"ISS-0901","role":"reviewer","model":"gpt-big","session":"r1"}\n'
    );
    expect(run(["absorb", "ISS-0901", "--apply"], cwd).exitCode).toBe(0);
    expect(cardOf(cwd)).toMatch(/^\s+model:\s*gpt-big$/m);
    expect(cardOf(cwd)).not.toMatch(/^review:/m);
  });

  it("a journal absorbed AFTER a go changes the reviewer — and the packet says the go no longer holds", () => {
    const { file, cwd } = project({ risk: "high", implementer: "claude-opus-x/s1" });
    expect(
      run(["review", "ISS-0901", "--verdict", "go", "--ai-model", "gpt-big", "--ai-session", "s2"], cwd).exitCode
    ).toBe(0);
    mkdirSync(join(cwd, ".lytos", ".runtime"), { recursive: true });
    writeFileSync(
      join(cwd, ".lytos", ".runtime", "session.jsonl"),
      '{"issue":"ISS-0901","role":"reviewer","model":"claude-opus-x","session":"s9"}\n'
    );
    expect(run(["absorb", "ISS-0901", "--apply"], cwd).exitCode).toBe(0);
    expect(read(file)).toMatch(/^review:\s*go$/m); // absorb never touches the verdict…
    const packet = JSON.parse(run(["report", "ISS-0901", "--json"], cwd).stdout).independence;
    expect(packet.level).toBe(3); // …but the packet recomputes from the card as it stands now
    expect(packet.opposable).toBe(false);
    expect(packet.drift.join(" ")).toContain("recorded level 1");
    const md = run(["report", "ISS-0901"], cwd).stdout;
    expect(md).toContain("is not opposable");
    expect(md).toContain("no longer matches the card");
  });

  it("`lyt migrate-frontmatter --apply` does not write `review:`", () => {
    const cwd = weakCard();
    expect(run(["migrate-frontmatter", "--apply"], cwd).exitCode).toBeLessThan(2);
    expect(cardOf(cwd)).not.toMatch(/^review:/m);
  });

  it("`lyt review --accept` ingests a GO audit without writing `review:`", () => {
    const cwd = weakCard();
    const audit = join(cwd, "audit.md");
    writeFileSync(audit, "## Audit — 2026-11-20\n\n**Verdict:** GO\n");
    expect(run(["review", "ISS-0901", "--accept", audit], cwd).exitCode).toBe(0);
    expect(cardOf(cwd)).not.toMatch(/^review:/m);
  });

  it("only --verdict does, and it is refused on that card", () => {
    const cwd = weakCard();
    expect(run(["review", "ISS-0901", "--verdict", "go"], cwd).exitCode).toBe(1);
    expect(cardOf(cwd)).not.toMatch(/^review:/m);
  });
});

describe("lyt review --help", () => {
  it("documents --countersign and the rule", () => {
    fixture = createEmptyBoardFixture();
    const r = run(["review", "--help"], fixture.cwd);
    expect(r.stdout).toContain("--countersign");
    expect(r.stdout).toContain("independence:");
    expect(r.stdout).toContain("ADR-0010");
  });
});

describe("a project with the config in a directory the CLI cannot read", () => {
  it("falls back to the defaults and still enforces the high-risk rule", () => {
    const { file, cwd } = project({ risk: "high", implementer: "claude-opus-x/s1" });
    mkdirSync(join(cwd, ".lytos", "config.yml"));
    const before = read(file);
    const r = run(["review", "ISS-0901", "--verdict", "go", "--ai-model", "claude-opus-x"], cwd);
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("could not be read");
    expect(read(file)).toBe(before);
  });
});
