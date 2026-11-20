/**
 * Unit tests for the `.lytos/config.yml` reader (ISS-0166): what it reads, and —
 * as important — what it refuses to guess at.
 */

import { describe, it, expect, afterEach } from "vitest";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { parseConfig, readConfig } from "../../src/lib/config.js";
import { createEmptyFixture, type Fixture } from "../helpers/fixtures.js";

describe("parseConfig — what it understands", () => {
  it("reads the flat file `lyt init` writes", () => {
    const { data, ignored } = parseConfig(
      "# Lytos configuration\nlanguage: fr\nprofile: lead\ndesign: none\n"
    );
    expect(data).toEqual({ language: "fr", profile: "lead", design: "none" });
    expect(ignored).toEqual([]);
  });

  it("reads a section of keys, an inline list and a block list", () => {
    const { data, ignored } = parseConfig(
      [
        "independence:",
        "  ranking: [model-a, \"model-b\", 'model-c']",
        "  providers:",
        "    claude: anthropic",
        "    gpt: openai",
        "  minimum:",
        "    high: level-2",
        "  order:",
        "    - first",
        "    - second",
      ].join("\n")
    );
    expect(data).toEqual({
      independence: {
        ranking: ["model-a", "model-b", "model-c"],
        providers: { claude: "anthropic", gpt: "openai" },
        minimum: { high: "level-2" },
        order: ["first", "second"],
      },
    });
    expect(ignored).toEqual([]);
  });

  it("ignores comments, blank lines, a leading --- and a trailing comment", () => {
    const { data, ignored } = parseConfig(
      "---\n\n# a comment\nkey: value # trailing\nquoted: \"a # b\"\nempty:\n"
    );
    expect(data).toEqual({ key: "value", quoted: "a # b", empty: "" });
    expect(ignored).toEqual([]);
  });

  it("copes with CRLF line endings and a BOM", () => {
    const { data } = parseConfig("\uFEFFa: 1\r\nsection:\r\n  b: 2\r\n");
    expect(data).toEqual({ a: "1", section: { b: "2" } });
  });

  it("keeps a key whose name holds a colon (an Ollama-style tag)", () => {
    const { data } = parseConfig("providers:\n  llama3:8b: meta\n");
    expect(data).toEqual({ providers: { "llama3:8b": "meta" } });
  });

  it("returns an empty config for an empty text", () => {
    expect(parseConfig("")).toEqual({ data: {}, ignored: [] });
    expect(parseConfig("\n# only a comment\n")).toEqual({
      data: {},
      ignored: [],
    });
  });
});

describe("parseConfig — what it refuses to guess at", () => {
  it("skips and reports a tab indentation", () => {
    const { data, ignored } = parseConfig("a: 1\nsection:\n\tb: 2\nc: 3\n");
    expect(data).toEqual({ a: "1", section: "", c: "3" });
    expect(ignored).toHaveLength(1);
    expect(ignored[0]).toMatchObject({ line: 3 });
    expect(ignored[0].reason).toContain("tab");
  });

  it("skips and reports a line that is not key: value", () => {
    const { data, ignored } = parseConfig("a: 1\njust some words\nb: 2\n");
    expect(data).toEqual({ a: "1", b: "2" });
    expect(ignored).toEqual([
      { line: 2, text: "just some words", reason: "not a `key: value` line" },
    ]);
  });

  it("skips a multi-line scalar and the lines that belong to it", () => {
    const { data, ignored } = parseConfig(
      "note: |\n  line one\n  line two\nafter: ok\n"
    );
    expect(data).toEqual({ after: "ok" });
    expect(ignored.map((i) => i.line)).toEqual([1, 2, 3]);
  });

  it("skips a mapping inside a list instead of reading it as a string", () => {
    const { data, ignored } = parseConfig("list:\n  - plain\n  - name: x\n");
    expect(data).toEqual({ list: ["plain"] });
    expect(ignored).toHaveLength(1);
    expect(ignored[0].reason).toContain("mapping inside a list");
  });

  it("skips what is nested deeper than four levels", () => {
    const { data, ignored } = parseConfig(
      "a:\n  b:\n    c:\n      d:\n        e: 1\nz: 2\n"
    );
    expect(data.z).toBe("2");
    expect(JSON.stringify(data)).not.toContain('"e"');
    expect(ignored.some((i) => i.reason.includes("deeper"))).toBe(true);
  });

  it("reports an over-indented line and a list item where a key was expected", () => {
    const { data, ignored } = parseConfig("a: 1\n    b: 2\n- c\nd: 4\n");
    expect(data).toEqual({ a: "1", d: "4" });
    expect(ignored.map((i) => i.line)).toEqual([2, 3]);
  });

  it("lets the last duplicate key win and says so", () => {
    const { data, ignored } = parseConfig("a: 1\na: 2\n");
    expect(data).toEqual({ a: "2" });
    expect(ignored[0].reason).toContain("duplicate");
  });

  it("never throws, whatever the text", () => {
    for (const text of ["::::", "[", "- - -", "a: [b", "'unterminated", "\u0000"]) {
      expect(() => parseConfig(text)).not.toThrow();
    }
  });
});

describe("readConfig", () => {
  let fixture: Fixture;
  afterEach(() => fixture?.cleanup());

  it("reports an absent file as an empty, not-present config", () => {
    fixture = createEmptyFixture();
    const config = readConfig(join(fixture.cwd, ".lytos"));
    expect(config).toMatchObject({ data: {}, present: false, unreadable: false });
  });

  it("reads the file under the .lytos directory", () => {
    fixture = createEmptyFixture();
    mkdirSync(join(fixture.cwd, ".lytos"));
    writeFileSync(join(fixture.cwd, ".lytos", "config.yml"), "language: fr\n");
    const config = readConfig(join(fixture.cwd, ".lytos"));
    expect(config.data).toEqual({ language: "fr" });
    expect(config.present).toBe(true);
  });

  it("treats a config.yml that cannot be read as empty, never as a crash", () => {
    fixture = createEmptyFixture();
    mkdirSync(join(fixture.cwd, ".lytos", "config.yml"), { recursive: true });
    const config = readConfig(join(fixture.cwd, ".lytos"));
    expect(config).toMatchObject({ data: {}, present: true, unreadable: true });
  });
});
