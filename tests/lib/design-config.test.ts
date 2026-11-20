/**
 * ISS-0176, F12 — one reader of `.lytos/config.yml`.
 *
 * `design-config.ts` (ISS-0169) read the file with a regex of its own while
 * `config.ts` (ISS-0166) read it as YAML. Now `config.ts` is the only reader and
 * the design answer is one of its keys. These tests pin the behavior the regex
 * had, so that the move changes nothing a project can see.
 */

import { describe, it, expect, afterEach } from "vitest";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { readDesign } from "../../src/lib/design-config.js";
import { designFromConfig } from "../../src/lib/design.js";
import { createEmptyFixture, type Fixture } from "../helpers/fixtures.js";

let fixture: Fixture;
afterEach(() => fixture?.cleanup());

function lytosWith(config?: string): string {
  fixture = createEmptyFixture();
  const lytos = join(fixture.cwd, ".lytos");
  mkdirSync(lytos);
  if (config !== undefined) writeFileSync(join(lytos, "config.yml"), config);
  return lytos;
}

describe("readDesign", () => {
  it.each([
    ["language: en\ndesign: claude-design\n", "claude-design"],
    ["design: other\n", "other"],
    ["design: none\n", "none"],
    ['design: "claude-design"\n', "claude-design"],
    ["design: 'other'\n", "other"],
    ["design: claude-design # we use it\n", "claude-design"],
    ["design: Claude-Design\n", "claude-design"],
    ["# Lytos configuration\r\nlanguage: fr\r\ndesign: claude-design\r\n", "claude-design"],
  ])("%j -> %s", (config, expected) => {
    expect(readDesign(lytosWith(config))).toBe(expected);
  });

  it("is none for an absent file, an unreadable one, and anything it does not recognise", () => {
    expect(readDesign(lytosWith())).toBe("none");
    fixture?.cleanup();
    fixture = createEmptyFixture();
    mkdirSync(join(fixture.cwd, ".lytos", "config.yml"), { recursive: true });
    expect(readDesign(join(fixture.cwd, ".lytos"))).toBe("none");
    for (const config of [
      "",
      "design:\n",
      "design: figma\n",
      "design: claude-design extra\n",
      "design: [claude-design]\n",
      "# design: claude-design\n",
      "  design: claude-design\n",
      "section:\n  design: claude-design\n",
      "toString: x\n__proto__:\n  design: claude-design\n",
    ]) {
      expect(readDesign(lytosWith(config)), JSON.stringify(config)).toBe("none");
    }
  });

  it("reads the LAST of two design keys: the one deliberate difference from the old regex (first)", () => {
    expect(readDesign(lytosWith("design: none\ndesign: claude-design\n"))).toBe("claude-design");
  });

  it("agrees with designFromConfig on the same text", () => {
    for (const config of ["design: claude-design\n", "design: other\n", "design: figma\n", ""]) {
      expect(readDesign(lytosWith(config))).toBe(designFromConfig(config));
    }
  });

  it("reads a file with a very long line quickly", () => {
    const start = performance.now();
    expect(readDesign(lytosWith(`a${" ".repeat(200_000)}b\ndesign: other\n`))).toBe("other");
    expect(performance.now() - start).toBeLessThan(200);
  });
});

describe("there is one reader of config.yml", () => {
  function sources(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return sources(path);
      return path.endsWith(".ts") ? [path] : [];
    });
  }

  it("only config.ts builds the path of the file to read it (scaffold.ts builds it to WRITE it)", () => {
    const src = resolve(__dirname, "../../src");
    const builders = sources(src)
      .filter((file) => /join\([^)]*["']config\.yml["']/.test(readFileSync(file, "utf-8")))
      .map((file) => file.slice(src.length + 1));
    expect(builders).toEqual(["lib/config.ts", "lib/scaffold.ts"]);
    const scaffold = readFileSync(join(src, "lib/scaffold.ts"), "utf-8");
    expect(scaffold).toMatch(/writeFile\(\s*join\(lytosDir, "config\.yml"\)/);
  });

  it("design-config.ts goes through it", () => {
    const code = readFileSync(resolve(__dirname, "../../src/lib/design-config.ts"), "utf-8");
    expect(code).toMatch(/from "\.\/config\.js"/);
    expect(code).not.toMatch(/readFileSync/);
  });
});
