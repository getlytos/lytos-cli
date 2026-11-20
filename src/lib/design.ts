/**
 * The optional design answer of `lyt init` (ISS-0158).
 *
 * `lyt init` may ask one question — "Do you use Claude Design for design?" — and
 * records the answer in `.lytos/config.yml` as `design:`. Only `claude-design`
 * makes the scaffold write anything (the register and the exchanges guide), and
 * only `lyt exchanges` reads the key back (ISS-0169): this must never be a
 * brake. A project that does not use Claude Design is not asked when it cannot
 * answer (no terminal, CI, `--yes`), gets no file, no warning and no gate, and
 * the one command that reads the key says that exchanges are not in use and
 * changes nothing.
 *
 * Everything here is pure except the injected `ask`, so the behaviour is
 * testable without a terminal. Reading the file is left to the caller:
 * `designFromConfig` takes its text. `init` itself never reads the key back, so
 * a re-init asks or defaults again rather than carrying a record.
 *
 * Zero dependencies.
 */

import { parseConfig, type ConfigNode } from "./config.js";

export const DESIGN_CHOICES = ["claude-design", "other", "none"] as const;
export type DesignChoice = (typeof DESIGN_CHOICES)[number];

/** What a project gets when nobody says anything: nothing. */
export const DEFAULT_DESIGN: DesignChoice = "none";

/** Parse the `--design` value. Throws with the valid values on anything else. */
export function parseDesignOption(raw: string): DesignChoice {
  const value = raw.trim().toLowerCase();
  if ((DESIGN_CHOICES as readonly string[]).includes(value)) {
    return value as DesignChoice;
  }
  throw new Error(
    `Unknown --design "${raw.trim()}". Valid values: ${DESIGN_CHOICES.join(", ")}.`
  );
}

/** What an interactive reply means. `unclear` is not a choice: it asks again. */
export type DesignAnswer = DesignChoice | "unclear";

/**
 * Map the interactive reply: yes → claude-design, no or Enter → none, other
 * (tool) → other. Anything else is `unclear`, and so is a lone `o`: it is
 * `other` to one reader and `oui` to another, and guessing would either create
 * a file nobody asked for or drop an answer somebody gave.
 */
export function parseDesignAnswer(answer: string): DesignAnswer {
  const value = answer.trim().toLowerCase();
  if (value === "") return "none";
  if (/^(n|no|non)$/.test(value)) return "none";
  if (/^(y|yes|oui)$/.test(value)) return "claude-design";
  if (/^(other|other tool|autre|autre outil)$/.test(value)) return "other";
  return "unclear";
}

export interface ResolveDesignInput {
  /** The raw `--design` value, when given. */
  flag?: string;
  /** True only when this run may ask (a terminal, outside CI, no `--yes`). */
  interactive: boolean;
  /** Ask the one question and return the raw reply; `retry` is true the second time. */
  ask: (retry: boolean) => Promise<string>;
}

/**
 * Decide the design answer: the flag, else the person's reply (interactive
 * only), else `none`.
 *
 * An unclear reply is asked once more, then falls back to `none` — never a third
 * question, never a guess.
 */
export async function resolveDesign(
  input: ResolveDesignInput
): Promise<DesignChoice> {
  if (input.flag !== undefined && input.flag !== "") {
    return parseDesignOption(input.flag);
  }
  if (!input.interactive) return DEFAULT_DESIGN;
  for (const retry of [false, true]) {
    const answer = parseDesignAnswer(await input.ask(retry));
    if (answer !== "unclear") return answer;
  }
  return DEFAULT_DESIGN;
}

/**
 * The design choice a `design:` value of `.lytos/config.yml` stands for: one of
 * the known choices (any case), else `none`. Anything that is not a plain word
 * — a list, a section, an empty value, an unknown name — is `none`, never an
 * error.
 */
export function designOf(value: ConfigNode | undefined): DesignChoice {
  const word = typeof value === "string" ? value.trim().toLowerCase() : "";
  return (DESIGN_CHOICES as readonly string[]).includes(word)
    ? (word as DesignChoice)
    : DEFAULT_DESIGN;
}

/**
 * What the text of `.lytos/config.yml` says about design: the value of a
 * top-level `design:` key, or `none` when the key is absent, empty or not one of
 * the known choices. Never throws: a config this function cannot read is a
 * project that does not use design exchanges, not a broken one. The text is
 * read by `config.ts`, the one reader of the file (ISS-0176).
 */
export function designFromConfig(text: string): DesignChoice {
  return designOf(parseConfig(text).data.design);
}
