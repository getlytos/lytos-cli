/**
 * Does a shipped file carry anything that belongs to the machine, the person or
 * the project that wrote it? (ISS-0155)
 *
 * This repository is PUBLIC. A list of forbidden names written here would itself
 * be the leak, so this check holds no name. It has two parts:
 *
 * Always checked, by shape — nothing to configure:
 *   - a machine-absolute path (`/Users/<name>`, `/home/<name>`, `C:\Users\…`);
 *   - an email address (the reserved `example.*` domains are allowed);
 *   - a credential-looking assignment (`token: <20+ characters>`);
 *   - a private URL (localhost, a private range, `.internal` / `.local` / `.lan`,
 *     a shared design artifact or chat).
 *
 * Checked only if you provide them — private terms: the names of clients and
 * projects that must never appear here. They live outside the repository:
 *   - the environment variable `LYTOS_PRIVATE_TERMS`, comma separated; or
 *   - the file `.lytos/private-terms.local`, one term per line, `#` for comments.
 *     It is listed in `.gitignore`: never commit it.
 * If neither exists there is nothing to search for and this part passes. A
 * finding names the category, never the term.
 *
 * Zero dependencies.
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";

const SHAPES: Array<[string, RegExp]> = [
  [
    "a machine-absolute path",
    /\/Users\/[^\s/]+|\/home\/[^\s/]+|\b[A-Za-z]:\\(?:Users|Documents and Settings)\\/,
  ],
  [
    "an email address",
    /\b[\w.+-]+@(?!example\.(?:com|org|net|invalid)\b)[\w-]+(?:\.[\w-]+)+/i,
  ],
  [
    "a credential",
    /\b(?:api[_-]?key|secret|token|password)\b\s*[:=]\s*["']?[A-Za-z0-9_+/=-]{20,}/i,
  ],
  [
    "a private URL",
    /https?:\/\/(?:localhost|127\.|10\.|192\.168\.|[^\s/]*\.(?:internal|local|lan)\b)|claude\.ai\/(?:artifact|chat|project)/i,
  ],
];

/** The private terms provided locally (variable first, then the git-ignored file). */
export function privateTerms(
  root: string = process.cwd(),
  env: Record<string, string | undefined> = process.env
): string[] {
  const terms = (env.LYTOS_PRIVATE_TERMS ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  const file = join(root, ".lytos", "private-terms.local");
  if (existsSync(file)) {
    for (const line of readFileSync(file, "utf-8").split(/\r?\n/)) {
      const term = line.trim();
      if (term && !term.startsWith("#")) terms.push(term);
    }
  }
  return terms;
}

/** What is wrong with `text`, one message per finding — empty when it is clean. */
export function leaksIn(
  text: string,
  root: string = process.cwd(),
  env: Record<string, string | undefined> = process.env
): string[] {
  const found: string[] = [];
  for (const [label, pattern] of SHAPES) {
    if (pattern.test(text)) found.push(`contains ${label}`);
  }
  const lower = text.toLowerCase();
  for (const term of privateTerms(root, env)) {
    if (lower.includes(term.toLowerCase())) found.push("contains a private term");
  }
  return found;
}
