/**
 * Can this run ask a person a question? (ISS-0158)
 *
 * Shared by every command that may prompt: only on a real terminal, outside CI.
 * Without one there is nobody to answer, and a prompt would hang or be skipped
 * silently — so the caller must pick a default and say so instead.
 *
 * Zero dependencies.
 */

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
