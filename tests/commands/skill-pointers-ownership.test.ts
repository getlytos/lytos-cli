/**
 * What `lyt` may write (ISS-0191): only a file it generated, and only one whose
 * rewriting changes that file alone.
 */

import { describe, it, expect, afterEach } from "vitest";
import { linkSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import {
  addSkill,
  cleanupProjects,
  emptyDir,
  pointer,
  project,
  read,
  run,
  source,
} from "../helpers/skill-project.js";

afterEach(cleanupProjects);

describe("a pointer with another hard link is not rewritten (second audit)", () => {
  /**
   * A drifted pointer that is also, by a hard link, a file somewhere else. The
   * skill is the project's own: `init --force` leaves it alone, so the pointer
   * stays drifted for every command.
   */
  function linkedAndDrifted(): { cwd: string; other: string; before: string } {
    const cwd = project();
    addSkill(cwd, "billing-rules", "name: billing-rules\ndescription: Old.");
    expect(run("upgrade", cwd).exitCode).toBe(0);
    const other = join(emptyDir(), "snapshot.md");
    linkSync(pointer(cwd, "billing-rules"), other);
    addSkill(
      cwd,
      "billing-rules",
      "name: billing-rules\ndescription: Changed."
    );
    return { cwd, other, before: read(other) };
  }

  it.each([
    ["upgrade"],
    ["upgrade --force"],
    ["upgrade --dry-run"],
    ["init --yes --force --tool claude"],
  ])("leaves the other file alone and says so on `lyt %s`", (args) => {
    const { cwd, other, before } = linkedAndDrifted();

    const result = run(args, cwd);
    expect(result.exitCode).toBe(0);
    expect(read(other)).toBe(before);
    if (!args.includes("dry-run"))
      expect(read(pointer(cwd, "billing-rules"))).toBe(before);
    if (args.startsWith("upgrade")) {
      expect(result.stderr).toMatch(
        /lytos-billing-rules\/SKILL\.md not rewritten: .*another hard link/
      );
    }
  });

  it("writes a fresh pointer once the linked one is deleted, as it advises", () => {
    const { cwd, other, before } = linkedAndDrifted();
    rmSync(pointer(cwd, "billing-rules"));

    expect(run("upgrade", cwd).exitCode).toBe(0);
    expect(read(pointer(cwd, "billing-rules"))).toContain(
      "description: Changed."
    );
    expect(read(other)).toBe(before);
  });

  it("says nothing about a linked pointer it has no reason to write", () => {
    const cwd = project();
    linkSync(pointer(cwd, "testing"), join(emptyDir(), "snapshot.md"));

    expect(run("upgrade", cwd).stderr).not.toContain("hard link");
  });
});

describe("only a file lyt wrote is its pointer: quoting the marker is not being one", () => {
  const MARKER =
    "<!-- lytos:skill-pointer source=.lytos/skills/testing/SKILL.md -->";

  it.each([
    ["in a sentence", `My notes. A pointer starts with \`${MARKER}\`.`],
    ["in a code block", `My notes.\n\n\`\`\`\n${MARKER}\n\`\`\``],
    ["alone, lower in the file", `My notes.\n\n${MARKER}`],
  ])("keeps the project's own skill that has it %s", (_label, body) => {
    const cwd = project();
    const mine = `---\nname: lytos-testing\ndescription: Mine.\n---\n\n${body}\n`;
    writeFileSync(pointer(cwd, "testing"), mine);

    expect(run("upgrade --force", cwd).stderr).toContain(
      "lyt did not generate it"
    );
    expect(read(pointer(cwd, "testing"))).toBe(mine);
  });

  it("still refreshes its own pointer after a CRLF checkout", () => {
    const cwd = project();
    writeFileSync(
      pointer(cwd, "testing"),
      read(pointer(cwd, "testing")).replace(/\n/g, "\r\n")
    );
    writeFileSync(
      source(cwd, "testing"),
      read(source(cwd, "testing")).replace(
        /^description: .*$/m,
        "description: Changed."
      )
    );

    expect(run("upgrade", cwd).exitCode).toBe(0);
    expect(read(pointer(cwd, "testing"))).toContain("description: Changed.");
  });
});
