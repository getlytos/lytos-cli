/**
 * Refuse to write through a symbolic link (ISS-0158).
 *
 * `existsSync` follows links, so a dangling link reads as "no file here" and a
 * write to it creates the link's target — wherever on the disk that points. A
 * method file or a register must never be written that way: this names the
 * first link found between a target and the directory the CLI owns, so the
 * caller can skip the write and say why.
 *
 * A hard link is the same trap without a link to see (ISS-0191): the file has
 * another name somewhere, and writing it in place rewrites that one too.
 *
 * Zero dependencies.
 */

import { lstatSync, statSync } from "fs";
import { dirname, resolve } from "path";

/**
 * The first symbolic link on `path`, from the file itself up to — not
 * including — `root`; null when the path is plain. Path components that do not
 * exist yet are fine: they will be created as ordinary directories.
 */
export function symlinkOnPath(path: string, root: string): string | null {
  const stop = resolve(root);
  let current = resolve(path);
  while (current !== stop && current !== dirname(current)) {
    try {
      if (lstatSync(current).isSymbolicLink()) return current;
    } catch {
      // Not there yet: nothing to be a link.
    }
    current = dirname(current);
  }
  return null;
}

/** Does this existing file have another name, which a write would change too? */
export const hasOtherHardLinks = (path: string): boolean =>
  statSync(path).nlink > 1;
