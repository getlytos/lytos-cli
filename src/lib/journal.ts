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
// `\b`, not `$`: fiches title their section `## Context — why this exists`, and an
// exact match sent every one of them to the fallback paragraph.
const CONTEXT_HEADING = /^context(e)?\b/i;

/**
 * One-sentence "why" — the first prose **paragraph** of the Context section, else
 * the first body paragraph, clipped to its first sentence.
 *
 * Paragraph, not line (ISS-0124 audit, 2026-08-12): fiches are hard-wrapped around
 * 90 columns, so reading a single physical line cut every journal entry at the wrap,
 * mid-sentence. `clip` never saw a sentence boundary to cut on.
 */
function firstWhy(content: string): string {
  const paragraphs: { inContext: boolean; text: string }[] = [];
  let inContext = false;
  let bodyStarted = false;
  let current: string[] = [];

  const flush = () => {
    if (current.length > 0 && bodyStarted) {
      paragraphs.push({ inContext, text: current.join(" ") });
    }
    current = [];
  };

  for (const line of content.split(/\r?\n/)) {
    const heading = line.match(HEADING);
    if (heading) {
      flush();
      inContext = CONTEXT_HEADING.test(heading[1].trim());
      bodyStarted = true;
      continue;
    }
    const t = line.trim();
    // Blank line, frontmatter fence or checklist item — all end a prose paragraph.
    if (!t || t.startsWith("---") || t.startsWith("- [")) {
      flush();
      continue;
    }
    current.push(t.replace(/[*_`]/g, ""));
  }
  flush();

  const context = paragraphs.find((p) => p.inContext);
  return clip((context ?? paragraphs[0])?.text ?? "");
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
    for (const f of readdirSync(dirPath).filter(
      (f) => f.startsWith("ISS-") && f.endsWith(".md")
    )) {
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
      } catch {
        /* skip */
      }
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

  const groups: JournalGroup[] = [...byGroup.entries()].map(
    ([key, entries]) => ({
      key,
      entries: entries.sort(
        (a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)
      ),
    })
  );
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
      out.push(
        `- **${e.id}** ${e.title}${why} _(${e.verdict})_ · [detail](${e.link})`
      );
    }
    out.push("");
  }
  return out.join("\n") + "\n";
}
