/**
 * Unit tests for `canPrompt` (ISS-0158): ask only on a real terminal, outside CI.
 */

import { readFileSync } from "fs";
import { describe, it, expect, vi, afterEach } from "vitest";
import { canPrompt, askConfirm } from "../../src/lib/terminal.js";

describe("canPrompt", () => {
  it("is true only on a terminal, outside CI", () => {
    expect(canPrompt({}, true)).toBe(true);
    expect(canPrompt({}, false)).toBe(false);
    expect(canPrompt({}, undefined)).toBe(false);
  });

  it.each(["1", "true", "yes", "anything"])("is false when CI=%s", (ci) => {
    expect(canPrompt({ CI: ci }, true)).toBe(false);
  });

  it("is not fooled by CI set to an empty or false value", () => {
    expect(canPrompt({ CI: "" }, true)).toBe(true);
    expect(canPrompt({ CI: "false" }, true)).toBe(true);
    expect(canPrompt({ CI: "0" }, true)).toBe(true);
  });
});

/**
 * ISS-0174. `readline` owns the prompt line: when it is created it moves the
 * cursor to column 1 and clears the line, so any text written to the terminal
 * BEFORE `rl.question("")` is erased and the user sees a command that seems to
 * hang. The question text must therefore be handed to `askConfirm`, never
 * written separately.
 */
describe("askConfirm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.doUnmock("readline");
  });

  it("hands the question text to readline, so readline draws it", async () => {
    const question = vi.fn((_q: string, cb: (a: string) => void) => cb("y"));
    const close = vi.fn();
    vi.resetModules();
    vi.doMock("readline", () => ({ createInterface: () => ({ question, close }) }));
    const { askConfirm: ask } = await import("../../src/lib/terminal.js");
    await expect(ask("  ~ file differs: update? [y/N] ")).resolves.toBe(true);
    expect(question).toHaveBeenCalledWith("  ~ file differs: update? [y/N] ", expect.any(Function));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("only a lowercase or uppercase y is a yes", async () => {
    for (const [answer, expected] of [["y", true], ["Y", true], ["yes", false], ["n", false], ["", false]] as const) {
      const question = vi.fn((_q: string, cb: (a: string) => void) => cb(answer));
      vi.resetModules();
      vi.doMock("readline", () => ({ createInterface: () => ({ question, close: vi.fn() }) }));
      const { askConfirm: ask } = await import("../../src/lib/terminal.js");
      await expect(ask("Q? ")).resolves.toBe(expected);
    }
  });

  it("no command writes a question and then calls askConfirm with an empty prompt", () => {
    for (const file of ["src/commands/upgrade.ts", "src/commands/init.ts"]) {
      const source = readFileSync(file, "utf-8");
      expect(source, `${file} must not call askConfirm("")`).not.toMatch(/askConfirm\(\s*(""|'')\s*\)/);
    }
  });
});
