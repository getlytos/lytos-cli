/**
 * One reader for the frontmatter block (ISS-0175, ISS-0180).
 *
 * Every writer that rewrites a card cuts it in two, and each private copy of the
 * cutting expression was a way for two modules to disagree on where the
 * frontmatter ends: four copies corrupted a card on a line ending in `---`
 * (ISS-0175), and the merge driver kept a fifth (ISS-0180). `frontmatter.ts` owns
 * the one expression; this guard fails when another module declares its own.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

const SRC = join(process.cwd(), "src");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : name.endsWith(".ts") ? [path] : [];
  });
}

/** A regular expression literal that opens by anchoring on the frontmatter fence: `/^---`, `/^(---`. */
const FENCE_REGEX = /\/\^\(?---/;

describe("the frontmatter block is cut by frontmatter.ts alone", () => {
  it("no other module declares an expression that starts at the opening fence", () => {
    const offenders = sourceFiles(SRC)
      .filter((file) => !file.endsWith(join("lib", "frontmatter.ts")))
      .flatMap((file) =>
        readFileSync(file, "utf-8")
          .split("\n")
          .map((line, i) => ({ file: relative(process.cwd(), file), n: i + 1, line }))
          .filter(({ line }) => FENCE_REGEX.test(line))
          .map(({ file: f, n, line }) => `${f}:${n}: ${line.trim()}`)
      );
    expect(offenders).toEqual([]);
  });

  it("the guard sees the one expression it protects", () => {
    const own = readFileSync(join(SRC, "lib", "frontmatter.ts"), "utf-8");
    expect(own).toMatch(FENCE_REGEX);
  });

  it("the merge driver and the other readers import bodyOf or splitFrontmatter from it", () => {
    for (const file of ["merge-issue.ts", "exchanges.ts", "migrate.ts", "issue-ops.ts", "review.ts", "show.ts"]) {
      const text = readFileSync(join(SRC, "lib", file), "utf-8");
      expect(text, file).toMatch(/(bodyOf|splitFrontmatter)[\s\S]*from "\.\/frontmatter\.js"/);
    }
  });
});
