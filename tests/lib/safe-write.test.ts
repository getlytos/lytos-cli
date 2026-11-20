/**
 * Writing through a symbolic link (ISS-0158).
 *
 * `existsSync` follows links, so a dangling link looks like "no file here" and a
 * write to it creates the link's target — anywhere on the disk. A method file or
 * a register must never be written that way.
 */

import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { symlinkOnPath } from "../../src/lib/safe-write.js";

let base: string | null = null;
function setup(): { root: string; outside: string } {
  base = mkdtempSync(join(tmpdir(), "lytos-link-"));
  const root = join(base, ".lytos");
  const outside = join(base, "outside");
  mkdirSync(join(root, "quality"), { recursive: true });
  mkdirSync(outside, { recursive: true });
  return { root, outside };
}
afterEach(() => {
  if (base) rmSync(base, { recursive: true, force: true });
  base = null;
});

describe("symlinkOnPath", () => {
  it("is null for an ordinary path, existing or not", () => {
    const { root } = setup();
    writeFileSync(join(root, "quality", "kit.md"), "x");
    expect(symlinkOnPath(join(root, "quality", "kit.md"), root)).toBeNull();
    expect(symlinkOnPath(join(root, "quality", "rubrics", "ux.md"), root)).toBeNull();
  });

  it("names a file that is a symbolic link, dangling or not", () => {
    const { root, outside } = setup();
    const link = join(root, "quality", "ux.md");
    symlinkSync(join(outside, "target.md"), link); // dangling
    expect(symlinkOnPath(link, root)).toBe(link);
    writeFileSync(join(outside, "real.md"), "x");
    const link2 = join(root, "quality", "real.md");
    symlinkSync(join(outside, "real.md"), link2);
    expect(symlinkOnPath(link2, root)).toBe(link2);
  });

  it("names a directory on the path that is a symbolic link", () => {
    const { root, outside } = setup();
    const dir = join(root, "quality", "rubrics");
    symlinkSync(outside, dir);
    expect(symlinkOnPath(join(dir, "ux.md"), root)).toBe(dir);
    expect(symlinkOnPath(join(dir, "deeper", "ux.md"), root)).toBe(dir);
  });

  it("does not look above the root: a root that is itself reached through a link is the user's choice", () => {
    const { root, outside } = setup();
    const alias = join(base!, "alias");
    symlinkSync(root, alias);
    expect(symlinkOnPath(join(alias, "quality", "ux.md"), alias)).toBeNull();
    expect(outside).toBeTruthy();
  });
});
