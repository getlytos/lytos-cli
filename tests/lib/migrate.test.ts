/**
 * Unit tests for the frontmatter migration logic (ISS-0077).
 *
 * The git history is faked through an injected GitDateResolver, so these tests
 * are deterministic and need no real repository.
 */

import { describe, it, expect, afterEach } from "vitest";
import { mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import {
  planMigration,
  applyMigration,
  type GitDateResolver,
} from "../../src/lib/migrate.js";
import { parseFrontmatter } from "../../src/lib/frontmatter.js";
import { createEmptyFixture, type Fixture } from "../helpers/fixtures.js";

let fixture: Fixture;

afterEach(() => {
  if (fixture) fixture.cleanup();
});

function lytosBoard(cwd: string): string {
  return join(cwd, ".lytos", "issue-board");
}

function writeIssue(cwd: string, dir: string, file: string, frontmatter: string): void {
  const dirPath = join(lytosBoard(cwd), dir);
  mkdirSync(dirPath, { recursive: true });
  writeFileSync(join(dirPath, file), `---\n${frontmatter}\n---\n\n# Body\n`);
}

const nullResolver: GitDateResolver = {
  firstAdded: () => null,
  lastTouched: () => null,
};

const fixedResolver: GitDateResolver = {
  firstAdded: () => "2026-01-02",
  lastTouched: () => "2026-03-04",
};

describe("planMigration", () => {
  it("flags a v1 issue for schema_version and reports nothing for a v2 issue", () => {
    fixture = createEmptyFixture();
    writeIssue(fixture.cwd, "1-backlog", "ISS-0001-v1.md", `id: ISS-0001\nstatus: 1-backlog`);
    writeIssue(
      fixture.cwd,
      "1-backlog",
      "ISS-0002-v2.md",
      `id: ISS-0002\nstatus: 1-backlog\nschema_version: 2`
    );

    const plan = planMigration(join(fixture.cwd, ".lytos"), {}, nullResolver);

    expect(plan.scanned).toBe(2);
    expect(plan.toMigrate).toBe(1);
    expect(plan.alreadyCurrent).toBe(1);

    const v1 = plan.migrations.find((m) => m.id === "ISS-0001")!;
    expect(v1.added).toEqual([{ field: "schema_version", value: "2" }]);
    const v2 = plan.migrations.find((m) => m.id === "ISS-0002")!;
    expect(v2.changed).toBe(false);
  });

  it("backfills started_at for started issues and completed_at for done issues", () => {
    fixture = createEmptyFixture();
    writeIssue(fixture.cwd, "5-done", "ISS-0003-done.md", `id: ISS-0003\nstatus: 5-done`);

    const plan = planMigration(join(fixture.cwd, ".lytos"), {}, fixedResolver);
    const m = plan.migrations.find((m) => m.id === "ISS-0003")!;

    expect(m.added).toContainEqual({ field: "schema_version", value: "2" });
    expect(m.added).toContainEqual({ field: "started_at", value: "2026-01-02" });
    expect(m.added).toContainEqual({ field: "completed_at", value: "2026-03-04" });
  });

  it("does not backfill started_at for never-started issues (backlog/icebox)", () => {
    fixture = createEmptyFixture();
    writeIssue(fixture.cwd, "1-backlog", "ISS-0004-backlog.md", `id: ISS-0004\nstatus: 1-backlog`);

    const plan = planMigration(join(fixture.cwd, ".lytos"), {}, fixedResolver);
    const m = plan.migrations.find((m) => m.id === "ISS-0004")!;

    expect(m.added.map((a) => a.field)).toEqual(["schema_version"]);
    expect(m.skipped).toHaveLength(0);
  });

  it("records an explicit skip when git history is missing", () => {
    fixture = createEmptyFixture();
    writeIssue(fixture.cwd, "5-done", "ISS-0005-done.md", `id: ISS-0005\nstatus: 5-done`);

    const plan = planMigration(join(fixture.cwd, ".lytos"), {}, nullResolver);
    const m = plan.migrations.find((m) => m.id === "ISS-0005")!;

    expect(m.added).toEqual([{ field: "schema_version", value: "2" }]);
    expect(m.skipped).toContainEqual({ field: "started_at", reason: "no git history" });
    expect(m.skipped).toContainEqual({ field: "completed_at", reason: "no git history" });
  });

  it("never overwrites an existing value", () => {
    fixture = createEmptyFixture();
    writeIssue(
      fixture.cwd,
      "5-done",
      "ISS-0006-dated.md",
      `id: ISS-0006\nstatus: 5-done\nschema_version: 2\nstarted_at: 2025-12-01\ncompleted_at: 2025-12-31`
    );

    const plan = planMigration(join(fixture.cwd, ".lytos"), {}, fixedResolver);
    const m = plan.migrations.find((m) => m.id === "ISS-0006")!;

    expect(m.changed).toBe(false);
    expect(m.added).toHaveLength(0);
  });

  it("ignores the archive unless includeArchive is set", () => {
    fixture = createEmptyFixture();
    writeIssue(fixture.cwd, "archive/2026-Q2", "ISS-0007-old.md", `id: ISS-0007\nstatus: 5-done`);

    const without = planMigration(join(fixture.cwd, ".lytos"), {}, fixedResolver);
    expect(without.scanned).toBe(0);

    const withArchive = planMigration(
      join(fixture.cwd, ".lytos"),
      { includeArchive: true },
      fixedResolver
    );
    expect(withArchive.scanned).toBe(1);
    const m = withArchive.migrations.find((m) => m.id === "ISS-0007")!;
    expect(m.added).toContainEqual({ field: "completed_at", value: "2026-03-04" });
  });
});

describe("applyMigration", () => {
  it("writes the planned fields and is idempotent on a second run", () => {
    fixture = createEmptyFixture();
    const lytosDir = join(fixture.cwd, ".lytos");
    writeIssue(fixture.cwd, "5-done", "ISS-0008-done.md", `id: ISS-0008\nstatus: 5-done`);

    const plan = planMigration(lytosDir, {}, fixedResolver);
    const written = applyMigration(lytosDir, plan);
    expect(written).toBe(1);

    const filePath = join(lytosBoard(fixture.cwd), "5-done", "ISS-0008-done.md");
    const fm = parseFrontmatter(readFileSync(filePath, "utf-8"))!;
    expect(fm.schema_version).toBe("2");
    expect(fm.started_at).toBe("2026-01-02");
    expect(fm.completed_at).toBe("2026-03-04");

    // Second run: nothing left to migrate.
    const plan2 = planMigration(lytosDir, {}, fixedResolver);
    expect(plan2.toMigrate).toBe(0);
    expect(applyMigration(lytosDir, plan2)).toBe(0);
  });

  it("leaves the issue body untouched", () => {
    fixture = createEmptyFixture();
    const lytosDir = join(fixture.cwd, ".lytos");
    const dirPath = join(lytosBoard(fixture.cwd), "1-backlog");
    mkdirSync(dirPath, { recursive: true });
    const filePath = join(dirPath, "ISS-0009-body.md");
    writeFileSync(
      filePath,
      `---\nid: ISS-0009\nstatus: 1-backlog\n---\n\n# Title\n\nSome **body** with a - [ ] checkbox.\n`
    );

    const plan = planMigration(lytosDir, {}, nullResolver);
    applyMigration(lytosDir, plan);

    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("Some **body** with a - [ ] checkbox.");
    expect(parseFrontmatter(content)!.schema_version).toBe("2");
  });
});
