/**
 * The guide to the design exchange entries (ISS-0169).
 *
 * It documents a format that the CLI parses, so the guide is held to the code:
 * the values it lists are the ones the parser accepts, its example entry is
 * read by the real parser, and every command it cites exists. A guide that
 * drifted from the format would teach agents to write entries the index
 * reports as malformed.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  EXCHANGE_FROM,
  EXCHANGE_STATUSES,
  EXCHANGE_TYPES,
  MAX_BODY_WORDS,
  parseEntry,
} from "../../src/lib/exchanges.js";
import { DESIGN_EXCHANGES_FILES } from "../../src/lib/method-files.js";
import { citationProblems, citations, uncheckedCitations } from "../helpers/cli-citations.js";
import { leaksIn } from "../helpers/shipped-content.js";

const root = process.cwd();
const GUIDE = "method/design/exchanges/README.md";
const guide = readFileSync(join(root, GUIDE), "utf-8");

describe("the guide holds the format the parser accepts", () => {
  it("is the one file the method delivers for the exchanges, under the folder it describes", () => {
    expect(DESIGN_EXCHANGES_FILES).toEqual(["design/exchanges/README.md"]);
    expect(GUIDE).toBe(`method/${DESIGN_EXCHANGES_FILES[0]}`);
  });

  it("names every value of from, type and status, and the word limit", () => {
    for (const value of [...EXCHANGE_FROM, ...EXCHANGE_TYPES, ...EXCHANGE_STATUSES]) {
      expect(guide, value).toContain(`\`${value}\``);
    }
    expect(guide).toContain(`at most ${MAX_BODY_WORDS} words`);
  });

  it("names every frontmatter field in its table", () => {
    for (const field of ["id", "epic", "milestone", "from", "type", "status", "refs"]) {
      expect(guide, field).toMatch(new RegExp(`^\\| \`${field}\` \\|`, "m"));
    }
  });

  it("gives an example entry that the real parser reads without a single problem", () => {
    const example = guide.match(/```markdown\n(---[\s\S]*?)\n```/)![1];
    const parsed = parseEntry(example, "ISS-0163", "001-empty-state.md");
    expect(parsed.problems).toEqual([]);
    expect(parsed.entry).toMatchObject({ id: "ISS-0163/001", epic: "ISS-0163", from: "design", type: "gap", status: "open" });
    expect(parsed.entry?.refs).toEqual(["ISS-0170"]);
    // The same entry with a typo is refused: the example is a real test of the parser.
    expect(parseEntry(example.replace("status: open", "status: opne"), "ISS-0163", "001-x.md").problems).toHaveLength(1);
  });

  it("states where the files live and how they are named", () => {
    expect(guide).toContain(".lytos/design/exchanges/<epic>/NNN-<slug>.md");
  });
});

describe("the guide states the rules of the derived index", () => {
  it("says the index is derived, written by nobody and committed by nobody", () => {
    expect(guide).toMatch(/\*\*The index is derived\.\*\*/);
    expect(guide).toMatch(/No index file exists: do not write one by hand and do not\s+commit one/);
  });

  it("says a resolved entry leaves the index and a malformed one is never dropped", () => {
    expect(guide).toMatch(/set `status: resolved`/);
    expect(guide).toMatch(/It\s+leaves the index/);
    expect(guide).toMatch(/\*\*A malformed entry is reported, never dropped\.\*\*/);
  });

  it("says nothing leaves the repository", () => {
    expect(guide).toMatch(/no network, no design tool/);
  });

  it("cites only commands and flags the CLI has, each in a code span", () => {
    expect(citations(guide).map((c) => c.verb)).toContain("exchanges");
    expect(citationProblems(guide)).toEqual([]);
    expect(uncheckedCitations(guide)).toEqual([]);
  });
});

describe("the guide is generic", () => {
  it("carries nothing private (generic checks; private terms only if provided locally)", () => {
    expect(leaksIn(guide)).toEqual([]);
  });

  it("holds no real link and no date", () => {
    expect(guide).not.toMatch(/https?:\/\//);
    expect(guide).not.toMatch(/20\d\d-\d\d-\d\d/);
  });
});
