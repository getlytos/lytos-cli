/**
 * Unit tests for the frontmatter parser/serializer.
 *
 * Covers schema v1 backward compatibility and schema v2 (ADR-0001):
 * nested objects, optional new fields, unknown-field forward-compat,
 * and round-trip integrity.
 */

import { describe, it, expect } from "vitest";
import { parseFrontmatter, serializeFrontmatter } from "../../src/lib/frontmatter.js";

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
