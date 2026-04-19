/**
 * Multi-repo board overview — scans sibling directories for .lytos/issue-board/
 * and displays a consolidated summary across projects.
 */

import { existsSync, readdirSync, statSync } from "fs";
import { basename, dirname, join, resolve } from "path";
import { collectIssues, countArchived } from "./board-generator.js";

const noColor =
  process.env.NO_COLOR !== undefined ||
  process.argv.includes("--no-color");

function c(code: string, text: string): string {
  if (noColor) return text;
  return `\x1b[${code}m${text}\x1b[0m`;
}

const bold = (t: string) => c("1", t);
const dim = (t: string) => c("2", t);
const green = (t: string) => c("32", t);
const yellow = (t: string) => c("33", t);
const magenta = (t: string) => c("35", t);
const cyan = (t: string) => c("36", t);
const boldCyan = (t: string) => c("1;36", t);

export interface RepoSummary {
  name: string;
  path: string;
  counts: Record<string, number>;
  total: number;
  archived: number;
}

/**
 * Discover Lytos repos among candidate directories.
 * A directory qualifies if it contains `.lytos/issue-board/`.
 */
export function discoverRepos(candidates: string[]): RepoSummary[] {
  const repos: RepoSummary[] = [];

  for (const dir of candidates) {
    const abs = resolve(dir);
    if (!existsSync(abs)) continue;
    try {
      if (!statSync(abs).isDirectory()) continue;
    } catch {
      continue;
    }

    const boardDir = join(abs, ".lytos", "issue-board");
    const name = basename(abs);

    if (!existsSync(boardDir)) {
      continue;
    }

    const data = collectIssues(boardDir);
    const archived = countArchived(boardDir);

    const counts: Record<string, number> = {
      "0-icebox": 0,
      "1-backlog": 0,
      "2-sprint": 0,
      "3-in-progress": 0,
      "4-review": 0,
    };
    for (const issue of data.issues) {
      if (issue.status in counts) counts[issue.status]++;
    }

    repos.push({
      name,
      path: abs,
      counts,
      total: data.issues.length + archived,
      archived,
    });
  }

  return repos.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * List sibling directories of the given path.
 */
export function listSiblings(cwd: string): string[] {
  const parent = dirname(resolve(cwd));
  try {
    return readdirSync(parent)
      .map((name) => join(parent, name))
      .filter((p) => {
        try {
          return statSync(p).isDirectory();
        } catch {
          return false;
        }
      });
  } catch {
    return [];
  }
}

function progressBar(repo: RepoSummary, width = 12): string {
  if (repo.total === 0) {
    return dim("░".repeat(width));
  }
  const done = repo.archived;
  const filled = Math.round((done / repo.total) * width);
  const empty = width - filled;
  return green("█".repeat(filled)) + dim("░".repeat(empty));
}

function summaryLine(repo: RepoSummary): string {
  const parts: string[] = [];
  const backlog = repo.counts["1-backlog"];
  const sprint = repo.counts["2-sprint"];
  const wip = repo.counts["3-in-progress"];
  const review = repo.counts["4-review"];

  if (backlog) parts.push(`${backlog} backlog`);
  if (sprint) parts.push(`${cyan(String(sprint))} sprint`);
  if (wip) parts.push(`${yellow(String(wip))} wip`);
  if (review) parts.push(`${magenta(String(review))} review`);
  if (repo.archived) parts.push(`${green(String(repo.archived))} done ${green("✓")}`);

  if (parts.length === 0) return dim("empty");
  return parts.join(dim(" · "));
}

/**
 * Render the multi-repo overview.
 */
export function displayOverview(repos: RepoSummary[]): void {
  const innerWidth = 52;

  console.log("");
  console.log(`  ${boldCyan("╔")}${boldCyan("═".repeat(innerWidth))}${boldCyan("╗")}`);
  const title = "LYTOS OVERVIEW";
  const padding = innerWidth - (2 + title.length);
  console.log(`  ${boldCyan("║")}  ${bold(title)}${" ".repeat(padding)}${boldCyan("║")}`);
  console.log(`  ${boldCyan("╚")}${boldCyan("═".repeat(innerWidth))}${boldCyan("╝")}`);
  console.log("");

  if (repos.length === 0) {
    console.log(`  ${dim("No Lytos projects found.")}`);
    console.log("");
    return;
  }

  // Column widths
  const maxName = Math.max(...repos.map((r) => r.name.length), 10);

  for (const repo of repos) {
    const name = repo.name.padEnd(maxName);
    const bar = progressBar(repo);
    const summary = summaryLine(repo);
    console.log(`  ${bold(name)}  ${bar}  ${summary}`);
  }

  console.log("");
  console.log(`  ${dim("─".repeat(innerWidth))}`);

  const totals = {
    backlog: repos.reduce((s, r) => s + (r.counts["1-backlog"] || 0), 0),
    sprint: repos.reduce((s, r) => s + (r.counts["2-sprint"] || 0), 0),
    wip: repos.reduce((s, r) => s + (r.counts["3-in-progress"] || 0), 0),
    review: repos.reduce((s, r) => s + (r.counts["4-review"] || 0), 0),
    done: repos.reduce((s, r) => s + r.archived, 0),
  };

  const parts = [`${bold(String(repos.length))} projects`];
  if (totals.backlog) parts.push(`${totals.backlog} backlog`);
  if (totals.sprint) parts.push(`${cyan(String(totals.sprint))} sprint`);
  if (totals.wip) parts.push(`${yellow(String(totals.wip))} wip`);
  if (totals.review) parts.push(`${magenta(String(totals.review))} review`);
  if (totals.done) parts.push(`${green(String(totals.done))} done ${green("✓")}`);

  console.log(`  ${parts.join(dim(" · "))}`);
  console.log("");
}
