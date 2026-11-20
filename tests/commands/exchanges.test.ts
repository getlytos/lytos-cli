/**
 * Integration tests for `lyt exchanges` — the derived index of the open design
 * exchanges (ISS-0169, ADR-0009 §4). Each test runs the built binary on a
 * temporary project.
 */

import { describe, it, expect, afterEach } from "vitest";
import { spawnSync } from "child_process";
import { createHash } from "crypto";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { createEmptyFixture, type Fixture } from "../helpers/fixtures.js";

const CLI = resolve(__dirname, "../../dist/cli.js");
const SRC = (p: string): string => readFileSync(resolve(__dirname, "../..", p), "utf-8");

function run(args: string[], cwd: string) {
  const r = spawnSync("node", [CLI, ...args], { cwd, encoding: "utf-8" });
  return { stdout: r.stdout ?? "", stderr: r.stderr ?? "", exitCode: r.status ?? 0 };
}

const entry = (n: string, fields: Record<string, string> = {}, epic = "ISS-0163"): string => {
  const fm = { id: `${epic}/${n}`, epic, from: "design", type: "gap", status: "open", ...fields };
  const lines = Object.entries(fm).map(([k, v]) => `${k}: ${v}`);
  return `---\n${lines.join("\n")}\n---\n\nThe mock-up and the data disagree on this state.\n`;
};

let fixture: Fixture;
afterEach(() => fixture?.cleanup());

function project(design: string | null, entries: Record<string, string> = {}): string {
  fixture = createEmptyFixture();
  const cwd = fixture.cwd;
  const flag = design === null ? [] : ["--design", design];
  expect(run(["init", "--yes", "--tool", "none", ...flag], cwd).exitCode).toBe(0);
  for (const [path, content] of Object.entries(entries)) {
    const full = join(cwd, ".lytos", "design", "exchanges", path);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, content);
  }
  return cwd;
}

/** Every file under `dir` with a digest of its content: what "nothing changed" means. */
function snapshot(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (d: string): void => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (name === ".git") continue;
      if (statSync(full).isDirectory()) walk(full);
      else out[full.slice(dir.length)] = createHash("sha1").update(readFileSync(full)).digest("hex");
    }
  };
  walk(dir);
  return out;
}

const TWO_OPEN_ONE_RESOLVED = {
  "ISS-0163/001-empty-state.md": entry("001"),
  "ISS-0163/002-button-label.md": entry("002", { status: "resolved", type: "decision" }),
  "ISS-0170/001-new-prompt.md": entry("001", { from: "code", type: "prompt" }, "ISS-0170"),
};

describe("lyt exchanges — a claude-design project", () => {
  it("lists the open entries only, one line each, and counts the resolved ones", () => {
    const cwd = project("claude-design", TWO_OPEN_ONE_RESOLVED);
    const r = run(["exchanges"], cwd);
    expect(r.exitCode).toBe(0);
    expect(r.stdout.trimEnd().split("\n")).toEqual([
      "Open design exchanges: 2 (1 resolved)",
      "",
      "  ISS-0163/001  gap     design → code  .lytos/design/exchanges/ISS-0163/001-empty-state.md",
      "  ISS-0170/001  prompt  code → design  .lytos/design/exchanges/ISS-0170/001-new-prompt.md",
    ]);
    expect(r.stdout).not.toContain("button-label");
  });

  it("drops an entry from the index the moment it is resolved, and puts it back if it is reopened", () => {
    const cwd = project("claude-design", TWO_OPEN_ONE_RESOLVED);
    const file = join(cwd, ".lytos", "design", "exchanges", "ISS-0163", "001-empty-state.md");
    writeFileSync(file, entry("001", { status: "resolved" }));
    let r = run(["exchanges"], cwd);
    expect(r.stdout).toContain("Open design exchanges: 1 (2 resolved)");
    expect(r.stdout).not.toContain("empty-state");
    writeFileSync(file, entry("001", { status: "open" }));
    r = run(["exchanges"], cwd);
    expect(r.stdout).toContain("empty-state");
  });

  it("says there is nothing to list, with exit 0, when no entry is open", () => {
    expect(run(["exchanges"], project("claude-design")).stdout.trim()).toBe("No open design exchanges.");
    const cwd = project("claude-design", { "ISS-0163/001-done.md": entry("001", { status: "resolved" }) });
    expect(run(["exchanges"], cwd).stdout.trim()).toBe("No open design exchanges (1 resolved).");
  });

  it("is derived: it writes nothing, so there is no index to edit by hand or to commit", () => {
    const cwd = project("claude-design", TWO_OPEN_ONE_RESOLVED);
    const before = snapshot(cwd);
    for (const args of [["exchanges"], ["exchanges", "--json"]]) {
      expect(run(args, cwd).exitCode).toBe(0);
      expect(snapshot(cwd)).toEqual(before);
    }
    const inExchanges = Object.keys(snapshot(cwd)).filter((f) => f.includes("/design/exchanges/"));
    expect(inExchanges.filter((f) => /index/i.test(f))).toEqual([]);
  });

  it("prints the same entries as JSON, with the resolved count and no problem", () => {
    const cwd = project("claude-design", TWO_OPEN_ONE_RESOLVED);
    const json = JSON.parse(run(["exchanges", "--json"], cwd).stdout);
    expect(json.status).toBe("ok");
    expect(json.design).toBe("claude-design");
    expect(json.resolved).toBe(1);
    expect(json.problems).toEqual([]);
    expect(json.open.map((e: { id: string }) => e.id)).toEqual(["ISS-0163/001", "ISS-0170/001"]);
    expect(json.open[0]).toMatchObject({ epic: "ISS-0163", from: "design", type: "gap", status: "open" });
  });

  it("reports a malformed entry with its file and fault, exits 1, and still lists the others", () => {
    const cwd = project("claude-design", {
      "ISS-0163/001-fine.md": entry("001"),
      "ISS-0163/002-typo.md": entry("002", { status: "opne" }),
    });
    const r = run(["exchanges"], cwd);
    expect(r.exitCode).toBe(1);
    expect(r.stdout).toContain("ISS-0163/001");
    expect(r.stderr).toContain(".lytos/design/exchanges/ISS-0163/002-typo.md");
    expect(r.stderr).toContain('status "opne" is not one of: open, resolved');
    const json = JSON.parse(run(["exchanges", "--json"], cwd).stdout);
    expect(json.problems).toHaveLength(1);
    expect(run(["exchanges", "--json"], cwd).exitCode).toBe(1);
  });

  it("flags a body over 150 words and keeps the open entry in the index", () => {
    const long = `---\nid: ISS-0163/001\nepic: ISS-0163\nfrom: code\ntype: prompt\nstatus: open\n---\n\n${"word ".repeat(151)}\n`;
    const r = run(["exchanges"], project("claude-design", { "ISS-0163/001-long.md": long }));
    expect(r.exitCode).toBe(1);
    expect(r.stdout).toContain("ISS-0163/001");
    expect(r.stderr).toMatch(/151 words; the limit is 150/);
  });

  it("refuses to read an entry through a symbolic link", () => {
    const cwd = project("claude-design", { "ISS-0163/001-fine.md": entry("001") });
    const outside = join(cwd, "outside.md");
    writeFileSync(outside, entry("009"));
    require("fs").symlinkSync(outside, join(cwd, ".lytos", "design", "exchanges", "ISS-0163", "009-link.md"));
    const r = run(["exchanges"], cwd);
    expect(r.exitCode).toBe(1);
    expect(r.stdout).not.toContain("009");
    expect(r.stderr).toContain("symbolic link");
  });
});

describe("lyt exchanges — a project that does not use Claude Design sees nothing new", () => {
  it.each([["none"], ["other"], [null]])("design %s: says so, exits 0, prints no index, writes nothing", (design) => {
    const cwd = project(design, TWO_OPEN_ONE_RESOLVED);
    const before = snapshot(cwd);
    const r = run(["exchanges"], cwd);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toBe("");
    expect(r.stderr).toMatch(/not in use here: design is "(none|other)"/);
    expect(r.stderr).toContain("claude-design");
    expect(snapshot(cwd)).toEqual(before);
    const json = JSON.parse(run(["exchanges", "--json"], cwd).stdout);
    expect(json).toMatchObject({ status: "not-in-use", open: [], resolved: 0, problems: [] });
  });

  it("works with no config.yml at all, and with a design key it does not know", () => {
    const cwd = project("none", TWO_OPEN_ONE_RESOLVED);
    for (const config of [null, "design: figma\n", "design:\n"]) {
      if (config === null) require("fs").rmSync(join(cwd, ".lytos", "config.yml"));
      else writeFileSync(join(cwd, ".lytos", "config.yml"), config);
      const r = run(["exchanges"], cwd);
      expect(r.exitCode, String(config)).toBe(0);
      expect(r.stdout).toBe("");
      expect(r.stderr).toContain("not in use here");
    }
  });

  it("leaves lint and doctor saying the same whether entries are present or not", () => {
    const bare = project("none");
    const findings = (cwd: string) => {
      const d = JSON.parse(run(["doctor", "--json"], cwd).stdout);
      return { f: d.findings, score: d.score, lint: JSON.parse(run(["lint", "--json"], cwd).stdout) };
    };
    const before = findings(bare);
    const withEntries = project("none", TWO_OPEN_ONE_RESOLVED);
    const after = findings(withEntries);
    expect(after.f).toEqual(before.f);
    expect(after.lint).toEqual(before.lint);
  });
});

describe("lyt exchanges — the edges", () => {
  it("exits 2 without a .lytos/ folder", () => {
    fixture = createEmptyFixture();
    const r = run(["exchanges"], fixture.cwd);
    expect(r.exitCode).toBe(2);
    expect(r.stderr).toContain("No .lytos/ directory found");
  });

  it("documents the format in --help and is listed in the root help with an example", () => {
    fixture = createEmptyFixture();
    const help = run(["exchanges", "--help"], fixture.cwd).stdout;
    for (const part of ["NNN-<slug>.md", "gap | prompt | response | decision", "design | code", "open | resolved", "150 words", "lyt exchanges --json"]) {
      expect(help, part).toContain(part);
    }
    expect(run(["--help"], fixture.cwd).stdout).toContain("lyt exchanges");
  });

  it("cannot reach the network, and cannot write: it imports neither", () => {
    for (const file of ["src/commands/exchanges.ts", "src/lib/exchanges.ts", "src/lib/exchanges-scan.ts", "src/lib/design-config.ts"]) {
      const code = SRC(file);
      expect(code, file).not.toMatch(/from "(node:)?(https?|http2|net|tls|dns|dgram|child_process)"/);
      expect(code, file).not.toMatch(/\bfetch\(|XMLHttpRequest|WebSocket/);
      expect(code, file).not.toMatch(/writeFile|appendFile|mkdirSync|rmSync|unlinkSync|renameSync|copyFile|symlinkSync/);
    }
  });
});
