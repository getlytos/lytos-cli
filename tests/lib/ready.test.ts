/**
 * Unit tests for the Definition of Ready (ADR-0007 §3, ISS-0115).
 */

import { describe, it, expect } from "vitest";
import { analyzeReady } from "../../src/lib/ready.js";
import type { Frontmatter } from "../../src/lib/frontmatter.js";

const DOD_AUTO = "## Definition of done\n\n- [ ] Ship it — verify: auto\n";
const READY_SECTION = "## Ready\n\n- **Out of scope** — the App rendering.\n\n";

function ready(fm: Frontmatter, body: string) {
  return analyzeReady(`# ISS-0001\n\n${body}`, fm);
}

describe("analyzeReady", () => {
  it("is ready with risk set, a testable DoD and a declared out-of-scope", () => {
    const r = ready({ risk: "low" }, READY_SECTION + DOD_AUTO);
    expect(r.ready).toBe(true);
    expect(r.missing).toEqual([]);
  });

  it("flags a missing risk field (not defaulted to medium here)", () => {
    const r = ready({}, READY_SECTION + DOD_AUTO);
    expect(r.ready).toBe(false);
    expect(r.missing).toContain("risk-unset");
  });

  it("flags an invalid risk value", () => {
    expect(ready({ risk: "urgent" }, READY_SECTION + DOD_AUTO).missing).toContain("risk-unset");
  });

  it("flags a non-machine-verifiable DoD", () => {
    const r = ready({ risk: "high" }, READY_SECTION + "## Definition of done\n\n- [ ] Looks right — verify: human\n");
    expect(r.missing).toContain("dod-not-testable");
  });

  it("flags a missing out-of-scope", () => {
    expect(ready({ risk: "medium" }, DOD_AUTO).missing).toContain("no-out-of-scope");
  });

  it("does not accept an out-of-scope mentioned outside the Ready section", () => {
    // The ISS-0115 audit defect: any occurrence anywhere in the fiche counted, so a
    // note or a context paragraph made an issue artificially ready.
    const stray = DOD_AUTO + "\n## Notes\n\nOut of scope: the App rendering.\n";
    expect(ready({ risk: "low" }, stray).missing).toContain("no-out-of-scope");
  });

  it("ignores a Ready section that declares no boundary", () => {
    const empty = "## Ready\n\n- **Scope** — ship the thing.\n\n" + DOD_AUTO;
    expect(ready({ risk: "low" }, empty).missing).toContain("no-out-of-scope");
  });

  it("recognizes the French 'hors-scope' phrasing", () => {
    const r = ready({ risk: "medium" }, "## Ready\n\nHors-scope : le rendu App.\n\n" + DOD_AUTO);
    expect(r.missing).not.toContain("no-out-of-scope");
  });
});
