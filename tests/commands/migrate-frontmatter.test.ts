/**
 * Integration tests for `lyt migrate-frontmatter` (ISS-0077).
 *
 * These run the built CLI against a non-git fixture, so date heuristics fall
 * back to a graceful skip while schema_version is still applied. Date
 * backfilling from real history is covered by the lib unit tests, which inject
 * a fake resolver (tests/lib/migrate.test.ts).
 */

import { describe, it, expect, afterEach } from "vitest";
import { resolve, join } from "path";
import { mkdirSync, writeFileSync, readFileSync } from "fs";
import { createEmptyFixture, type Fixture } from "../helpers/fixtures.js";
import { parseFrontmatter } from "../../src/lib/frontmatter.js";

const CLI = resolve(__dirname, "../../dist/cli.js");

function run(args: string, cwd: string): { stdout: string; stderr: string; exitCode: number } {
  const { spawnSync } = require("child_process");
  const result = spawnSync("node", [CLI, ...args.split(" ")], { cwd, encoding: "utf-8" });
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    exitCode: result.status ?? 0,
  };
}

function writeIssue(cwd: string, dir: string, file: string, frontmatter: string): string {
  const dirPath = join(cwd, ".lytos", "issue-board", dir);
  mkdirSync(dirPath, { recursive: true });
  const filePath = join(dirPath, file);
  writeFileSync(filePath, `---\n${frontmatter}\n---\n\n# Body\n`);
  return filePath;
}

let fixture: Fixture;

afterEach(() => {
  if (fixture) fixture.cleanup();
});

describe("lyt migrate-frontmatter", () => {
  it("exits 2 when there is no .lytos/", () => {
    fixture = createEmptyFixture();
    const result = run("migrate-frontmatter", fixture.cwd);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("No .lytos/ directory found");
  });

  it("dry-run reports changes but writes nothing", () => {
    fixture = createEmptyFixture();
    const filePath = writeIssue(fixture.cwd, "1-backlog", "ISS-0001-v1.md", `id: ISS-0001\nstatus: 1-backlog`);
    const before = readFileSync(filePath, "utf-8");

    const result = run("migrate-frontmatter --json", fixture.cwd);
    const data = JSON.parse(result.stdout);

    expect(data.applied).toBe(false);
    expect(data.toMigrate).toBe(1);
    // File on disk is unchanged.
    expect(readFileSync(filePath, "utf-8")).toBe(before);
  });

  it("--apply writes schema_version", () => {
    fixture = createEmptyFixture();
    const filePath = writeIssue(fixture.cwd, "1-backlog", "ISS-0001-v1.md", `id: ISS-0001\nstatus: 1-backlog`);

    const result = run("migrate-frontmatter --apply --json", fixture.cwd);
    const data = JSON.parse(result.stdout);

    expect(data.applied).toBe(true);
    expect(data.written).toBe(1);
    expect(parseFrontmatter(readFileSync(filePath, "utf-8"))!.schema_version).toBe("2");
  });

  it("is a no-op on an already-migrated repo", () => {
    fixture = createEmptyFixture();
    writeIssue(fixture.cwd, "1-backlog", "ISS-0001-v2.md", `id: ISS-0001\nstatus: 1-backlog\nschema_version: 2`);

    const result = run("migrate-frontmatter --json", fixture.cwd);
    const data = JSON.parse(result.stdout);

    expect(data.toMigrate).toBe(0);
    expect(data.alreadyCurrent).toBe(1);
  });

  it("records a graceful skip for dates when there is no git history", () => {
    fixture = createEmptyFixture();
    writeIssue(fixture.cwd, "5-done", "ISS-0001-done.md", `id: ISS-0001\nstatus: 5-done`);

    const result = run("migrate-frontmatter --json", fixture.cwd);
    const data = JSON.parse(result.stdout);
    const m = data.migrations.find((x: { id: string }) => x.id === "ISS-0001");

    expect(m.added).toContainEqual({ field: "schema_version", value: "2" });
    expect(m.skipped).toContainEqual({ field: "started_at", reason: "no git history" });
    expect(m.skipped).toContainEqual({ field: "completed_at", reason: "no git history" });
  });
});
