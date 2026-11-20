/**
 * Unit tests for the optional design answer of `lyt init` (ISS-0158).
 *
 * The question is never a brake: no prompt without a terminal or in CI, a
 * default that generates nothing, and an unclear reply that asks once more and
 * then falls back to nothing. These pin each of those.
 */

import { describe, it, expect } from "vitest";
import {
  DESIGN_CHOICES,
  parseDesignOption,
  parseDesignAnswer,
  resolveDesign,
} from "../../src/lib/design.js";

describe("parseDesignOption (--design)", () => {
  it.each(DESIGN_CHOICES)("accepts %s", (choice) => {
    expect(parseDesignOption(choice)).toBe(choice);
  });

  it("is case- and whitespace-tolerant", () => {
    expect(parseDesignOption("  Claude-Design ")).toBe("claude-design");
  });

  it("refuses anything else and names the valid values", () => {
    expect(() => parseDesignOption("figma")).toThrow(/Unknown --design "figma".*claude-design, other, none/);
    expect(() => parseDesignOption("yes")).toThrow(/Unknown --design/);
  });
});

describe("parseDesignAnswer (the interactive reply)", () => {
  it.each([
    ["yes", "claude-design"],
    ["y", "claude-design"],
    ["Y", "claude-design"],
    ["YES", "claude-design"],
    ["oui", "claude-design"],
    ["no", "none"],
    ["n", "none"],
    ["non", "none"],
    ["other", "other"],
    ["other tool", "other"],
    ["Other Tool", "other"],
    ["autre", "other"],
    ["autre outil", "other"],
  ])("%j -> %s", (answer, expected) => {
    expect(parseDesignAnswer(answer)).toBe(expected);
  });

  it("treats Enter and a blank as no — the default generates nothing", () => {
    for (const answer of ["", "   ", "\n"]) {
      expect(parseDesignAnswer(answer), JSON.stringify(answer)).toBe("none");
    }
  });

  it("does not guess: a lone `o` is `other` to one reader and `oui` to another", () => {
    expect(parseDesignAnswer("o")).toBe("unclear");
    expect(parseDesignAnswer("O")).toBe("unclear");
  });

  it("calls anything else unclear rather than silently turning it into an answer", () => {
    for (const answer of ["maybe", "?", "12", "figma", "yes please", "nope"]) {
      expect(parseDesignAnswer(answer), JSON.stringify(answer)).toBe("unclear");
    }
  });
});

describe("resolveDesign", () => {
  const neverAsk = (): Promise<string> => {
    throw new Error("must not prompt");
  };
  /** A person who gives these replies, in order, and counts how often they were asked. */
  function replies(...answers: string[]): { ask: (retry: boolean) => Promise<string>; asked: boolean[] } {
    const asked: boolean[] = [];
    return {
      asked,
      ask: async (retry: boolean) => {
        asked.push(retry);
        return answers[asked.length - 1] ?? "";
      },
    };
  }

  it("uses the flag, and never prompts when it is given", async () => {
    expect(await resolveDesign({ flag: "claude-design", interactive: true, ask: neverAsk })).toBe("claude-design");
    expect(await resolveDesign({ flag: "other", interactive: false, ask: neverAsk })).toBe("other");
    expect(await resolveDesign({ flag: "none", interactive: true, ask: neverAsk })).toBe("none");
  });

  it("asks exactly once when interactive and the reply is clear, and maps it", async () => {
    for (const [reply, expected] of [["yes", "claude-design"], ["other tool", "other"], ["", "none"], ["no", "none"]] as const) {
      const person = replies(reply);
      expect(await resolveDesign({ interactive: true, ask: person.ask }), reply).toBe(expected);
      expect(person.asked, reply).toEqual([false]);
    }
  });

  it("defaults to none, with no prompt, when not interactive", async () => {
    expect(await resolveDesign({ interactive: false, ask: neverAsk })).toBe("none");
  });

  it("asks once more on an unclear reply, flagged as a retry, and takes the second answer", async () => {
    const person = replies("o", "yes");
    expect(await resolveDesign({ interactive: true, ask: person.ask })).toBe("claude-design");
    expect(person.asked).toEqual([false, true]);
  });

  it("falls back to none after two unclear replies — never a third question, never a file", async () => {
    const person = replies("o", "maybe");
    expect(await resolveDesign({ interactive: true, ask: person.ask })).toBe("none");
    expect(person.asked).toEqual([false, true]);
  });

  it("rejects an invalid flag rather than falling back", async () => {
    await expect(resolveDesign({ flag: "figma", interactive: false, ask: neverAsk })).rejects.toThrow(/Unknown --design/);
  });
});
