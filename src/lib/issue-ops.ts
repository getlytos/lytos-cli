/**
 * Issue operations — move, update frontmatter, and regenerate board.
 *
 * Shared logic for lyt start and lyt close commands.
 * Zero dependencies beyond Node.js stdlib.
 */

import { existsSync, readFileSync, writeFileSync, renameSync, readdirSync } from "fs";
import { join } from "path";
import { execFileSync } from "child_process";
import { parseFrontmatter, serializeFrontmatter } from "./frontmatter.js";
import { collectIssues, generateBoardMarkdown } from "./board-generator.js";

const STATUS_DIRS = [
  "0-icebox", "1-backlog", "2-sprint",
  "3-in-progress", "4-review", "5-done",
];

export interface IssueLocation {
  filePath: string;
  fileName: string;
  dir: string;
  content: string;
  frontmatter: Record<string, string | string[]>;
}

/**
 * Find an issue by ID across all status directories.
 */
export function locateIssue(lytosDir: string, issueId: string): IssueLocation | null {
  const boardDir = join(lytosDir, "issue-board");
  if (!existsSync(boardDir)) return null;

  const normalizedId = issueId.toUpperCase();

  for (const dir of STATUS_DIRS) {
    const dirPath = join(boardDir, dir);
    if (!existsSync(dirPath)) continue;

    const files = readdirSync(dirPath).filter(
      (f) => f.endsWith(".md") && f.toUpperCase().startsWith(normalizedId)
    );

    if (files.length > 0) {
      const filePath = join(dirPath, files[0]);
      const content = readFileSync(filePath, "utf-8");
      const frontmatter = parseFrontmatter(content);
      if (!frontmatter) return null;

      return {
        filePath,
        fileName: files[0],
        dir,
        content,
        frontmatter,
      };
    }
  }

  return null;
}

/**
 * Move an issue file to a new status directory and update its frontmatter.
 */
export function moveIssue(
  lytosDir: string,
  issue: IssueLocation,
  targetDir: string,
  extraFields?: Record<string, string>
): string {
  const boardDir = join(lytosDir, "issue-board");
  const targetPath = join(boardDir, targetDir, issue.fileName);

  // Update frontmatter
  const updatedFm: Record<string, string | string[]> = { ...issue.frontmatter, status: targetDir };
  if (extraFields) {
    for (const [key, value] of Object.entries(extraFields)) {
      updatedFm[key] = value;
    }
  }

  // Rebuild file content with updated frontmatter
  const fmStr = serializeFrontmatter(updatedFm);
  const bodyMatch = issue.content.match(/^---[\s\S]*?---\s*\n([\s\S]*)$/);
  const body = bodyMatch ? bodyMatch[1] : "";
  const newContent = fmStr + "\n" + body;

  // Write updated content then move
  writeFileSync(issue.filePath, newContent);
  renameSync(issue.filePath, targetPath);

  return targetPath;
}

/**
 * Regenerate BOARD.md from current issue files.
 */
export function regenerateBoard(lytosDir: string): void {
  const boardDir = join(lytosDir, "issue-board");
  const issues = collectIssues(boardDir);
  const markdown = generateBoardMarkdown(issues);
  writeFileSync(join(boardDir, "BOARD.md"), markdown);
}

/**
 * Validate a branch name — reject shell metacharacters.
 * Only allows: a-z, A-Z, 0-9, hyphens, underscores, slashes, dots.
 */
export function isValidBranchName(name: string): boolean {
  return /^[a-zA-Z0-9/_.\-]+$/.test(name) && name.length > 0 && name.length <= 200;
}

/**
 * Create a git branch if it doesn't already exist.
 * Returns "created", "switched", "invalid", or "error".
 * Uses execFileSync (no shell) to prevent command injection.
 */
export function ensureBranch(branchName: string): "created" | "switched" | "invalid" | "error" {
  if (!isValidBranchName(branchName)) {
    return "invalid";
  }

  try {
    // Check if branch exists (no shell — safe)
    const branches = execFileSync("git", ["branch", "--list"], { encoding: "utf-8" });
    const exists = branches.split("\n").some(
      (b) => b.trim().replace("* ", "") === branchName
    );

    if (exists) {
      execFileSync("git", ["checkout", branchName], { stdio: "pipe" });
      return "switched";
    }

    execFileSync("git", ["checkout", "-b", branchName], { stdio: "pipe" });
    return "created";
  } catch {
    return "error";
  }
}

/**
 * Get today's date as YYYY-MM-DD.
 */
export function today(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

/**
 * Count checklist items in markdown content.
 */
export function countChecklist(content: string): { done: number; total: number } {
  const pattern = /^[ \t]*- \[([ xX])\] /gm;
  let done = 0;
  let total = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    total++;
    if (match[1] !== " ") done++;
  }

  return { done, total };
}
