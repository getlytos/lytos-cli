/**
 * The check that keeps private content out of what the method ships (ISS-0155).
 *
 * This repository is public, so the check holds NO name: it looks for what is
 * private by shape (machine paths, addresses, credentials, private URLs), and for
 * the private terms a maintainer supplies locally. The fake term below stands in
 * for whatever a maintainer would list.
 */

import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { leaksIn, privateTerms } from "../helpers/shipped-content.js";

let dir: string | null = null;
function project(termsFile?: string): string {
  dir = mkdtempSync(join(tmpdir(), "lytos-leaks-"));
  mkdirSync(join(dir, ".lytos"), { recursive: true });
  if (termsFile !== undefined) writeFileSync(join(dir, ".lytos", "private-terms.local"), termsFile);
  return dir;
}
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = null;
});

describe("leaksIn — generic, by shape", () => {
  it.each([
    ["a macOS home path", "see /Users/someone/work/notes.md"],
    ["a Linux home path", "cd /home/someone/project"],
    ["a Windows profile path", "C:\\Users\\someone\\project"],
    ["an email address", "write to someone@private-company.test"],
    // Assembled at run time: the repository's own secrets scan greps for this very shape, and must not trip on the fixture.
    ["a token assignment", `${"token"}: ${"abcdefghij0123456789"}${"abcdefghij"}`],
    ["an api key assignment", `${"api_key"} = '${"ABCDEFGHIJ0123456789"}${"ABCDEFGHIJ"}'`],
    ["a localhost URL", "open http://localhost:3000/admin"],
    ["a private-range URL", "http://192.168.1.20/status"],
    ["an internal host", "https://billing.internal/api"],
    ["a shared design artifact", "https://claude.ai/artifact/AbCdEf123"],
  ])("flags %s", (_label, text) => {
    const found = leaksIn(text, project(), {});
    expect(found, text).toHaveLength(1);
  });

  it.each([
    "write to alice@example.com",
    "https://github.com/getlytos/lytos-cli/blob/main/method/quality/kit.md",
    "Authorization: Bearer <token>",
    "token: short",
    "the /Users directory is a macOS convention",
    "a plain sentence with no private content at all",
  ])("lets %j through", (text) => {
    expect(leaksIn(text, project(), {})).toEqual([]);
  });
});

describe("privateTerms — optional, local, never committed", () => {
  it("is empty, and the check passes, when nothing is provided", () => {
    const root = project();
    expect(privateTerms(root, {})).toEqual([]);
    expect(leaksIn("zebra-corp is a client", root, {})).toEqual([]);
  });

  it("reads LYTOS_PRIVATE_TERMS, comma separated, trimmed, case-insensitive", () => {
    const root = project();
    const env = { LYTOS_PRIVATE_TERMS: " zebra-corp , Quagga Ltd ,," };
    expect(privateTerms(root, env)).toEqual(["zebra-corp", "Quagga Ltd"]);
    expect(leaksIn("a client called ZEBRA-CORP", root, env)).toHaveLength(1);
    expect(leaksIn("a client called quagga ltd", root, env)).toHaveLength(1);
    expect(leaksIn("a client called nobody", root, env)).toEqual([]);
  });

  it("reads .lytos/private-terms.local, one per line, with comments", () => {
    const root = project("# my clients\nzebra-corp\n\n  Quagga Ltd  \n# done\n");
    expect(privateTerms(root, {})).toEqual(["zebra-corp", "Quagga Ltd"]);
    expect(leaksIn("zebra-corp", root, {})).toHaveLength(1);
  });

  it("merges the file and the variable", () => {
    const root = project("zebra-corp\n");
    expect(privateTerms(root, { LYTOS_PRIVATE_TERMS: "okapi" })).toEqual(["okapi", "zebra-corp"]);
  });

  it("never echoes a private term back: a finding names its category only", () => {
    const root = project();
    const [finding] = leaksIn("zebra-corp", root, { LYTOS_PRIVATE_TERMS: "zebra-corp" });
    expect(finding).not.toContain("zebra-corp");
    expect(finding).toMatch(/private term/);
  });
});
