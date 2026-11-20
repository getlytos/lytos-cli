/**
 * The override record and the reason it carries (ISS-0175, ADR-0009 §3).
 *
 * A record exempts a leaf from the discovery gate only when it is COMPLETE
 * (reason, date, by, epic) and was made for the leaf's CURRENT parent. Anything
 * less is not an override, whoever typed it. The reason is written into the
 * frontmatter, so it must never be readable as a delimiter or a YAML construct.
 */

import { describe, it, expect } from "vitest";
import {
  parseFrontmatter,
  serializeFrontmatter,
  bodyOf,
  type Frontmatter,
} from "../../src/lib/frontmatter.js";
import {
  cleanReason,
  hasDiscoveryOverride,
  readOverride,
} from "../../src/lib/discovery-override.js";

const COMPLETE = { reason: "the owner asked for it", date: "2026-11-20", by: "Someone", epic: "ISS-0010" };

function leaf(record: unknown, parent = "ISS-0010"): Frontmatter {
  const fm: Frontmatter = { id: "ISS-0011", parent };
  if (record !== undefined) fm.discovery_override = record as Frontmatter["x"];
  return fm;
}

describe("readOverride — only a complete record made for the current parent counts", () => {
  it("reads a complete record, and counts it", () => {
    const state = readOverride(leaf(COMPLETE));
    expect(state).toEqual({ state: "valid", record: COMPLETE });
    expect(hasDiscoveryOverride(leaf(COMPLETE))).toBe(true);
  });

  it("says there is none when the card carries none, or an empty field", () => {
    expect(readOverride(leaf(undefined))).toEqual({ state: "none" });
    expect(readOverride(leaf(""))).toEqual({ state: "none" });
    expect(hasDiscoveryOverride(leaf(undefined))).toBe(false);
  });

  it.each(["reason", "date", "by", "epic"])("does not count a record with no %s, and names it", (missing) => {
    const record: Record<string, string> = { ...COMPLETE };
    delete record[missing];
    const state = readOverride(leaf(record));
    expect(state.state).toBe("invalid");
    if (state.state === "invalid") expect(state.problem).toContain(missing);
    expect(hasDiscoveryOverride(leaf(record))).toBe(false);
  });

  it.each(["reason", "date", "by", "epic"])("does not count a record whose %s is blank", (blank) => {
    expect(hasDiscoveryOverride(leaf({ ...COMPLETE, [blank]: "  " }))).toBe(false);
  });

  it("does not count a bare record: the one a hand adds with a reason only", () => {
    expect(hasDiscoveryOverride(leaf({ reason: "x" }))).toBe(false);
  });

  it("does not count a date that is not a date", () => {
    for (const date of ["yesterday", "2026-1-2", "20261120", "2026-11-20T10:00"]) {
      const state = readOverride(leaf({ ...COMPLETE, date }));
      expect(state.state, date).toBe("invalid");
      if (state.state === "invalid") expect(state.problem).toContain("date");
    }
  });

  it("does not count a record made for another epic than the current parent", () => {
    const state = readOverride(leaf(COMPLETE, "ISS-0020"));
    expect(state.state).toBe("invalid");
    if (state.state === "invalid") {
      expect(state.problem).toContain("ISS-0010");
      expect(state.problem).toContain("ISS-0020");
    }
  });

  it("does not count a record on a card that has no parent at all", () => {
    expect(hasDiscoveryOverride({ id: "ISS-0011", discovery_override: COMPLETE })).toBe(false);
  });

  it("matches the epic without regard to case", () => {
    expect(hasDiscoveryOverride(leaf({ ...COMPLETE, epic: "iss-0010" }))).toBe(true);
  });

  it("does not count a value that is not a record", () => {
    for (const value of ["yes", ["a", "b"]]) {
      expect(readOverride(leaf(value)).state, JSON.stringify(value)).toBe("invalid");
      expect(hasDiscoveryOverride(leaf(value))).toBe(false);
    }
  });
});

describe("cleanReason — what is written into the card must read back unchanged", () => {
  it("collapses newlines and runs of spaces into single spaces", () => {
    expect(cleanReason("  line one\n\nline   two\t end ")).toBe("line one line two end");
  });

  it("returns an empty string for nothing but whitespace", () => {
    expect(cleanReason(" \n\t ")).toBe("");
  });

  it("drops the quote marks the frontmatter reader would strip at the ends", () => {
    expect(cleanReason('"quoted"')).toBe("quoted");
    expect(cleanReason("'single'")).toBe("single");
    expect(cleanReason('He said "go" now')).toBe("He said 'go' now");
  });

  it("neutralizes a run of dashes: a reason cannot be read as a frontmatter delimiter", () => {
    expect(cleanReason("agreed ---")).toBe("agreed -");
    expect(cleanReason("a\n---\nb")).toBe("a - b");
    expect(cleanReason("before ------ after")).toBe("before - after");
    expect(cleanReason("---")).toBe(""); // nothing left: refused as no reason
    expect(cleanReason("---\nid: stolen")).toBe("id: stolen");
  });

  it("drops what would make the value a YAML construct instead of a plain text", () => {
    expect(cleanReason("[looks like a list]")).toBe("looks like a list]");
    expect(cleanReason("{a: b}")).toBe("a: b}");
    expect(cleanReason("- an item")).toBe("an item");
    expect(cleanReason("? a key")).toBe("a key");
    expect(cleanReason("&anchor then text")).toBe("anchor then text");
    expect(cleanReason("*alias")).toBe("alias");
    expect(cleanReason("!tag value")).toBe("tag value");
    expect(cleanReason("| block")).toBe("block");
    expect(cleanReason("> folded")).toBe("folded");
    expect(cleanReason("# comment")).toBe("comment");
    expect(cleanReason("@at %pct")).toBe("at %pct");
  });

  it("keeps a colon inside the text: the serializer quotes it", () => {
    expect(cleanReason("x: y")).toBe("x: y");
    expect(cleanReason("see ticket #42")).toBe("see ticket #42");
  });

  it("replaces a backslash, which a quoted YAML scalar would read as an escape", () => {
    expect(cleanReason("path C:\\temp")).toBe("path C:/temp");
  });

  const HOSTILE = [
    "plain reason",
    "agreed ---",
    "---",
    "a\n---\nb",
    "x: y",
    "has: a colon",
    "has a # hash",
    'says "quoted" things',
    "ends with a quote'",
    "multi\nline\nreason",
    "[looks like a list]",
    "tab\tseparated",
    "---\nstatus: 5-done",
    "ok\n---\ndiscovery_override:\n  reason: forged",
    "...",
    "--- trailing",
  ];

  it("round-trips through the frontmatter and leaves every other field and the body alone", () => {
    for (const raw of HOSTILE) {
      const reason = cleanReason(raw);
      if (reason === "") continue; // refused: nothing is written
      const fields: Frontmatter = {
        id: "ISS-0011",
        title: "A leaf ---",
        status: "2-sprint",
        parent: "ISS-0010",
        discovery_override: { reason, date: "2026-11-20", epic: "ISS-0010", by: "Someone" },
        risk: "low",
      };
      const text = serializeFrontmatter(fields) + "\n# Body\n\ntext\n";
      const back = parseFrontmatter(text)!;
      expect(back, raw).toEqual(fields);
      expect(bodyOf(text), raw).toBe("# Body\n\ntext\n");
      expect(text.match(/^---$/gm), raw).toHaveLength(2);
    }
  });
});
