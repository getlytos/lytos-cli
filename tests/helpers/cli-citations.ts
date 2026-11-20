/**
 * Does a document cite only what the CLI has? (ISS-0168)
 *
 * A method document that tells an agent to run `lyt <verb> --flag` is a promise
 * about the CLI. When the CLI renames a command, drops a flag or adds a park
 * reason, the document must fail a test rather than mislead an agent. These
 * helpers read a markdown document and compare what it cites with the built CLI
 * (`dist/cli.js`), which is what a project actually runs.
 *
 * A command is cited in a code span (inline or fenced) as `lyt <verb>`, with or
 * without `npx`. A park reason is named after `--reason`, after the word `as`
 * (`park it as `gate-failed``), or in the first column of a table.
 *
 * Zero dependencies.
 */

import { execFileSync } from "child_process";
import { join } from "path";

const CLI = join(process.cwd(), "dist/cli.js");

/** What the built CLI prints for `args` on stdout (help goes to stdout). */
export function cliOutput(args: string[]): string {
  return execFileSync("node", [CLI, ...args], { encoding: "utf-8" });
}

/** The commands `lyt --help` lists. A hidden command is not listed, so it cannot be cited. */
export function cliCommands(): string[] {
  const lines = cliOutput(["--help"]).split("\n");
  const start = lines.indexOf("Commands:");
  const commands: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === "") break;
    const m = line.match(/^ {2}([a-z][a-z-]*)\b/);
    if (m) commands.push(m[1]);
  }
  return commands;
}

/** The code spans of a document: fenced lines as they are, inline spans without their backticks. */
export function codeSpans(doc: string): string[] {
  const spans: string[] = [];
  let fenced = false;
  for (const line of doc.split("\n")) {
    if (/^\s*```/.test(line)) {
      fenced = !fenced;
    } else if (fenced) {
      spans.push(line);
    } else {
      for (const m of line.matchAll(/`([^`]+)`/g)) spans.push(m[1]);
    }
  }
  return spans;
}

/** The document with its code spans removed: what a reader sees as prose. */
function prose(doc: string): string {
  return doc.replace(/^\s*```[\s\S]*?^\s*```/gm, "").replace(/`[^`]*`/g, "");
}

export interface Citation {
  verb: string;
  /** The `--flags` written after the verb, up to the next `lyt <verb>` in the same span. */
  flags: string[];
}

/** Every `lyt <verb> …` the document cites in a code span. */
export function citations(doc: string): Citation[] {
  const found: Citation[] = [];
  for (const span of codeSpans(doc)) {
    for (const m of span.matchAll(/\blyt ([a-z][a-z-]*)(.*?)(?=\blyt [a-z]|$)/g)) {
      found.push({ verb: m[1], flags: m[2].match(/--[a-z][a-z-]*/g) ?? [] });
    }
  }
  return found;
}

/** A `lyt <verb>` written as prose: it escapes the check, so a document must not have one. */
export function uncheckedCitations(doc: string): string[] {
  return [...prose(doc).matchAll(/\blyt [a-z][a-z-]*/g)].map((m) => m[0]);
}

/** What is wrong with the commands and flags a document cites; empty when it is clean. */
export function citationProblems(doc: string): string[] {
  const commands = new Set(cliCommands());
  const helps = new Map<string, string>();
  const problems: string[] = [];
  for (const { verb, flags } of citations(doc)) {
    if (!commands.has(verb)) {
      problems.push(`\`lyt ${verb}\` is not a command of the CLI`);
      continue;
    }
    if (!helps.has(verb)) helps.set(verb, cliOutput([verb, "--help"]));
    for (const flag of flags) {
      if (!new RegExp(`${flag}(?![a-z-])`).test(helps.get(verb)!)) {
        problems.push(`\`lyt ${verb}\` has no ${flag}`);
      }
    }
  }
  return problems;
}

/** Every park reason a document names, in the three places a reason may be named. */
export function reasonsNamed(doc: string): string[] {
  const named = new Set<string>();
  const patterns = [
    /--reason\s+([a-z][a-z-]*)/g,
    /\bas `([a-z][a-z-]*)`/g,
    /^\| `([a-z][a-z-]*)` \|/gm,
  ];
  for (const pattern of patterns) {
    for (const m of doc.matchAll(pattern)) named.add(m[1]);
  }
  return [...named];
}
