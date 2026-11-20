/**
 * Unit tests for `canPrompt` (ISS-0158): ask only on a real terminal, outside CI.
 */

import { describe, it, expect } from "vitest";
import { canPrompt } from "../../src/lib/terminal.js";

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
