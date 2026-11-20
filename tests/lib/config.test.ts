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

describe("parseConfig — a long line costs linear time (ISS-0176, F9)", () => {
  const LONG = 200_000;
  const shapes: Array<[string, string]> = [
    ["no colon at all", "a".repeat(LONG)],
    ["spaces between short words", "a ".repeat(LONG / 2)],
    ["a key with a very long value", `key: ${"v".repeat(LONG)}`],
    ["an unterminated quote", `"${"q".repeat(LONG)}`],
    ["a quoted key with no colon", `"${"k".repeat(LONG)}" tail`],
    ["a very long inline list", `list: [${"a,".repeat(LONG / 2)}]`],
    ["colons not followed by a space", "a:".repeat(LONG / 2)],
    ["a long key ending in a colon", `${"k".repeat(LONG)}:`],
    ["a long list item", `list:\n  - ${"i ".repeat(LONG / 2)}`],
    ["a long comment", `# ${"c".repeat(LONG)}`],
    ["a hash inside a long key", `${"a".repeat(LONG)}#b: c`],
    ["a long run of spaces inside a line", `a${" ".repeat(LONG)}b`],
    ["a long run of tabs and spaces inside a line", `a${"\t ".repeat(LONG / 2)}b`],
    ["a long run of spaces before a colon", `a${" ".repeat(LONG)}: v`],
    ["a long run of spaces in a list item", `list:\n  - a${" ".repeat(LONG)}b`],
  ];
  for (const [name, text] of shapes) {
    it(`parses ${name} in well under 100 ms`, () => {
      const start = performance.now();
      expect(() => parseConfig(text)).not.toThrow();
      expect(performance.now() - start).toBeLessThan(100);
    });
  }

  it("reproduces the reviewer's case: 40,000 spaces inside one line took 2.7 s", () => {
    const start = performance.now();
    parseConfig(`a${" ".repeat(40_000)}b`);
    expect(performance.now() - start).toBeLessThan(100);
  });

  it("still reads a long value correctly", () => {
    const { data } = parseConfig(`key: ${"v".repeat(LONG)}\nnext: 1\n`);
    expect((data.key as string).length).toBe(LONG);
    expect(data.next).toBe("1");
  });
});

describe("parseConfig — the key/value split, pinned (ISS-0176)", () => {
  it.each([
    ["a:b: c", { "a:b": "c" }],
    ['"quoted key": v', { "quoted key": "v" }],
    ["'single': v", { single: "v" }],
    ['"a" b: c', { '"a" b': "c" }],
    ["key   : spaced", { key: "spaced" }],
    ["empty:", { empty: "" }],
    ['q: ""', { q: "" }],
    ["url: http://example.com/x", { url: "http://example.com/x" }],
  ])("%j", (text, expected) => {
    const { data, ignored } = parseConfig(text);
    expect(data).toEqual(expected);
    expect(ignored).toEqual([]);
  });

  it.each(["key:value", ": nothing before", "#key: x", "a#b: c"])(
    "reports %j as not a key: value line",
    (text) => {
      const { ignored } = parseConfig(text);
      expect(ignored.length === 1 || text.startsWith("#")).toBe(true);
    }
  );
});

describe("parseConfig — keys that name Object.prototype members (ISS-0176, F10)", () => {
  const TEXT = [
    "toString: x",
    "constructor: y",
    "hasOwnProperty: z",
    "valueOf:",
    "  a: b",
    "__proto__:",
    "  independence:",
    "    minimum:",
    "      high: any",
    "section:",
    "  __proto__: p",
    "  constructor: q",
    "",
  ].join("\n");

  it("keeps them as ordinary keys, without a spurious duplicate-key report", () => {
    const { data, ignored } = parseConfig(TEXT);
    expect(ignored).toEqual([]);
    expect(Object.keys(data)).toEqual([
      "toString",
      "constructor",
      "hasOwnProperty",
      "valueOf",
      "__proto__",
      "section",
    ]);
    expect(data.toString).toBe("x");
    expect(data.constructor).toBe("y");
  });

  it("never lets a __proto__ key change what the map inherits", () => {
    const { data } = parseConfig(TEXT);
    expect(Object.getPrototypeOf(data)).toBeNull();
    expect(data.independence).toBeUndefined();
    const section = data.section as Record<string, unknown>;
    expect(Object.getPrototypeOf(section)).toBeNull();
    expect(section.__proto__).toBe("p");
    // nothing leaked onto the real prototype either
    expect(({} as Record<string, unknown>).independence).toBeUndefined();
    expect(({} as Record<string, unknown>).minimum).toBeUndefined();
  });

  it("still reports a genuine duplicate of such a key", () => {
    const { ignored } = parseConfig("toString: a\ntoString: b\n");
    expect(ignored).toHaveLength(1);
    expect(ignored[0].reason).toContain("duplicate");
  });
});

describe("parseConfig — the first line sets no base indentation (ISS-0176)", () => {
  it("reads only column-0 keys as top-level: an indented line is reported, not promoted", () => {
    const { data, ignored } = parseConfig("  design: claude-design\n");
    expect(data).toEqual({});
    expect(ignored).toHaveLength(1);
    expect(ignored[0].reason).toContain("unexpected indentation");
  });
});
