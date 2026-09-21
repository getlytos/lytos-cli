/**
 * Regression tests for ISS-0149.
 *
 * `lyt lint` used to only recognize English manifest section headings
 * (`## Identity`, `## Why this project exists`, `## Tech stack`), while
 * `lyt init --lang fr` generates French ones (`## Identité`, ...). A
 * project scaffolded in French failed `lyt lint` out of the box.
 *
 * These tests check the fix at its source: `MANIFEST_SECTIONS` in
 * `manifest-sections.ts` is the single place headings are defined, and
 * both `manifestTemplate()` (what `lyt init` writes) and `lint()` (what
 * `lyt lint` requires) must agree on it — for every supported language,
 * not just English.
 */

import { describe, it, expect } from "vitest";
import { writeFileSync, mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { lint, type LintFinding } from "../../src/lib/linter.js";
import { manifestTemplate } from "../../src/lib/templates.js";
import { MANIFEST_SECTIONS, MANIFEST_LANGS } from "../../src/lib/manifest-sections.js";

function lintManifest(content: string): LintFinding[] {
  const dir = mkdtempSync(join(tmpdir(), "lytos-manifest-test-"));
  try {
    writeFileSync(join(dir, "manifest.md"), content);
    return lint(dir).findings.filter((f) => f.file === "manifest.md");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function generatedManifest(lang: "en" | "fr"): string {
  return manifestTemplate({
    projectName: "Test Project",
    date: "2026-01-01",
    stack: {},
    lang,
  });
}

describe("lyt lint accepts every language the templates generate (ISS-0149)", () => {
  for (const lang of MANIFEST_LANGS) {
    // (a) + (b) + (d): lints each language's freshly generated manifest.
    // If a template heading and the linter's expectation ever diverge for
    // this language, this test fails — it is the single check that keeps
    // manifest-sections.ts honest as the shared source of truth.
    it(`passes the section checks on a manifest generated in "${lang}"`, () => {
      const messages = lintManifest(generatedManifest(lang)).map(
        (f) => f.message
      );
      const missingSections = messages.filter((m) =>
        m.startsWith("Missing section:")
      );
      expect(missingSections).toEqual([]);
    });
  }

  it('still flags an unfilled owner and the unreplaced "why" placeholder in French', () => {
    // Same behavior as English, not just the section headings: the
    // placeholder checks (PLACEHOLDER_PATTERNS) were English-only too.
    const messages = lintManifest(generatedManifest("fr")).map(
      (f) => f.message
    );
    expect(messages).toContain("Empty owner in manifest");
    expect(messages).toContain("Template placeholder text still present");
  });

  it('flags the same placeholders in English (no regression)', () => {
    const messages = lintManifest(generatedManifest("en")).map(
      (f) => f.message
    );
    expect(messages).toContain("Empty owner in manifest");
    expect(messages).toContain("Template placeholder text still present");
  });

  // (c) A manifest missing a section still fails lint, in every language.
  for (const lang of MANIFEST_LANGS) {
    for (const section of MANIFEST_SECTIONS) {
      it(`still fails when "${section.name}" is missing, in "${lang}"`, () => {
        const withoutSection = generatedManifest(lang).replace(
          `## ${section.heading[lang]}`,
          ""
        );
        const messages = lintManifest(withoutSection).map((f) => f.message);
        expect(messages).toContain(`Missing section: ${section.name}`);
      });
    }
  }
});
