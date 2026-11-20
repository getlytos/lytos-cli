/**
 * Can this run ask a person a question? (ISS-0158)
 *
 * Shared by every command that may prompt (and `askConfirm`, the one yes/no
 * question `lyt upgrade` asks): only on a real terminal, outside CI.
 * Without one there is nobody to answer, and a prompt would hang or be skipped
 * silently — so the caller must pick a default and say so instead.
 *
 * Zero dependencies.
 */

import { createInterface } from "readline";

/**
 * Can this run ask a question? Only on a real terminal, outside CI. `CI` set to
 * an empty value, `false` or `0` does not count as CI.
 */
export function canPrompt(
  env: Record<string, string | undefined>,
  stdinIsTTY: boolean | undefined
): boolean {
  if (stdinIsTTY !== true) return false;
  const ci = (env.CI ?? "").trim().toLowerCase();
  return ci === "" || ci === "false" || ci === "0";
}

/** Ask a yes/no question on stderr; only `y` is a yes. Call it only when `canPrompt`. */
export async function askConfirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
}
