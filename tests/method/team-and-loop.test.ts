/**
 * The team-and-loop briefing (ISS-0157): eleven roles, the loop between the
 * owner's two gates, and the five cases where the loop stops.
 *
 * The document is prose, so these tests pin what a reader must be able to rely
 * on — every role is there with all five attributes, the five stop cases are
 * exactly five, the commands it names exist — not its wording.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { execFileSync } from "child_process";
import { leaksIn } from "../helpers/shipped-content.js";

const root = process.cwd();
const read = (p: string): string => readFileSync(join(root, p), "utf-8");
const DOC = "method/rules/team-and-loop.md";
const doc = read(DOC);

const ROLES = [
  "Framing",
  "Designer",
  "UX expert",
  "Design-system keeper",
  "Code-quality lead",
  "Developers",
  "End-to-end tester",
  "Cyber defender",
  "Red team",
  "Solutioner",
  "Release",
];

/** The rows of the role table, split into cells. */
function roleRows(): string[][] {
  return doc
    .split("\n")
    .filter((l) => l.startsWith("| **"))
    .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));
}

describe("the role catalog", () => {
  const rows = roleRows();

  it("names the eleven roles, once each, in a table with the five attributes", () => {
    expect(rows).toHaveLength(ROLES.length);
    ROLES.forEach((role, i) => expect(rows[i][0], role).toContain(role));
    const header = doc.split("\n").find((l) => l.startsWith("| Role |"))!;
    for (const column of ["Mission", "Input", "Output", "Right", "Blocks when"]) {
      expect(header).toContain(column);
    }
  });

  it("fills every cell of every row", () => {
    for (const row of rows) {
      expect(row, row[0]).toHaveLength(6);
      row.forEach((cell, i) => expect(cell.length, `${row[0]} / column ${i}`).toBeGreaterThan(3));
    }
  });

  it("gives every role a right: read-only, or an explicit write", () => {
    for (const row of rows) {
      expect(row[4], row[0]).toMatch(/read-only|writes?/i);
    }
  });

  it("makes the reviewers read-only, and only developers, release and the tester write", () => {
    const right = (role: string) => rows.find((r) => r[0].includes(role))![4];
    for (const reviewer of ["UX expert", "Design-system keeper", "Code-quality lead", "Cyber defender"]) {
      expect(right(reviewer)).toBe("Read-only");
    }
    expect(right("Developers")).toMatch(/^Write/);
    expect(right("Release")).toMatch(/^Writes to production/);
    expect(right("End-to-end tester")).toMatch(/never product code/);
  });

  it("points reviews at rubrics that ship", () => {
    for (const m of doc.matchAll(/rubrics\/([a-z-]+)\.md/g)) {
      expect(existsSync(join(root, `method/quality/rubrics/${m[1]}.md`)), m[1]).toBe(true);
    }
  });

  it("requires a structured report from every role", () => {
    expect(doc).toMatch(/Every role hands back a structured report/);
    expect(doc).toMatch(/what could not be verified/);
  });
});

describe("the loop", () => {
  it("has the owner frame at the entrance and accept at the exit, on a packet of evidence", () => {
    expect(doc).toMatch(/The owner frames at the entrance and accepts at the exit, on a packet of evidence/);
    expect(doc).toMatch(/The loop never closes its\s+own work/);
  });

  it("says the owner does not replay what the machine has proved", () => {
    expect(doc).toMatch(/The owner does not replay what the machine has proved/);
    for (const pin of ["product-intent", "screen-reader", "legal-accounting", "real-money"]) {
      expect(doc).toContain(`human:${pin}`);
    }
  });

  it("stops in exactly five cases", () => {
    const section = doc.slice(doc.indexOf("## When the loop stops"));
    expect(section.match(/^\d+\. \*\*/gm)).toHaveLength(5);
    for (const phrase of [
      /irreversible gesture/i,
      /contradiction the contract does not settle/i,
      /serious finding not lifted/i,
      /budget is exceeded/i,
      /Two failures in a row/i,
    ]) {
      expect(section).toMatch(phrase);
    }
  });

  it("names only commands the CLI has", () => {
    const help = execFileSync("node", [join(root, "dist/cli.js"), "--help"], { encoding: "utf-8" });
    const verbs = new Set([...doc.matchAll(/npx lyt ([a-z-]+)/g)].map((m) => m[1]));
    expect(verbs.size).toBeGreaterThanOrEqual(5);
    for (const verb of verbs) expect(help, verb).toMatch(new RegExp(`\\b${verb}\\b`));
  });
});

describe("the document stays short, generic and in the method's map", () => {
  it("is at most two pages", () => {
    expect(doc.split(/\s+/).length).toBeLessThan(1300);
  });


  it("carries nothing private (generic checks; private terms only if provided locally)", () => {
    // No list of names lives in this public repository: see tests/helpers/shipped-content.ts.
    expect(leaksIn(doc)).toEqual([]);
  });

  it("names the design register in English, as the file the method ships", () => {
    expect(doc).toContain("`design/registry.md`");
    expect(doc).not.toMatch(/registre/i);
  });

  it("is operational, not a persona", () => {
    expect(doc).toMatch(/operational, not a persona/);
  });

  it("is referenced from LYTOS.md and rules/README.md, and shipped", () => {
    expect(read("method/LYTOS.md")).toContain("`rules/team-and-loop.md`");
    expect(read("method/rules/README.md")).toContain("`team-and-loop.md`");
    expect(read("src/lib/scaffold.ts")).toContain("rules/team-and-loop.md");
    expect(read("src/commands/upgrade.ts")).toContain("rules/team-and-loop.md");
  });

  it("LYTOS.md reconciles the roles with the method's personas, in one sentence", () => {
    const lytos = read("method/LYTOS.md");
    expect(lytos).toMatch(/team roles of `rules\/team-and-loop\.md` are operational roles for review and for agents, not personas/);
    expect(lytos).toMatch(/three personas of the method[^.]*remain people/);
  });

  it("is the copy this repo runs on", () => {
    expect(read(".lytos/rules/team-and-loop.md")).toBe(doc);
    expect(read(".lytos/LYTOS.md")).toBe(read("method/LYTOS.md"));
  });
});
