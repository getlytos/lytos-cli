/**
 * Journal de bord (ISS-0124) — the derived logbook.
 *
 * Between the changelog (the *what*) and the ADR (the *verdict*) sits a readable
 * narrative of the *why*. It is not written — it is DERIVED from closed issues
 * (like BOARD.md, ADR-0002): the why (issue context), the verdict (schema-v2
 * `review`), and a link back for detail. Cannot rot, zero write-ceremony.
 *
 * Three readers: the stakeholder (a human changelog), the newcomer (a
 * chronological story to ramp on), the learner (the why + companion material).
 *
 * Zero dependencies.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { parseFrontmatter, type FrontmatterValue } from "./frontmatter.js";

export interface JournalEntry {
  id: string;
  title: string;
  why: string;
  verdict: string;
  date: string;
  link: string;
}

export interface JournalGroup {
  key: string;
  entries: JournalEntry[];
}

function str(val: FrontmatterValue | undefined): string {
  return typeof val === "string" ? val : "";
}

const HEADING = /^#{1,6}\s+(.*)$/;
const CONTEXT_HEADING = /^context(e)?$/i;

/** One-sentence "why" — the first prose line of the Context section, else the first body line. */
function firstWhy(content: string): string {
  const lines = content.split(/\r?\n/);
  let inContext = false;
  let firstBody = "";
  let bodyStarted = false;
  for (const line of lines) {
    const h = line.match(HEADING);
    if (h) {
      inContext = CONTEXT_HEADING.test(h[1].trim());
      bodyStarted = true;
      continue;
    }
    const t = line.trim();
    if (!t || t.startsWith("---") || t.startsWith("- [")) continue;
    const clean = t.replace(/[*_`]/g, "");
    if (inContext) return clip(clean);
    if (bodyStarted && !firstBody) firstBody = clean;
  }
  return firstBody ? clip(firstBody) : "";
}

function clip(s: string): string {
  const sentence = s.split(/(?<=[.!?])\s/)[0];
  const one = sentence.length > 0 ? sentence : s;
  return one.length > 160 ? one.slice(0, 157).trimEnd() + "…" : one;
}

function collectClosed(lytosDir: string): { path: string; rel: string }[] {
  const boardDir = join(lytosDir, "issue-board");
  const out: { path: string; rel: string }[] = [];
  const push = (dir: string) => {
    const dirPath = join(boardDir, dir);
    if (!existsSync(dirPath)) return;
    for (const f of readdirSync(dirPath).filter((f) => f.startsWith("ISS-") && f.endsWith(".md"))) {
      out.push({ path: join(dirPath, f), rel: `issue-board/${dir}/${f}` });
    }
  };
  push("5-done");
  // archive/<quarter>/ISS-*.md
  const archive = join(boardDir, "archive");
  if (existsSync(archive)) {
    for (const q of readdirSync(archive)) {
      const qp = join(archive, q);
      try {
        if (statSync(qp).isDirectory()) push(join("archive", q));
      } catch { /* skip */ }
    }
  }
  return out;
}

/**
 * Build the journal: entries grouped (by `sprint` frontmatter if present, else by
 * YYYY-MM of completion), newest group first.
 */
export function buildJournal(lytosDir: string): JournalGroup[] {
  const byGroup = new Map<string, JournalEntry[]>();

  for (const { path, rel } of collectClosed(lytosDir)) {
    const content = readFileSync(path, "utf-8");
    const fm = parseFrontmatter(content);
    if (!fm) continue;
    const date = str(fm.completed_at) || str(fm.updated) || str(fm.created);
    const groupKey = str(fm.sprint) || (date ? date.slice(0, 7) : "undated");
    const entry: JournalEntry = {
      id: str(fm.id),
      title: str(fm.title),
      why: firstWhy(content),
      verdict: str(fm.review) || "—",
      date,
      link: rel,
    };
    const list = byGroup.get(groupKey) ?? [];
    list.push(entry);
    byGroup.set(groupKey, list);
  }

  const groups: JournalGroup[] = [...byGroup.entries()].map(([key, entries]) => ({
    key,
    entries: entries.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)),
  }));
  groups.sort((a, b) => b.key.localeCompare(a.key)); // newest first
  return groups;
}

/** Render the journal as a readable markdown logbook. */
export function renderJournal(groups: JournalGroup[]): string {
  const out: string[] = ["# Journal", ""];
  if (groups.length === 0) out.push("*(no closed issues yet)*");
  for (const g of groups) {
    out.push(`## ${g.key}`);
    out.push("");
    for (const e of g.entries) {
      const why = e.why ? ` — ${e.why}` : "";
      out.push(`- **${e.id}** ${e.title}${why} _(${e.verdict})_ · [detail](${e.link})`);
    }
    out.push("");
  }
  return out.join("\n") + "\n";
}
