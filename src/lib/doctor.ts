/**
 * Doctor — deep diagnostic for .lytos/ health.
 *
 * Goes beyond lint (structure validation) to check:
 * - Broken internal links (file references that don't exist)
 * - Stale memory (cortex files not updated recently)
 * - Issues referencing non-existent skills
 * - Overall health score (0-100%)
 *
 * Zero dependencies.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { parseFrontmatter } from "./frontmatter.js";
import {
  checkMergeDriver,
  GITATTRIBUTES_LINE,
  MERGE_DRIVER_COMMAND,
  MERGE_DRIVER_NAME,
} from "./merge-driver.js";
import {
  loadKit,
  validateKit,
  baselineViolations,
  unresolvedGateRefs,
  validateStack,
  unlistedDependencies,
} from "./quality.js";

export type DiagnosticSeverity = "error" | "warning" | "info";

export interface DiagnosticFinding {
  severity: DiagnosticSeverity;
  category: string;
  file: string;
  message: string;
  fix: string;
}

export interface DiagnosticResult {
  findings: DiagnosticFinding[];
  filesChecked: number;
  errors: number;
  warnings: number;
  infos: number;
  score: number;
}

const STALE_DAYS = 90;

/**
 * Run all doctor checks on a .lytos/ directory.
 */
export function diagnose(lytosDir: string): DiagnosticResult {
  const findings: DiagnosticFinding[] = [];
  let filesChecked = 0;

  // 1. Broken internal links
  const linkResults = checkBrokenLinks(lytosDir);
  findings.push(...linkResults.findings);
  filesChecked += linkResults.filesChecked;

  // 2. Stale memory
  const memoryResults = checkStaleMemory(lytosDir);
  findings.push(...memoryResults.findings);
  filesChecked += memoryResults.filesChecked;

  // 3. Issues referencing non-existent skills
  const skillResults = checkMissingSkills(lytosDir);
  findings.push(...skillResults.findings);
  filesChecked += skillResults.filesChecked;

  // 4. Frontmatter status / folder mismatch (deeper than lint)
  const statusResults = checkStatusMismatches(lytosDir);
  findings.push(...statusResults.findings);
  filesChecked += statusResults.filesChecked;

  // 5. Orphan dependencies (depends on issues that don't exist)
  const depResults = checkOrphanDependencies(lytosDir);
  findings.push(...depResults.findings);
  filesChecked += depResults.filesChecked;

  // 6. Frontmatter schema v1 detection (info-level, doesn't reduce score)
  const schemaResults = checkSchemaVersion(lytosDir);
  findings.push(...schemaResults.findings);

  // 7. lytos-issue merge driver (.gitattributes + git config) — ISS-0093
  findings.push(...checkMergeDriverInstall(lytosDir));

  // 8. Rules from a generation that predates "The CLI Is the Interface" — ISS-0097
  findings.push(...checkCliInterfaceSection(lytosDir));

  // 9. Quality kit presence + coherence (ADR-0005/0007, ISS-0107)
  findings.push(...checkQualityKit(lytosDir));

  const errors = findings.filter((f) => f.severity === "error").length;
  const warnings = findings.filter((f) => f.severity === "warning").length;
  const infos = findings.filter((f) => f.severity === "info").length;

  const score = computeScore(findings, filesChecked);

  return { findings, filesChecked, errors, warnings, infos, score };
}

/**
 * Check all markdown files for internal links pointing to non-existent files.
 */
/**
 * A markdown file's prose, with code removed.
 *
 * A fiche is prose *containing* code: it quotes syntax, shows bad paths, explains
 * what a link looks like. A checker that reads the raw text treats those examples
 * as data — and writing *about* a broken link then creates one. That happened on
 * ISS-0124's own delivery note, whose example of a dead link was reported as a
 * dead link (ISS-0145).
 *
 * The same narrowing already had to be made twice elsewhere: `ready.ts` scopes to
 * the `## Ready` section because a stray "out of scope" in a note used to satisfy
 * the criterion, and `pinnedGateRefs()` scopes to the Definition of Done because
 * quoting a pin in an audit response counted as writing one.
 */
function withoutCode(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/~~~[\s\S]*?~~~/g, "")
    .replace(/``[^`]*``/g, "")
    .replace(/`[^`\n]*`/g, "");
}

function checkBrokenLinks(lytosDir: string): {
  findings: DiagnosticFinding[];
  filesChecked: number;
} {
  const findings: DiagnosticFinding[] = [];
  let filesChecked = 0;

  const mdFiles = collectMarkdownFiles(lytosDir).filter(
    (f) => !f.includes("/templates/")
  );
  // Match markdown links: [text](path) — skip http/https/mailto links and placeholders
  const linkPattern = /\[([^\]]*)\]\((?!https?:\/\/|mailto:)([^)]+)\)/g;

  for (const filePath of mdFiles) {
    const content = withoutCode(readFileSync(filePath, "utf-8"));
    const relFile = relative(lytosDir, filePath);
    filesChecked++;

    let match: RegExpExecArray | null;
    while ((match = linkPattern.exec(content)) !== null) {
      const linkTarget = match[2].split("#")[0]; // strip anchors
      if (!linkTarget) continue;

      // Resolve file-relative first, then fall back to repo-root-relative
      // (the parent of .lytos/). Issue specs naturally reference project
      // source like `src/commands/board.ts` from the repo root — that is also
      // how GitHub renders the link. Only report broken if both attempts fail.
      const fileDir = filePath.replace(/\/[^/]+$/, "");
      const projectRoot = join(lytosDir, "..");
      const fileRelative = join(fileDir, linkTarget);
      const repoRelative = join(projectRoot, linkTarget);

      if (!existsSync(fileRelative) && !existsSync(repoRelative)) {
        findings.push({
          severity: "error",
          category: "broken-link",
          file: relFile,
          message: `Broken link: [${match[1]}](${match[2]}) → file not found`,
          fix: `Fix the path or remove the link in ${relFile}`,
        });
      }
    }
  }

  return { findings, filesChecked };
}

/**
 * Check memory/cortex/ for stale files (not modified in STALE_DAYS days).
 */
function checkStaleMemory(lytosDir: string): {
  findings: DiagnosticFinding[];
  filesChecked: number;
} {
  const findings: DiagnosticFinding[] = [];
  let filesChecked = 0;

  const cortexDir = join(lytosDir, "memory", "cortex");
  if (!existsSync(cortexDir)) return { findings, filesChecked };

  const now = Date.now();
  const staleThreshold = STALE_DAYS * 24 * 60 * 60 * 1000;

  const files = readdirSync(cortexDir).filter((f) => f.endsWith(".md"));

  for (const file of files) {
    const filePath = join(cortexDir, file);
    const stat = statSync(filePath);
    filesChecked++;

    const ageMs = now - stat.mtimeMs;
    const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));

    if (ageMs > staleThreshold) {
      findings.push({
        severity: "warning",
        category: "stale-memory",
        file: `memory/cortex/${file}`,
        message: `Stale memory: not updated in ${ageDays} days`,
        fix: `Review and update memory/cortex/${file}, or delete it if no longer relevant`,
      });
    }
  }

  return { findings, filesChecked };
}

/**
 * Check issues for skill references that don't exist in skills/.
 */
function checkMissingSkills(lytosDir: string): {
  findings: DiagnosticFinding[];
  filesChecked: number;
} {
  const findings: DiagnosticFinding[] = [];
  let filesChecked = 0;

  const skillsDir = join(lytosDir, "skills");
  const boardDir = join(lytosDir, "issue-board");

  if (!existsSync(boardDir)) return { findings, filesChecked };

  // Collect available skill names. Two formats are accepted:
  //   - flat:   skills/<name>.md          (Lytos bootstrap protocols, e.g. session-start)
  //   - folder: skills/<name>/SKILL.md    (agentskills.io task skills)
  const availableSkills = new Set<string>();
  if (existsSync(skillsDir)) {
    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith(".md")) {
        availableSkills.add(entry.name.replace(/\.md$/, ""));
      } else if (
        entry.isDirectory() &&
        existsSync(join(skillsDir, entry.name, "SKILL.md"))
      ) {
        availableSkills.add(entry.name);
      }
    }
  }

  const statusDirs = [
    "0-icebox",
    "1-backlog",
    "2-sprint",
    "3-in-progress",
    "4-review",
  ];

  for (const dir of statusDirs) {
    const dirPath = join(boardDir, dir);
    if (!existsSync(dirPath)) continue;

    const files = readdirSync(dirPath).filter(
      (f) => f.startsWith("ISS-") && f.endsWith(".md")
    );

    for (const file of files) {
      const filePath = join(dirPath, file);
      const content = readFileSync(filePath, "utf-8");
      const fm = parseFrontmatter(content);
      const relPath = `issue-board/${dir}/${file}`;
      filesChecked++;

      if (!fm) continue;

      // Check main skill
      const skill = fm.skill;
      if (typeof skill === "string" && skill && !availableSkills.has(skill)) {
        findings.push({
          severity: "warning",
          category: "missing-skill",
          file: relPath,
          message: `References skill "${skill}" which does not exist in skills/`,
          fix: `Create skills/${skill}/SKILL.md or fix the skill field in ${relPath}`,
        });
      }

      // Check auxiliary skills
      const auxSkills = fm.skills_aux;
      if (Array.isArray(auxSkills)) {
        for (const aux of auxSkills) {
          if (aux && !availableSkills.has(aux)) {
            findings.push({
              severity: "warning",
              category: "missing-skill",
              file: relPath,
              message: `References auxiliary skill "${aux}" which does not exist in skills/`,
              fix: `Create skills/${aux}/SKILL.md or fix skills_aux in ${relPath}`,
            });
          }
        }
      }
    }
  }

  return { findings, filesChecked };
}

/**
 * Check that frontmatter status matches the folder the issue is in.
 */
function checkStatusMismatches(lytosDir: string): {
  findings: DiagnosticFinding[];
  filesChecked: number;
} {
  const findings: DiagnosticFinding[] = [];
  let filesChecked = 0;

  const boardDir = join(lytosDir, "issue-board");
  if (!existsSync(boardDir)) return { findings, filesChecked };

  const statusDirs = [
    "0-icebox",
    "1-backlog",
    "2-sprint",
    "3-in-progress",
    "4-review",
    "5-done",
  ];

  for (const dir of statusDirs) {
    const dirPath = join(boardDir, dir);
    if (!existsSync(dirPath)) continue;

    const files = readdirSync(dirPath).filter(
      (f) => f.startsWith("ISS-") && f.endsWith(".md")
    );

    for (const file of files) {
      const filePath = join(dirPath, file);
      const content = readFileSync(filePath, "utf-8");
      const fm = parseFrontmatter(content);
      const relPath = `issue-board/${dir}/${file}`;
      filesChecked++;

      if (!fm) continue;

      const fmStatus = typeof fm.status === "string" ? fm.status : "";
      if (fmStatus && fmStatus !== dir) {
        findings.push({
          severity: "error",
          category: "status-mismatch",
          file: relPath,
          message: `File is in ${dir}/ but frontmatter says status: ${fmStatus}`,
          fix: `Move to issue-board/${fmStatus}/ or update frontmatter to status: ${dir}`,
        });
      }
    }
  }

  return { findings, filesChecked };
}

/**
 * Check that issue dependencies reference existing issues.
 */
function checkOrphanDependencies(lytosDir: string): {
  findings: DiagnosticFinding[];
  filesChecked: number;
} {
  const findings: DiagnosticFinding[] = [];
  let filesChecked = 0;

  const boardDir = join(lytosDir, "issue-board");
  if (!existsSync(boardDir)) return { findings, filesChecked };

  // Collect all issue IDs
  const allIssueIds = new Set<string>();
  const statusDirs = [
    "0-icebox",
    "1-backlog",
    "2-sprint",
    "3-in-progress",
    "4-review",
    "5-done",
  ];

  for (const dir of statusDirs) {
    const dirPath = join(boardDir, dir);
    if (!existsSync(dirPath)) continue;

    const files = readdirSync(dirPath).filter(
      (f) => f.startsWith("ISS-") && f.endsWith(".md")
    );

    for (const file of files) {
      const filePath = join(dirPath, file);
      const content = readFileSync(filePath, "utf-8");
      const fm = parseFrontmatter(content);
      if (fm && typeof fm.id === "string") {
        allIssueIds.add(fm.id);
      }
    }
  }

  // Archived issues are legitimate dependency targets — historically closed
  // work still satisfies a `depends:`. Without this, every live issue that
  // depends on an archived one is falsely flagged as orphaned.
  for (const id of collectArchivedIssueIds(boardDir)) {
    allIssueIds.add(id);
  }

  // Check depends fields
  for (const dir of statusDirs) {
    const dirPath = join(boardDir, dir);
    if (!existsSync(dirPath)) continue;

    const files = readdirSync(dirPath).filter(
      (f) => f.startsWith("ISS-") && f.endsWith(".md")
    );

    for (const file of files) {
      const filePath = join(dirPath, file);
      const content = readFileSync(filePath, "utf-8");
      const fm = parseFrontmatter(content);
      const relPath = `issue-board/${dir}/${file}`;
      filesChecked++;

      if (!fm) continue;

      const depends = fm.depends;
      if (Array.isArray(depends)) {
        for (const dep of depends) {
          if (dep && !allIssueIds.has(dep)) {
            findings.push({
              severity: "warning",
              category: "orphan-dependency",
              file: relPath,
              message: `Depends on ${dep} which does not exist on the board`,
              fix: `Remove ${dep} from depends or create the missing issue`,
            });
          }
        }
      }
    }
  }

  return { findings, filesChecked };
}

/**
 * Detect issues still on frontmatter schema v1 (ADR-0001).
 * Emits an `info` finding per issue — informational only, no score penalty.
 * Active boards (icebox → review) are checked; done/archive are not.
 */
function checkSchemaVersion(lytosDir: string): {
  findings: DiagnosticFinding[];
} {
  const findings: DiagnosticFinding[] = [];
  const boardDir = join(lytosDir, "issue-board");
  if (!existsSync(boardDir)) return { findings };

  const activeStatusDirs = [
    "0-icebox",
    "1-backlog",
    "2-sprint",
    "3-in-progress",
    "4-review",
  ];

  for (const dir of activeStatusDirs) {
    const dirPath = join(boardDir, dir);
    if (!existsSync(dirPath)) continue;

    const files = readdirSync(dirPath).filter(
      (f) => f.startsWith("ISS-") && f.endsWith(".md")
    );

    for (const file of files) {
      const content = readFileSync(join(dirPath, file), "utf-8");
      const fm = parseFrontmatter(content);
      const relPath = `issue-board/${dir}/${file}`;

      if (!fm) continue;
      if (fm.schema_version === "2") continue;

      findings.push({
        severity: "info",
        category: "schema-v1",
        file: relPath,
        message: "Issue uses frontmatter schema v1 (no schema_version field)",
        fix: "Add `schema_version: 2` to adopt the v2 schema (ADR-0001). Backward-compatible — existing fields keep working.",
      });
    }
  }

  return { findings };
}

/**
 * Verify the lytos-issue merge driver is installed (ISS-0093): the
 * .gitattributes mapping AND the per-clone git config. Skipped silently
 * when the project isn't a git repo — nothing to merge there.
 */
function checkMergeDriverInstall(lytosDir: string): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = [];
  const projectRoot = join(lytosDir, "..");
  const check = checkMergeDriver(projectRoot);

  if (!check.gitRepo) return findings;

  if (!check.attributesOk) {
    findings.push({
      severity: "warning",
      category: "merge-driver",
      file: ".gitattributes",
      message: `Issue fiches are not mapped to the ${MERGE_DRIVER_NAME} merge driver — two branches appending to the same fiche will conflict`,
      fix: `Run \`lyt init\` again, or add this line to .gitattributes: ${GITATTRIBUTES_LINE}`,
    });
  }
  if (!check.configOk) {
    findings.push({
      severity: "warning",
      category: "merge-driver",
      file: ".git/config",
      message: `git config has no merge.${MERGE_DRIVER_NAME}.driver — the driver declared in .gitattributes cannot run on this clone`,
      fix: `Run \`lyt init\` again, or: git config merge.${MERGE_DRIVER_NAME}.driver "${MERGE_DRIVER_COMMAND}"`,
    });
  }
  return findings;
}

/**
 * Warn when the project's rules predate the "The CLI Is the Interface"
 * section (ISS-0097). An agent that reads rules without it does every
 * transition by hand — that is a generation gap, not an agent fault.
 * Any rules/*.md carrying the section (English or French wording)
 * satisfies the check.
 */
/**
 * Quality kit (ISS-0107): presence, structural coherence, and DoD gate-refs.
 * Absence is info-level (the kit is additive); a malformed kit is a warning.
 */
function checkQualityKit(lytosDir: string): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = [];
  const kit = loadKit(lytosDir);

  if (!kit) {
    findings.push({
      severity: "info",
      category: "quality-kit",
      file: "quality/",
      message:
        "No quality kit — gates and the risk matrix have nothing to select from",
      fix: "Add `.lytos/quality/kit.md` (gate catalog) and `stack.md` (stack contract), or re-run `lyt init`",
    });
    return findings;
  }

  for (const problem of validateKit(kit)) {
    findings.push({
      severity: "warning",
      category: "quality-kit",
      file: "quality/kit.md",
      message: `Malformed quality kit: ${problem}`,
      fix: "Fix the gate row: | id | gate|reviewer|human | low,medium,high | tool |",
    });
  }

  // The tighten-only contract (ISS-0114): a project may tune the kit above the
  // `low` floor, never below it.
  for (const violation of baselineViolations(kit)) {
    findings.push({
      severity: "warning",
      category: "quality-kit",
      file: "quality/kit.md",
      message: `Loosened below the risk baseline: ${violation}`,
      fix: "Restore the gate at low,medium,high — tune tiers above the floor instead, or record the exception in an ADR",
    });
  }

  // The stack contract (ISS-0107). It was parsed into a struct nothing read;
  // a contract nobody consults is documentation wearing a gate's clothes.
  for (const problem of validateStack(kit.stack)) {
    findings.push({
      severity: "warning",
      category: "quality-kit",
      file: "quality/stack.md",
      message: `Incomplete stack contract: ${problem}`,
      fix: "Fill the frontmatter (`lockfile:`, `docs_source:`) and list the runtime dependencies the project actually allows",
    });
  }

  // What the contract promises in prose: "anything outside this list fails the
  // dependency gate". Runtime deps only — dev tooling answers to deps-audit.
  for (const dep of unlistedDependencies(join(lytosDir, ".."), kit.stack)) {
    findings.push({
      severity: "warning",
      category: "quality-kit",
      file: "package.json",
      message: `Runtime dependency not allow-listed: ${dep}`,
      fix: `Add \`- ${dep}\` to the "Allowed dependencies" section of quality/stack.md, or record the addition in an ADR and then list it`,
    });
  }

  // DoD items may pin a gate (`verify: auto:<id>`) — flag refs the kit can't resolve.
  const boardDir = join(lytosDir, "issue-board");
  const statusDirs = [
    "0-icebox",
    "1-backlog",
    "2-sprint",
    "3-in-progress",
    "4-review",
    "5-done",
    "parked",
  ];
  for (const dir of statusDirs) {
    const dirPath = join(boardDir, dir);
    if (!existsSync(dirPath)) continue;
    for (const file of readdirSync(dirPath).filter(
      (f) => f.startsWith("ISS-") && f.endsWith(".md")
    )) {
      const unresolved = unresolvedGateRefs(
        readFileSync(join(dirPath, file), "utf-8"),
        kit
      );
      if (unresolved.length > 0) {
        findings.push({
          severity: "warning",
          category: "quality-kit",
          file: `issue-board/${dir}/${file}`,
          message: `DoD pins gate(s) absent from the kit: ${unresolved.join(", ")}`,
          fix: "Add the gate to quality/kit.md, or fix the `verify: auto:<id>` reference",
        });
      }
    }
  }

  return findings;
}

function checkCliInterfaceSection(lytosDir: string): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = [];
  const rulesDir = join(lytosDir, "rules");
  if (!existsSync(rulesDir)) return findings;

  const ruleFiles = readdirSync(rulesDir).filter((f) => f.endsWith(".md"));
  if (ruleFiles.length === 0) return findings;

  const marker = /is the interface|est l'interface/i;
  const hasSection = ruleFiles.some((f) =>
    marker.test(readFileSync(join(rulesDir, f), "utf-8"))
  );

  if (!hasSection) {
    findings.push({
      severity: "warning",
      category: "rules-cli-section",
      file: "rules/",
      message:
        "Rules never declare the CLI as THE interface to the board — agents reading them will do transitions by hand (frontmatter edits, git mv) even though the verbs exist",
      fix: 'Add the "The CLI Is the Interface" section (npx lyt verb table + never-edit-by-hand rule) to rules/default-rules.md, or re-run `lyt init` to regenerate the rules',
    });
  }
  return findings;
}

/**
 * Collect every issue ID present in the archive, so dependency checks accept
 * archived issues as valid targets. IDs come from two sources, unioned:
 *   - tokens in `archive/INDEX.md`
 *   - filenames of archived issue files (`archive/<quarter>/ISS-XXXX-*.md`)
 */
function collectArchivedIssueIds(boardDir: string): Set<string> {
  const ids = new Set<string>();
  const archiveDir = join(boardDir, "archive");
  if (!existsSync(archiveDir)) return ids;

  const idPattern = /ISS-\d{4}/g;

  const indexPath = join(archiveDir, "INDEX.md");
  if (existsSync(indexPath)) {
    const index = readFileSync(indexPath, "utf-8");
    for (const m of index.matchAll(idPattern)) {
      ids.add(m[0]);
    }
  }

  for (const file of collectMarkdownFiles(archiveDir)) {
    const name = file.replace(/^.*\//, "");
    const m = name.match(/^(ISS-\d{4})/);
    if (m) ids.add(m[1]);
  }

  return ids;
}

/**
 * Directories under `.lytos/` that hold generated, transient artefacts rather
 * than authored documents. `review/` holds cross-model audit prompts, rebuilt
 * by `lyt review --export`: they embed a snapshot of the board and its links, so
 * reading them as live documents reports links that were valid when the snapshot
 * was taken and have since moved (ISS-0133).
 */
const GENERATED_DIRS = new Set(["review"]);

/**
 * Recursively collect all .md files in a directory.
 */
function collectMarkdownFiles(dir: string): string[] {
  const results: string[] = [];

  if (!existsSync(dir)) return results;

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (GENERATED_DIRS.has(entry)) continue;
      results.push(...collectMarkdownFiles(fullPath));
    } else if (entry.endsWith(".md")) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Compute a health score from 0 to 100.
 *
 * Starts at 100, deducts points per finding:
 * - error: -10 points
 * - warning: -5 points
 * - info: -0 points
 * Floor at 0.
 */
function computeScore(
  findings: DiagnosticFinding[],
  filesChecked: number
): number {
  if (filesChecked === 0) return 0;

  let score = 100;

  for (const f of findings) {
    if (f.severity === "error") score -= 10;
    if (f.severity === "warning") score -= 5;
  }

  return Math.max(0, score);
}
