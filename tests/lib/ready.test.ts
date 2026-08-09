/**
 * Unit tests for the Definition of Ready (ADR-0007 §3, ISS-0115).
 */

import { describe, it, expect } from "vitest";
import { analyzeReady } from "../../src/lib/ready.js";
import type { Frontmatter } from "../../src/lib/frontmatter.js";

const DOD_AUTO = "## Definition of done\n\n- [ ] Ship it — verify: auto\n";
const OUT_OF_SCOPE = "\n## Notes\n\nOut of scope: the App rendering.\n";

function ready(fm: Frontmatter, body: string) {
  return analyzeReady(`# ISS-0001\n\n${body}`, fm);
}

describe("analyzeReady", () => {
  it("is ready with risk set, a testable DoD and a declared out-of-scope", () => {
    const r = ready({ risk: "low" }, DOD_AUTO + OUT_OF_SCOPE);
    expect(r.ready).toBe(true);
    expect(r.missing).toEqual([]);
  });

  it("flags a missing risk field (not defaulted to medium here)", () => {
    const r = ready({}, DOD_AUTO + OUT_OF_SCOPE);
    expect(r.ready).toBe(false);
    expect(r.missing).toContain("risk-unset");
  });

  it("flags an invalid risk value", () => {
    expect(ready({ risk: "urgent" }, DOD_AUTO + OUT_OF_SCOPE).missing).toContain("risk-unset");
  });

  it("flags a non-machine-verifiable DoD", () => {
    const r = ready({ risk: "high" }, "## Definition of done\n\n- [ ] Looks right — verify: human\n" + OUT_OF_SCOPE);
    expect(r.missing).toContain("dod-not-testable");
  });

  it("flags a missing out-of-scope", () => {
    expect(ready({ risk: "medium" }, DOD_AUTO).missing).toContain("no-out-of-scope");
  });

  it("recognizes the French 'hors-scope' phrasing", () => {
    const r = ready({ risk: "medium" }, DOD_AUTO + "\nHors-scope : le rendu App.\n");
    expect(r.missing).not.toContain("no-out-of-scope");
  });
});
