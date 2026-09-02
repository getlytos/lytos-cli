/**
 * Unit tests for the Definition of Ready (ADR-0007 §3, ISS-0115).
 */

import { describe, it, expect } from "vitest";
import { analyzeReady } from "../../src/lib/ready.js";
import type { Frontmatter } from "../../src/lib/frontmatter.js";

const DOD_AUTO = "## Definition of done\n\n- [ ] Ship it — verify: auto\n";
const READY_SECTION = "## Ready\n\n- **Out of scope** — the App rendering.\n\n";

/**
 * The existing fixtures describe a *task*: the two-line Ready. Effort is now
 * explicit rather than implied — the form owed depends on it (ISS-0115).
 */
function ready(fm: Frontmatter, body: string) {
  return analyzeReady(`# ISS-0001\n\n${body}`, { effort: "S", ...fm });
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

describe("analyzeReady — scope and constraints, proportionally (ISS-0115)", () => {
  const DOD = "## Definition of done\n\n- [ ] Ship it — verify: auto\n";

  function analyze(fm: Frontmatter, body: string) {
    return analyzeReady(`# ISS-0001\n\n${body}`, fm);
  }

  const TWO_LINE = "## Ready\n\n- **Out of scope** — the App rendering.\n\n";
  const FULL_FORM = `## Ready

- **Scope** — the CLI side only.
- **Constraints** — no new runtime dependency.
- **Out of scope** — the App rendering.

`;

  it("asks a task (effort S) for out-of-scope alone — two lines, not a form", () => {
    const r = analyze({ risk: "low", effort: "S" }, TWO_LINE + DOD);
    expect(r.ready).toBe(true);
  });

  it("asks an M issue for scope and constraints too — the rules said so, nothing checked it", () => {
    const r = analyze({ risk: "low", effort: "M" }, TWO_LINE + DOD);
    expect(r.ready).toBe(false);
    expect(r.missing).toEqual(["no-scope", "no-constraints"]);
  });

  it("accepts an M issue that declares the full form", () => {
    expect(analyze({ risk: "low", effort: "M" }, FULL_FORM + DOD).ready).toBe(true);
  });

  it("asks for the full form when effort is unstated — an unstated field is not a licence to ask less", () => {
    expect(analyze({ risk: "low" }, TWO_LINE + DOD).missing).toContain("no-scope");
  });

  it("rejects a label with no value — the words were there, the boundary was not", () => {
    const bare = "## Ready\n\n- **Out of scope:**\n\n";
    expect(analyze({ risk: "low", effort: "S" }, bare + DOD).missing).toContain("no-out-of-scope");
  });

  it("does not count a passing mention inside a sentence — the label must open the line", () => {
    const prose = "## Ready\n\n- This is all in scope; nothing is out of scope here really.\n\n";
    expect(analyze({ risk: "low", effort: "S" }, prose + DOD).missing).toContain("no-out-of-scope");
  });

  it("keeps reading past a nested heading — being more structured is not being less ready", () => {
    const nested = `## Ready

- **Scope** — the CLI side.

### Boundaries

- **Constraints** — no new runtime dependency.
- **Out of scope** — the App rendering.

`;
    expect(analyze({ risk: "low", effort: "L" }, nested + DOD).ready).toBe(true);
  });

  it("stops at the next section of equal level — a boundary declared elsewhere is not binding", () => {
    const elsewhere = `## Ready

- **Scope** — the CLI side.

## Notes

- **Constraints** — no new runtime dependency.
- **Out of scope** — the App rendering.

`;
    const r = analyze({ risk: "low", effort: "L" }, elsewhere + DOD);
    expect(r.missing).toContain("no-out-of-scope");
    expect(r.missing).toContain("no-constraints");
  });
});
