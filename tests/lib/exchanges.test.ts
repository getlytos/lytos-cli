/**
 * Unit tests for the design exchange entries (ISS-0169, ADR-0009 §4).
 *
 * An entry is a small file under `.lytos/design/exchanges/<epic>/NNN-<slug>.md`.
 * The index lists the open ones and is derived on every read. What matters here
 * is that a malformed entry is never silently dropped: an open gap that vanished
 * from the index because of a typo would be the worst failure of this feature.
 */

import { describe, it, expect, afterEach } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  EXCHANGE_FROM,
  EXCHANGE_STATUSES,
  EXCHANGE_TYPES,
  MAX_BODY_WORDS,
  parseEntry,
  renderIndex,
} from "../../src/lib/exchanges.js";
import { scanExchanges } from "../../src/lib/exchanges-scan.js";
import { designFromConfig } from "../../src/lib/design.js";

const entry = (fields: Record<string, string> = {}, body = "The mock-up shows a state the data never has."): string => {
  const fm = {
    id: "ISS-0163/001",
    epic: "ISS-0163",
    from: "design",
    type: "gap",
    status: "open",
    ...fields,
  };
  const lines = Object.entries(fm)
    .filter(([, v]) => v !== "")
    .map(([k, v]) => `${k}: ${v}`);
  return `---\n${lines.join("\n")}\n---\n\n${body}\n`;
};

describe("parseEntry — a valid entry", () => {
  it("reads every field, the references and the length of the body", () => {
    const { entry: e, problems } = parseEntry(
      entry({ milestone: "v1.7", refs: "[ISS-0170, ISS-0163/002]" }, "one two three"),
      "ISS-0163",
      "001-empty-state.md"
    );
    expect(problems).toEqual([]);
    expect(e).toEqual({
      id: "ISS-0163/001",
      epic: "ISS-0163",
      milestone: "v1.7",
      from: "design",
      type: "gap",
      status: "open",
      refs: ["ISS-0170", "ISS-0163/002"],
      words: 3,
    });
  });

  it.each(EXCHANGE_TYPES)("accepts the type %s", (type) => {
    expect(parseEntry(entry({ type }), "ISS-0163", "001-x.md").problems).toEqual([]);
  });

  it.each(EXCHANGE_FROM)("accepts from %s", (from) => {
    expect(parseEntry(entry({ from }), "ISS-0163", "001-x.md").problems).toEqual([]);
  });

  it.each(EXCHANGE_STATUSES)("accepts the status %s", (status) => {
    expect(parseEntry(entry({ status }), "ISS-0163", "001-x.md").problems).toEqual([]);
  });

  it("makes milestone and refs optional", () => {
    const { entry: e } = parseEntry(entry(), "ISS-0163", "001-x.md");
    expect(e?.milestone).toBe("");
    expect(e?.refs).toEqual([]);
  });

  it("takes a body of exactly the limit", () => {
    const body = Array.from({ length: MAX_BODY_WORDS }, () => "word").join(" ");
    expect(parseEntry(entry({}, body), "ISS-0163", "001-x.md").problems).toEqual([]);
  });
});

describe("parseEntry — a malformed entry says what is wrong and where", () => {
  const problems = (content: string, fileName = "001-x.md", epic = "ISS-0163") =>
    parseEntry(content, epic, fileName).problems;

  it("refuses a file name that is not NNN-slug.md", () => {
    for (const name of ["1-x.md", "001_x.md", "001-X.md", "001-.md", "x.md", "001-x.markdown"]) {
      expect(problems(entry(), name), name).toEqual([expect.stringMatching(/NNN-slug\.md/)]);
    }
  });

  it("refuses a file with no frontmatter", () => {
    expect(problems("just a note\n")).toEqual([expect.stringMatching(/no frontmatter/)]);
  });

  it.each([
    ["from", "somebody", /from "somebody".*design, code/],
    ["type", "ecart", /type "ecart".*gap, prompt, response, decision/],
    ["status", "opne", /status "opne".*open, resolved/],
  ])("refuses an unknown %s", (field, value, message) => {
    const found = problems(entry({ [field]: value }));
    expect(found).toEqual([expect.stringMatching(message)]);
    expect(parseEntry(entry({ [field]: value }), "ISS-0163", "001-x.md").entry).toBeNull();
  });

  it("refuses a missing field, naming it", () => {
    for (const field of ["id", "epic", "from", "type", "status"]) {
      expect(problems(entry({ [field]: "" })), field).toEqual([expect.stringContaining(`${field}`)]);
    }
  });

  it("refuses an id or an epic that does not match the place of the file", () => {
    expect(problems(entry({ id: "ISS-0163/002" }))).toEqual([expect.stringMatching(/id "ISS-0163\/002" .*ISS-0163\/001/)]);
    expect(problems(entry({ epic: "ISS-0164", id: "ISS-0164/001" }))).toEqual([
      expect.stringMatching(/epic "ISS-0164".*folder ISS-0163/),
      expect.stringMatching(/id "ISS-0164\/001" .*ISS-0163\/001/),
    ]);
  });

  it("refuses refs that is not a list", () => {
    expect(problems(entry({ refs: "ISS-0170" }))).toEqual([expect.stringMatching(/refs must be a list/)]);
  });

  it("keeps an open entry in the index even when its body is too long, and still says so", () => {
    const long = Array.from({ length: MAX_BODY_WORDS + 1 }, () => "word").join(" ");
    const { entry: e, problems: found } = parseEntry(entry({}, long), "ISS-0163", "001-x.md");
    expect(e?.status).toBe("open");
    expect(found).toEqual([expect.stringMatching(/151 words.*150/)]);
  });

  it("refuses an empty body", () => {
    expect(problems(entry({}, ""))).toEqual([expect.stringMatching(/body is empty/)]);
  });
});

describe("scanExchanges and renderIndex — the derived index", () => {
  let root = "";
  afterEach(() => root && rmSync(root, { recursive: true, force: true }));

  function project(files: Record<string, string>): string {
    root = mkdtempSync(join(tmpdir(), "lytos-exchanges-"));
    for (const [path, content] of Object.entries(files)) {
      const full = join(root, ".lytos", "design", "exchanges", path);
      mkdirSync(join(full, ".."), { recursive: true });
      writeFileSync(full, content);
    }
    mkdirSync(join(root, ".lytos"), { recursive: true });
    return join(root, ".lytos");
  }

  it("lists the open entries only and counts the resolved ones", () => {
    const lytos = project({
      "ISS-0163/001-first.md": entry(),
      "ISS-0163/002-second.md": entry({ id: "ISS-0163/002", status: "resolved" }),
      "ISS-0170/001-other.md": entry({ id: "ISS-0170/001", epic: "ISS-0170", from: "code", type: "prompt" }),
    });
    const scan = scanExchanges(lytos);
    expect(scan.open.map((e) => e.id)).toEqual(["ISS-0163/001", "ISS-0170/001"]);
    expect(scan.resolved).toBe(1);
    expect(scan.problems).toEqual([]);
  });

  it("orders by epic then by number, numerically", () => {
    const lytos = project({
      "ISS-0170/010-b.md": entry({ id: "ISS-0170/010", epic: "ISS-0170" }),
      "ISS-0170/002-a.md": entry({ id: "ISS-0170/002", epic: "ISS-0170" }),
      "ISS-0163/001-c.md": entry(),
    });
    expect(scanExchanges(lytos).open.map((e) => e.id)).toEqual(["ISS-0163/001", "ISS-0170/002", "ISS-0170/010"]);
  });

  it("gives each entry's path relative to the project, with forward slashes", () => {
    const lytos = project({ "ISS-0163/001-first.md": entry() });
    expect(scanExchanges(lytos).open[0].file).toBe(".lytos/design/exchanges/ISS-0163/001-first.md");
  });

  it("is empty, not an error, when nothing has been written yet", () => {
    const lytos = project({});
    expect(scanExchanges(lytos)).toEqual({ open: [], resolved: 0, problems: [] });
  });

  it("ignores the guide at the root and files that are not entries", () => {
    const lytos = project({
      "README.md": "# The guide\n",
      "ISS-0163/001-first.md": entry(),
      "ISS-0163/mockup.png": "not text",
    });
    const scan = scanExchanges(lytos);
    expect(scan.open).toHaveLength(1);
    expect(scan.problems).toEqual([]);
  });

  it("reports a malformed entry instead of dropping it, and keeps indexing the others", () => {
    const lytos = project({
      "ISS-0163/001-first.md": entry(),
      "ISS-0163/002-typo.md": entry({ id: "ISS-0163/002", status: "opne" }),
      "ISS-0163/notes.md": "no name rule\n",
      "drafts/001-x.md": entry(),
    });
    const scan = scanExchanges(lytos);
    expect(scan.open.map((e) => e.id)).toEqual(["ISS-0163/001"]);
    expect(scan.problems.map((p) => p.file)).toEqual([
      ".lytos/design/exchanges/ISS-0163/002-typo.md",
      ".lytos/design/exchanges/ISS-0163/notes.md",
      ".lytos/design/exchanges/drafts",
    ]);
    expect(scan.problems[2].message).toMatch(/epic card id/);
  });

  it("reports two files that claim the same number", () => {
    const lytos = project({
      "ISS-0163/001-first.md": entry(),
      "ISS-0163/001-again.md": entry(),
    });
    const scan = scanExchanges(lytos);
    expect(scan.open).toHaveLength(1);
    expect(scan.problems).toEqual([
      { file: ".lytos/design/exchanges/ISS-0163/001-first.md", message: expect.stringMatching(/same id.*001-again\.md/) },
    ]);
  });

  it("never reads through a symbolic link, to a file or to a folder", () => {
    const lytos = project({ "ISS-0163/001-first.md": entry() });
    const outside = join(root, "outside.md");
    writeFileSync(outside, entry({ id: "ISS-0163/009" }));
    symlinkSync(outside, join(lytos, "design", "exchanges", "ISS-0163", "009-link.md"));
    mkdirSync(join(root, "elsewhere"));
    symlinkSync(join(root, "elsewhere"), join(lytos, "design", "exchanges", "ISS-0999"));
    const scan = scanExchanges(lytos);
    expect(scan.open.map((e) => e.id)).toEqual(["ISS-0163/001"]);
    expect(scan.problems.map((p) => p.message)).toEqual([
      expect.stringMatching(/symbolic link/),
      expect.stringMatching(/symbolic link/),
    ]);
  });

  it("never reads through a symbolic link above the entries either: the folder itself, or design/", () => {
    const lytos = project({});
    mkdirSync(join(lytos, "design"), { recursive: true });
    const elsewhere = join(root, "elsewhere", "ISS-0163");
    mkdirSync(elsewhere, { recursive: true });
    writeFileSync(join(elsewhere, "001-outside.md"), entry());
    // The exchanges folder is a link to a folder outside the project.
    symlinkSync(join(root, "elsewhere"), join(lytos, "design", "exchanges"), "dir");
    let scan = scanExchanges(lytos);
    expect(scan.open).toEqual([]);
    expect(scan.problems).toEqual([
      { file: ".lytos/design/exchanges", message: expect.stringMatching(/symbolic link/) },
    ]);
    // A dangling link reads as absent to existsSync: it is still refused.
    rmSync(join(lytos, "design", "exchanges"));
    symlinkSync(join(root, "nowhere"), join(lytos, "design", "exchanges"));
    scan = scanExchanges(lytos);
    expect(scan.problems).toHaveLength(1);
    // The link is higher up: design/ itself.
    rmSync(join(lytos, "design"), { recursive: true });
    symlinkSync(join(root, "elsewhere"), join(lytos, "design"), "dir");
    expect(scanExchanges(lytos).problems).toEqual([
      { file: ".lytos/design", message: expect.stringMatching(/symbolic link/) },
    ]);
  });

  it("renders one line per open entry, and says what it is when there are none", () => {
    const lytos = project({
      "ISS-0163/001-first.md": entry({ milestone: "v1.7" }),
      "ISS-0170/002-other.md": entry({ id: "ISS-0170/002", epic: "ISS-0170", from: "code", type: "prompt" }),
    });
    const lines = renderIndex(scanExchanges(lytos)).split("\n");
    expect(lines).toEqual([
      "Open design exchanges: 2",
      "",
      "  ISS-0163/001  gap     design → code  .lytos/design/exchanges/ISS-0163/001-first.md  (v1.7)",
      "  ISS-0170/002  prompt  code → design  .lytos/design/exchanges/ISS-0170/002-other.md",
    ]);
    expect(renderIndex({ open: [], resolved: 3, problems: [] })).toBe("No open design exchanges (3 resolved).");
    expect(renderIndex({ open: [], resolved: 0, problems: [] })).toBe("No open design exchanges.");
  });
});

describe("designFromConfig — what config.yml says about design", () => {
  it.each([
    ["language: en\ndesign: claude-design\n", "claude-design"],
    ["design: other\n", "other"],
    ["design: none\n", "none"],
    ['design: "claude-design"\n', "claude-design"],
    ["design: claude-design # we use it\n", "claude-design"],
  ])("%j -> %s", (text, expected) => {
    expect(designFromConfig(text)).toBe(expected);
  });

  it("is none when the key is absent, empty or unknown — never an error", () => {
    for (const text of ["", "language: en\n", "design:\n", "design: figma\n", "# design: claude-design\n", "  design: claude-design\n"]) {
      expect(designFromConfig(text), JSON.stringify(text)).toBe("none");
    }
  });
});

describe("parseEntry — the body starts where the parser closes the frontmatter (ISS-0180)", () => {
  it("counts no word of the frontmatter as body when the closing line has text after the dashes", () => {
    const text = "---\nid: ISS-0163/001\nepic: ISS-0163\nfrom: design\ntype: gap\nstatus: open\n--- closed here\n";
    const { problems } = parseEntry(text, "ISS-0163", "001-x.md");
    expect(problems).toEqual(["body is empty: say the point of the entry in a few lines"]);
  });

  it("keeps a --- rule of the body in the body, and counts what follows it", () => {
    const body = "First point.\n\n---\n\nSecond point.";
    const { entry: e, problems } = parseEntry(entry({}, body), "ISS-0163", "001-x.md");
    expect(problems).toEqual([]);
    expect(e?.words).toBe(5);
  });
});
