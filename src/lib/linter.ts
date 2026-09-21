/**
 * Linter — validates .lytos/ structure and content.
 *
 * Returns a list of findings (errors and warnings) with
 * file path, message, and fix suggestion.
 * Zero dependencies.
 */

import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { parseFrontmatter } from "./frontmatter.js";
import { analyzeDod } from "./dod.js";
import { analyzeReady } from "./ready.js";
import {
  MANIFEST_SECTIONS as MANIFEST_SECTION_DEFS,
  MANIFEST_LANGS,
  MANIFEST_OWNER_LABEL,
  MANIFEST_WHY_PLACEHOLDER,
  type ManifestLang,
} from "./manifest-sections.js";

export type Severity = "error" | "warning";

export interface LintFinding {
  severity: Severity;
  file: string;
  message: string;
  fix: string;
}

export interface LintResult {
  findings: LintFinding[];
  filesChecked: number;
  errors: number;
  warnings: number;
}

const REQUIRED_FILES = [
  { path: "manifest.md", fix: "Run `lyt init` to create the Lytos structure" },
  {
    path: "LYTOS.md",
    fix: "Run `lyt init` or download from github.com/getlytos/lytos-method",
  },
  {
    path: "memory/MEMORY.md",
    fix: "Create memory/MEMORY.md with a section index",
  },
  {
    path: "rules/default-rules.md",
    fix: "Run `lyt init` to get the default rules",
  },
  { path: "issue-board/BOARD.md", fix: "Run `lyt board` to generate BOARD.md" },
];

const REQUIRED_DIRS = [
  { path: "skills", fix: "Run `lyt init` to create the skills directory" },
  { path: "rules", fix: "Run `lyt init` to create the rules directory" },
  {
    path: "memory/cortex",
    fix: "Run `lyt init` to create the cortex directory",
  },
  { path: "issue-board", fix: "Run `lyt init` to create the issue board" },
];

/**
 * Escape a literal string for use inside a `RegExp`.
 */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Match any supported language's spelling of a heading or placeholder.
 * The manifest's language is not read from config — accepting every
 * language the templates generate is simpler and just as correct (ISS-0149).
 */
function anyLanguagePattern(textFor: (lang: ManifestLang) => string): RegExp {
  const alternatives = MANIFEST_LANGS.map((lang) =>
    escapeRegExp(textFor(lang))
  );
  return new RegExp(alternatives.join("|"));
}

/** Matches `| <label> |` followed by an empty cell, for every language. */
function emptyFieldPattern(labelFor: (lang: ManifestLang) => string): RegExp {
  const alternatives = MANIFEST_LANGS.map(
    (lang) => `\\| ${escapeRegExp(labelFor(lang))} \\|\\s*\\|`
  );
  return new RegExp(alternatives.join("|"));
}

const MANIFEST_SECTION_FIXES: Record<string, string> = {
  identity: 'Add an "## Identity" section with project name and description',
  why: 'Add a "## Why this project exists" section',
  stack: 'Add a "## Tech stack" section with your technologies',
};

const MANIFEST_SECTIONS = MANIFEST_SECTION_DEFS.map((section) => ({
  pattern: anyLanguagePattern((lang) => `## ${section.heading[lang]}`),
  name: section.name,
  fix: MANIFEST_SECTION_FIXES[section.key],
}));

const PLACEHOLDER_PATTERNS = [
  {
    pattern: /YYYY-MM-DD/,
    message: "Date placeholder not replaced",
    fix: "Replace YYYY-MM-DD with an actual date",
  },
  {
    pattern: /\| Description \|\s*\|/,
    message: "Empty description in manifest",
    fix: "Fill in the project description",
  },
  {
    pattern: emptyFieldPattern((lang) => MANIFEST_OWNER_LABEL[lang]),
    message: "Empty owner in manifest",
    fix: "Fill in the project owner",
  },
  {
    pattern: anyLanguagePattern((lang) => MANIFEST_WHY_PLACEHOLDER[lang]),
    message: "Template placeholder text still present",
    fix: "Replace the placeholder with your project's purpose",
  },
];

const REQUIRED_FRONTMATTER_FIELDS = ["id", "title", "status", "priority"];

// Schema v2 enum domains (ADR-0001). All v2 fields are optional;
// validation runs only when the field is present.
const V2_REVIEW_VALUES = ["go", "go-pending-human", "no-go", "pending", "none"];
const V2_RISK_VALUES = ["low", "medium", "high"];
const V2_VALIDATION_VALUES = ["pass", "fail", "skip"];
const V2_VALIDATION_KEYS = ["tests", "build", "lint"] as const;

/**
 * Run all lint checks on a .lytos/ directory.
 */
export function lint(lytosDir: string): LintResult {
  const findings: LintFinding[] = [];
  let filesChecked = 0;

  // Check required files
  for (const req of REQUIRED_FILES) {
    const fullPath = join(lytosDir, req.path);
    if (!existsSync(fullPath)) {
      findings.push({
        severity: "error",
        file: req.path,
        message: `Required file missing: ${req.path}`,
        fix: req.fix,
      });
    } else {
      filesChecked++;
    }
  }

  // Check required directories
  for (const req of REQUIRED_DIRS) {
    const fullPath = join(lytosDir, req.path);
    if (!existsSync(fullPath)) {
      findings.push({
        severity: "error",
        file: req.path,
        message: `Required directory missing: ${req.path}`,
        fix: req.fix,
      });
    }
  }

  // Validate manifest content
  const manifestPath = join(lytosDir, "manifest.md");
  if (existsSync(manifestPath)) {
    const content = readFileSync(manifestPath, "utf-8");
    filesChecked++;

    for (const section of MANIFEST_SECTIONS) {
      if (!section.pattern.test(content)) {
        findings.push({
          severity: "error",
          file: "manifest.md",
          message: `Missing section: ${section.name}`,
          fix: section.fix,
        });
      }
    }

    // Check for placeholders in manifest
    for (const ph of PLACEHOLDER_PATTERNS) {
      if (ph.pattern.test(content)) {
        findings.push({
          severity: "warning",
          file: "manifest.md",
          message: ph.message,
          fix: ph.fix,
        });
      }
    }
  }

  // Validate issue frontmatter
  const issueFindings = lintIssues(lytosDir);
  findings.push(...issueFindings.findings);
  filesChecked += issueFindings.filesChecked;

  // Check skills directory has files
  const skillsDir = join(lytosDir, "skills");
  if (existsSync(skillsDir)) {
    const skills = readdirSync(skillsDir).filter((f) => f.endsWith(".md"));
    if (skills.length === 0) {
      findings.push({
        severity: "warning",
        file: "skills/",
        message: "Skills directory is empty",
        fix: "Run `lyt init` to download the 9 default skills",
      });
    }
  }

  const errors = findings.filter((f) => f.severity === "error").length;
  const warnings = findings.filter((f) => f.severity === "warning").length;

  return { findings, filesChecked, errors, warnings };
}

/**
 * Validate all issue files in the issue-board.
 */
function lintIssues(lytosDir: string): {
  findings: LintFinding[];
  filesChecked: number;
} {
  const findings: LintFinding[] = [];
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
    "parked", // side-state (ADR-0004 §3)
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

      if (!fm) {
        findings.push({
          severity: "error",
          file: relPath,
          message: "No YAML frontmatter found",
          fix: "Add YAML frontmatter with --- delimiters at the top of the file",
        });
        continue;
      }

      // Check required fields
      for (const field of REQUIRED_FRONTMATTER_FIELDS) {
        const value = fm[field];
        if (!value || (typeof value === "string" && value.trim() === "")) {
          findings.push({
            severity: "error",
            file: relPath,
            message: `Missing required field: ${field}`,
            fix: `Add '${field}:' to the issue frontmatter`,
          });
        }
      }

      // Check folder matches frontmatter status
      const fmStatus = typeof fm.status === "string" ? fm.status : "";
      if (fmStatus && fmStatus !== dir) {
        findings.push({
          severity: "warning",
          file: relPath,
          message: `Folder is ${dir} but frontmatter says status: ${fmStatus}`,
          fix: `Move the file to ${fmStatus}/ or update the frontmatter status`,
        });
      }

      // Schema v2 enum validation (ADR-0001). Only when the field is present.
      validateV2Fields(fm, relPath, findings);

      // DoD verification mode (ADR-0004 §4, ISS-0101): on schema v2 issues,
      // flag Definition-of-Done items that lack a `verify: auto|human` marker.
      if (String(fm.schema_version) === "2") {
        const dod = analyzeDod(content);
        if (dod.hasDod && dod.unqualified > 0) {
          findings.push({
            severity: "warning",
            file: relPath,
            message: `${dod.unqualified} Definition-of-Done item(s) without a verify: marker`,
            fix: "Append '— verify: auto' or '— verify: human' to each DoD item (ADR-0004 §4)",
          });
        }

        // Definition of Ready (ADR-0007 §3, ISS-0115): sprint issues must be ready.
        if (dir === "2-sprint") {
          const ready = analyzeReady(content, fm);
          if (!ready.ready) {
            findings.push({
              severity: "warning",
              file: relPath,
              message: `Sprint issue not ready: ${ready.missing.join(", ")}`,
              fix: "Set `risk`, give the DoD a machine-verifiable item, and declare an out-of-scope (ADR-0007 §3)",
            });
          }
        }
      }
    }
  }

  return { findings, filesChecked };
}

/**
 * Validate schema v2 enum fields when present.
 * v1 issues without these fields are unaffected.
 */
function validateV2Fields(
  fm: ReturnType<typeof parseFrontmatter>,
  relPath: string,
  findings: LintFinding[]
): void {
  if (!fm) return;

  const review = fm.review;
  if (
    typeof review === "string" &&
    review !== "" &&
    !V2_REVIEW_VALUES.includes(review)
  ) {
    findings.push({
      severity: "error",
      file: relPath,
      message: `Invalid 'review' value: ${review}`,
      fix: `Use one of: ${V2_REVIEW_VALUES.join(", ")}`,
    });
  }

  const risk = fm.risk;
  if (
    typeof risk === "string" &&
    risk !== "" &&
    !V2_RISK_VALUES.includes(risk)
  ) {
    findings.push({
      severity: "error",
      file: relPath,
      message: `Invalid 'risk' value: ${risk}`,
      fix: `Use one of: ${V2_RISK_VALUES.join(", ")}`,
    });
  }

  const confidence = fm.confidence;
  if (typeof confidence === "string" && confidence !== "") {
    const n = Number(confidence);
    if (!Number.isInteger(n) || n < 0 || n > 100) {
      findings.push({
        severity: "error",
        file: relPath,
        message: `Invalid 'confidence' value: ${confidence} (must be integer 0-100)`,
        fix: "Set 'confidence' to an integer between 0 and 100",
      });
    }
  }

  const validation = fm.validation;
  if (
    validation &&
    typeof validation === "object" &&
    !Array.isArray(validation)
  ) {
    for (const subKey of V2_VALIDATION_KEYS) {
      const v = validation[subKey];
      if (v !== undefined && v !== "" && !V2_VALIDATION_VALUES.includes(v)) {
        findings.push({
          severity: "error",
          file: relPath,
          message: `Invalid 'validation.${subKey}' value: ${v}`,
          fix: `Use one of: ${V2_VALIDATION_VALUES.join(", ")}`,
        });
      }
    }
  }
}
