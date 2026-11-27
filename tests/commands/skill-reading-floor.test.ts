/**
 * The floor under every tool (ISS-0191): the bridges and `session-start.md`
 * order the explicit reading of the task skills.
 */

import { describe, it, expect } from "vitest";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import {
  TASK_SKILLS_MARKER,
  claudeTemplate,
  codexTemplate,
  copilotTemplate,
  cursorRulesTemplate,
  geminiTemplate,
  windsurfTemplate,
} from "../../src/lib/templates.js";
import { METHOD, read } from "../helpers/skill-project.js";

describe("the floor: every tool is told to read the skills", () => {
  const ctx = {} as Parameters<typeof claudeTemplate>[0];

  it.each([
    ["claude", claudeTemplate],
    ["codex", codexTemplate],
    ["cursor", cursorRulesTemplate],
    ["copilot", copilotTemplate],
    ["gemini", geminiTemplate],
    ["windsurf", windsurfTemplate],
  ])("the %s bridge orders the explicit reading", (_tool, template) => {
    const text = template(ctx);
    expect(text).toMatch(/\.lytos\/skills\/<name>\/SKILL\.md/);
    expect(text).toMatch(
      /do not assume your tool loads that folder on its own/i
    );
    expect(text).toMatch(/small (task|ones)/i);
    expect(text).toMatch(/read the frontmatter of each/i);
  });

  it.each([
    ["claude", claudeTemplate],
    ["codex", codexTemplate],
    ["cursor", cursorRulesTemplate],
    ["copilot", copilotTemplate],
    ["gemini", geminiTemplate],
    ["windsurf", windsurfTemplate],
  ])(
    "the %s bridge carries the marker upgrade looks for",
    (_tool, template) => {
      const lines = template(ctx)
        .split("\n")
        .map((line) => line.trim());
      expect(lines).toContain(TASK_SKILLS_MARKER);
    }
  );

  const sessionStart = read(join(METHOD, "skills/session-start.md"));

  it("session-start orders it on lightweight startup too", () => {
    const lightweight = sessionStart
      .split("#### Lightweight startup")[1]
      .split("#### Standard startup")[0];
    expect(lightweight).toContain("read the task skills that apply");
    expect(sessionStart).toContain("At every startup, lightweight included");
  });

  it("the reference loop briefs its builder with every skill that applies", () => {
    const loop = read(join(METHOD, "skills/reference-loop/SKILL.md"));
    const brief = loop.split("**Brief.**")[1].split("\n")[0];
    expect(brief).toContain("whose `description` matches the task");
  });

  it("every skill path session-start names exists in the shipped skills", () => {
    const paths = [
      ...sessionStart.matchAll(/\.lytos\/(skills\/[A-Za-z0-9/_.-]+\.md)/g),
    ].map((m) => m[1]);
    expect(paths.length).toBeGreaterThan(2);
    for (const path of paths) {
      expect(existsSync(join(METHOD, path)), path).toBe(true);
    }
  });

  it("nothing shipped says a tool discovers the skills natively", () => {
    const claim =
      /discover[^.\n]{0,60}natively|native (skill|progressive)|via agentskills\.io progressive/i;
    const shipped = readdirSync(METHOD, { recursive: true, encoding: "utf-8" })
      .filter((p) => p.endsWith(".md"))
      .map((p) => join(METHOD, p));
    for (const path of shipped) expect(read(path), path).not.toMatch(claim);
    expect("Tools discover these skills natively").toMatch(claim);
  });
});
