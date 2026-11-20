/**
 * Unit tests for the frontmatter parser/serializer.
 *
 * Covers schema v1 backward compatibility and schema v2 (ADR-0001):
 * nested objects, optional new fields, unknown-field forward-compat,
 * and round-trip integrity.
 */

import { describe, it, expect } from "vitest";
import { bodyOf, parseFrontmatter, serializeFrontmatter, splitFrontmatter } from "../../src/lib/frontmatter.js";

function wrap(yaml: string): string {
  return `---\n${yaml}\n---\nbody\n`;
}

describe("parseFrontmatter — v1 (backward compat)", () => {
  it("parses the legacy issue shape", () => {
    const fm = parseFrontmatter(
      wrap([
        'id: ISS-0001',
        'title: "Hello"',
        'type: feat',
        'priority: P2-normal',
        'effort: S',
        'status: 1-backlog',
        'depends: []',
        'skills_aux: [testing, documentation]',
        'created: 2026-05-23',
      ].join("\n"))
    );

    expect(fm).not.toBeNull();
    expect(fm!.id).toBe("ISS-0001");
    expect(fm!.title).toBe("Hello");
    expect(fm!.depends).toEqual([]);
    expect(fm!.skills_aux).toEqual(["testing", "documentation"]);
  });

  it("returns null when no frontmatter delimiters are found", () => {
    expect(parseFrontmatter("no frontmatter here")).toBeNull();
  });
});

describe("parseFrontmatter — v2 scalars", () => {
  it("parses new scalar fields (review, risk, surface, confidence, schema_version)", () => {
    const fm = parseFrontmatter(
      wrap([
        'id: ISS-0001',
        'schema_version: 2',
        'review: go',
        'risk: medium',
        'surface: cli',
        'confidence: 85',
      ].join("\n"))
    );

    expect(fm!.schema_version).toBe("2");
    expect(fm!.review).toBe("go");
    expect(fm!.risk).toBe("medium");
    expect(fm!.surface).toBe("cli");
    expect(fm!.confidence).toBe("85");
  });

  it("parses commits list and skills_used list", () => {
    const fm = parseFrontmatter(
      wrap([
        'commits: [abc123, def456]',
        'skills_used: [code-structure, testing]',
      ].join("\n"))
    );

    expect(fm!.commits).toEqual(["abc123", "def456"]);
    expect(fm!.skills_used).toEqual(["code-structure", "testing"]);
  });
});

describe("parseFrontmatter — v2 nested objects", () => {
  it("parses ai_implementer object", () => {
    const fm = parseFrontmatter(
      wrap([
        'id: ISS-0001',
        'ai_implementer:',
        '  model: "claude-opus-4-7"',
        '  session: "abc-123"',
        '  prompt_ref: "skills/code-structure/SKILL.md"',
      ].join("\n"))
    );

    expect(fm!.ai_implementer).toEqual({
      model: "claude-opus-4-7",
      session: "abc-123",
      prompt_ref: "skills/code-structure/SKILL.md",
    });
  });

  it("parses two distinct nested objects (ai_implementer + ai_reviewer)", () => {
    const fm = parseFrontmatter(
      wrap([
        'ai_implementer:',
        '  model: "claude-opus-4-7"',
        '  session: "sess-1"',
        'ai_reviewer:',
        '  model: "gpt-5"',
        '  session: "rev-2"',
        'status: 3-in-progress',
      ].join("\n"))
    );

    expect(fm!.ai_implementer).toEqual({ model: "claude-opus-4-7", session: "sess-1" });
    expect(fm!.ai_reviewer).toEqual({ model: "gpt-5", session: "rev-2" });
    expect(fm!.status).toBe("3-in-progress");
  });

  it("parses validation object with enum-like fields", () => {
    const fm = parseFrontmatter(
      wrap([
        'validation:',
        '  tests: pass',
        '  build: pass',
        '  lint: skip',
      ].join("\n"))
    );

    expect(fm!.validation).toEqual({ tests: "pass", build: "pass", lint: "skip" });
  });
});

describe("parseFrontmatter — forward compat & robustness", () => {
  it("accepts arbitrary unknown top-level fields without crashing", () => {
    const fm = parseFrontmatter(
      wrap([
        'id: ISS-0001',
        'future_field: some-value',
        'another_unknown: 42',
      ].join("\n"))
    );

    expect(fm!.future_field).toBe("some-value");
    expect(fm!.another_unknown).toBe("42");
  });

  it("skips comment lines so commented examples don't pollute the result", () => {
    const fm = parseFrontmatter(
      wrap([
        'id: ISS-0001',
        '# review: go',
        '# risk: low',
        'status: 1-backlog',
      ].join("\n"))
    );

    expect(fm!.id).toBe("ISS-0001");
    expect(fm!.status).toBe("1-backlog");
    expect(fm!.review).toBeUndefined();
    expect(fm!.risk).toBeUndefined();
  });

  it("does not confuse a v1 quoted-empty value with the start of a nested object", () => {
    const fm = parseFrontmatter(
      wrap([
        'skill: ""',
        'status: 1-backlog',
      ].join("\n"))
    );

    expect(fm!.skill).toBe("");
    expect(fm!.status).toBe("1-backlog");
  });
});

describe("serializeFrontmatter — round-trip", () => {
  it("round-trips a v1 frontmatter unchanged in semantics", () => {
    const input = wrap([
      'id: ISS-0001',
      'title: "Hello"',
      'depends: []',
      'skills_aux: [testing, documentation]',
    ].join("\n"));

    const parsed = parseFrontmatter(input)!;
    const serialized = serializeFrontmatter(parsed);
    const reparsed = parseFrontmatter(serialized + "\nbody\n")!;

    expect(reparsed).toEqual(parsed);
  });

  it("round-trips a v2 frontmatter with nested objects", () => {
    const input = wrap([
      'id: ISS-0001',
      'schema_version: 2',
      'review: go',
      'ai_implementer:',
      '  model: "claude-opus-4-7"',
      '  session: "abc"',
      'validation:',
      '  tests: pass',
      '  build: pass',
      '  lint: pass',
      'commits: [sha1, sha2]',
    ].join("\n"));

    const parsed = parseFrontmatter(input)!;
    const serialized = serializeFrontmatter(parsed);
    const reparsed = parseFrontmatter(serialized + "\nbody\n")!;

    expect(reparsed).toEqual(parsed);
    expect(reparsed.ai_implementer).toEqual({ model: "claude-opus-4-7", session: "abc" });
    expect(reparsed.validation).toEqual({ tests: "pass", build: "pass", lint: "pass" });
  });

  it("serializes nested objects with indentation", () => {
    const out = serializeFrontmatter({
      id: "ISS-0001",
      ai_implementer: { model: "claude-opus-4-7", session: "abc" },
    });

    expect(out).toContain("ai_implementer:");
    expect(out).toContain("  model: claude-opus-4-7");
    expect(out).toContain("  session: abc");
  });

  it("serializes an empty list as `[]`", () => {
    const out = serializeFrontmatter({ depends: [] });
    expect(out).toContain("depends: []");
  });
});

describe("serializeFrontmatter — empty string values (ISS-0150)", () => {
  it('serializes an empty string as `""`, not as trailing whitespace', () => {
    const out = serializeFrontmatter({ skill: "" });
    const line = out.split("\n").find((l) => l.startsWith("skill:"));

    expect(line).toBe('skill: ""');
    expect(line).not.toMatch(/\s$/);
  });

  it("applies the same fix to any other empty-string field (e.g. branch)", () => {
    const out = serializeFrontmatter({ branch: "" });
    const line = out.split("\n").find((l) => l.startsWith("branch:"));

    expect(line).toBe('branch: ""');
    expect(line).not.toMatch(/\s$/);
  });

  it("applies the same fix inside a nested object", () => {
    const out = serializeFrontmatter({
      ai_implementer: { model: "", session: "abc" },
    });
    const line = out.split("\n").find((l) => l.trim().startsWith("model:"));

    expect(line).toBe('  model: ""');
    expect(line).not.toMatch(/\s$/);
  });

  it("round-trips an empty-string field with no trailing whitespace introduced", () => {
    const input = wrap(['id: ISS-0001', 'skill: ""', 'status: 1-backlog'].join("\n"));

    const parsed = parseFrontmatter(input)!;
    const serialized = serializeFrontmatter(parsed);
    const reparsed = parseFrontmatter(serialized + "\nbody\n")!;

    expect(reparsed.skill).toBe("");
    expect(reparsed).toEqual(parsed);
    expect(serialized.split("\n").some((l) => /\s$/.test(l))).toBe(false);
  });
});

describe("bodyOf — the body is cut where the parser closes the frontmatter (ISS-0175)", () => {
  it("returns what follows the closing line, without the blank lines after it", () => {
    expect(bodyOf("---\nid: a\n---\n\n# Title\n\ntext\n")).toBe("# Title\n\ntext\n");
    expect(bodyOf("---\nid: a\n---\n# Title\n")).toBe("# Title\n");
  });

  it("keeps the indentation of the first line of the body", () => {
    expect(bodyOf("---\nid: a\n---\n\n    indented\n")).toBe("    indented\n");
  });

  it("keeps horizontal rules and later --- lines in the body", () => {
    expect(bodyOf("---\nid: a\n---\nintro\n\n---\n\nmore\n")).toBe("intro\n\n---\n\nmore\n");
  });

  it("is empty when there is no closing line, or no frontmatter", () => {
    expect(bodyOf("---\nid: a\n")).toBe("");
    expect(bodyOf("no frontmatter\n")).toBe("");
    expect(bodyOf("---\nid: a\n---")).toBe("");
  });

  it("ignores a --- that ends a line of the frontmatter instead of starting one", () => {
    const content = [
      "---",
      "id: ISS-0001",
      "title: A title ---",
      "discovery_override:",
      "  reason: agreed ---",
      "  by: Someone",
      "---",
      "",
      "# Body",
      "",
    ].join("\n");
    expect(bodyOf(content)).toBe("# Body\n");
    // The parser agrees on where the frontmatter ends.
    const fm = parseFrontmatter(content)!;
    expect(fm.title).toBe("A title ---");
    expect((fm.discovery_override as Record<string, string>).by).toBe("Someone");
  });

  it("closes on the same line as the parser, whatever follows the dashes", () => {
    const content = "---\nid: a\n--- trailing words\nbody\n";
    expect(parseFrontmatter(content)).not.toBeNull();
    expect(bodyOf(content)).toBe("body\n");
  });

  it("reads a card with Windows line endings", () => {
    expect(bodyOf("---\r\nid: a\r\n---\r\n\r\n# T\r\n")).toBe("# T\r\n");
  });

  it("is stable: rewriting the frontmatter with it never adds or drops a line", () => {
    const content = "---\nid: a\ntitle: x ---\n---\n# T\n\n---\nrule above\n";
    let text = content;
    for (let i = 0; i < 3; i++) {
      text = serializeFrontmatter(parseFrontmatter(text)!) + "\n" + bodyOf(text);
    }
    expect(text.match(/^---$/gm)).toHaveLength(3); // open, close, and the rule in the body
    expect(text.endsWith("# T\n\n---\nrule above\n")).toBe(true);
  });
});

describe("splitFrontmatter — the block cut at the parser's closing line (ISS-0180)", () => {
  it("puts everything up to the closing dashes in head, and the rest after them", () => {
    const content = "---\nid: a\ntitle: x ---\n--- notes\n\nbody\n";
    const parts = splitFrontmatter(content)!;
    expect(parts.head).toBe("---\nid: a\ntitle: x ---\n");
    expect(parts.rest).toBe(" notes\n\nbody\n");
    expect(parts.head + "---" + parts.rest).toBe(content);
  });

  it("keeps the carriage return of a Windows file in the head", () => {
    const parts = splitFrontmatter("---\r\nid: a\r\n---\r\nbody\r\n")!;
    expect(parts.head).toBe("---\r\nid: a\r\n");
    expect(parts.rest).toBe("\r\nbody\r\n");
  });

  it("is null when there is no block, as parseFrontmatter is", () => {
    for (const content of ["no frontmatter\n", "---\nid: a\n", ""]) {
      expect(splitFrontmatter(content), JSON.stringify(content)).toBeNull();
      expect(parseFrontmatter(content), JSON.stringify(content)).toBeNull();
    }
  });

  it("agrees with the parser and with bodyOf on where the block ends", () => {
    for (const content of [
      "---\nid: a\n---\nbody\n",
      "---\nid: a\nnote: see ---\n---\n\nbody\n---\nrule\n",
      "---  \nid: a\n---\n",
    ]) {
      const parts = splitFrontmatter(content)!;
      expect(parseFrontmatter(content)).not.toBeNull();
      expect(parseFrontmatter(parts.head + "---\n")).toEqual(parseFrontmatter(content));
      expect(bodyOf(content).length).toBeLessThanOrEqual(parts.rest.length);
    }
  });
});
