/**
 * Read a file that a project may have replaced with anything (ISS-0191).
 *
 * `existsSync` says yes to a directory, and reading one throws. For a caller
 * that only asks what a file says, "not a readable file" means nothing to read.
 *
 * Zero dependencies.
 */

import { readFileSync, statSync } from "fs";

/** The content of a file, or null when it is absent, unreadable or not a file. */
export function readIfFile(path: string): string | null {
  try {
    return statSync(path).isFile() ? readFileSync(path, "utf-8") : null;
  } catch {
    return null;
  }
}
