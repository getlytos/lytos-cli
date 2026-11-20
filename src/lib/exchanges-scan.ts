/**
 * Read the design exchange entries from disk and derive the index (ISS-0169).
 *
 * Read-only: it lists and reads, never writes, and never reads through a symbolic
 * link (a link could point outside the project). The format and the rules about
 * what makes an entry valid are in `exchanges.ts`; this file only walks
 * `.lytos/design/exchanges/<epic>/` and files each entry as open, resolved, a
 * duplicate or a problem.
 *
 * Zero dependencies.
 */

import { existsSync, readdirSync, readFileSync } from "fs";
import type { Dirent } from "fs";
import { dirname, join, relative, sep } from "path";
import {
  EXCHANGES_DIR,
  parseEntry,
  type ExchangeScan,
  type ParsedEntry,
} from "./exchanges.js";
import { symlinkOnPath } from "./safe-write.js";

const EPIC_DIR = /^ISS-\d+$/;

interface ScanContext {
  lytosDir: string;
  scan: ExchangeScan;
  /** id -> file of the first entry that claimed it. */
  seen: Map<string, string>;
}

/** A path relative to the project root, with forward slashes. */
function projectPath(lytosDir: string, absolute: string): string {
  return relative(dirname(lytosDir), absolute).split(sep).join("/");
}

function sortedEntries(dir: string): Dirent[] {
  return readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0
  );
}

function report(scan: ExchangeScan, file: string, messages: string[]): void {
  for (const message of messages) scan.problems.push({ file, message });
}

/** File one parsed entry: open, resolved, or a duplicate of an earlier id. */
function record(ctx: ScanContext, file: string, parsed: ParsedEntry): void {
  report(ctx.scan, file, parsed.problems);
  const entry = parsed.entry;
  if (!entry) return;
  const first = ctx.seen.get(entry.id);
  if (first !== undefined) {
    report(ctx.scan, file, [`has the same id as ${first}`]);
    return;
  }
  ctx.seen.set(entry.id, file);
  if (entry.status === "open") ctx.scan.open.push({ ...entry, file });
  else ctx.scan.resolved++;
}

function scanEpic(ctx: ScanContext, epicPath: string, epicDir: string): void {
  for (const file of sortedEntries(epicPath)) {
    if (!file.name.endsWith(".md")) continue;
    const path = join(epicPath, file.name);
    const shown = projectPath(ctx.lytosDir, path);
    if (file.isSymbolicLink()) {
      report(ctx.scan, shown, ["is a symbolic link: it is not read"]);
    } else if (file.isFile()) {
      record(
        ctx,
        shown,
        parseEntry(readFileSync(path, "utf-8"), epicDir, file.name)
      );
    }
  }
}

/**
 * Read every entry under `.lytos/design/exchanges/` and derive the index.
 * Read-only. A project with no such folder gets an empty scan, not an error.
 */
export function scanExchanges(lytosDir: string): ExchangeScan {
  const scan: ExchangeScan = { open: [], resolved: 0, problems: [] };
  const root = join(lytosDir, EXCHANGES_DIR);
  // Checked before existsSync, which follows a link and calls a dangling one absent.
  const link = symlinkOnPath(root, lytosDir);
  if (link) {
    report(scan, projectPath(lytosDir, link), [
      "is a symbolic link: it is not read",
    ]);
    return scan;
  }
  if (!existsSync(root)) return scan;
  const ctx: ScanContext = { lytosDir, scan, seen: new Map() };
  for (const dir of sortedEntries(root)) {
    const path = join(root, dir.name);
    const shown = projectPath(lytosDir, path);
    if (dir.isSymbolicLink()) {
      report(scan, shown, ["is a symbolic link: it is not read"]);
    } else if (dir.isDirectory() && !EPIC_DIR.test(dir.name)) {
      report(scan, shown, [
        `folder name "${dir.name}" is not an epic card id (for example ISS-0163)`,
      ]);
    } else if (dir.isDirectory()) {
      scanEpic(ctx, path, dir.name);
    }
  }
  scan.open.sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));
  return scan;
}
