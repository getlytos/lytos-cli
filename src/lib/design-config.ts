/**
 * The design answer, read back from `.lytos/config.yml` (ISS-0169).
 *
 * `init` writes `design:` and never reads it (`design.ts`). Two commands read
 * it, and only to decide whether the design exchanges apply to the project:
 * `lyt exchanges` lists them, and `lyt upgrade` adds their guide. A config that
 * is missing or cannot be read means a project that does not use them — the
 * answer is `none`, never an error, so that reading it can never be a brake.
 *
 * Zero dependencies.
 */

import { readFileSync } from "fs";
import { join } from "path";
import {
  DEFAULT_DESIGN,
  designFromConfig,
  type DesignChoice,
} from "./design.js";

/** The design answer recorded in `<lytosDir>/config.yml`; `none` when there is none to read. */
export function readDesign(lytosDir: string): DesignChoice {
  try {
    return designFromConfig(
      readFileSync(join(lytosDir, "config.yml"), "utf-8")
    );
  } catch {
    // No config.yml (or one that cannot be read) is the normal case for a
    // project that never answered: it uses no design exchanges.
    return DEFAULT_DESIGN;
  }
}
