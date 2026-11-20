---
id: ISS-0176
title: "Harden the independence settings after the 1.7 review: provider overrides, the config parser, one reader, the guarantee"
type: fix
priority: P1-high
effort: M
complexity: heavy
skill: ""
skills_aux: []
status: 4-review
branch: "fix/ISS-0176-independence-settings-hardening"
depends: []
related: [ISS-0166, ISS-0169]
created: 2026-11-20
schema_version: 2
risk: high
---

# ISS-0176 — Harden the independence settings after the 1.7 review: provider overrides, the config parser, one reader, the guarantee

## Context

The independent review of lytos-cli 1.7 (verdict GO with reserves) found six things in the reviewer-independence work (ISS-0166) and the config reader it introduced. None blocks the release, all are cheap to fix before the tag.

- **F4 — the floor is bypassable through the configuration.** ADR-0010 says the defaults are the floor and a project can only tighten, and that the provider mapping is overridable. The two collide: with `independence.providers: { claude-opus: someoneelse }`, a `claude-sonnet-4` implementation reviewed by `claude-opus-4` at risk high was "level 1, meets it", with no countersignature and no report. `minimum.high: any` in the same file was correctly refused; the provider table was the one setting that could raise the computed level silently.
- **F7 — the guarantee is worded wider than what is delivered.** The ISS-0166 Definition-of-Done item said the rule "cannot be bypassed by editing a field". Lowering `risk: high` to `low` before the first `lyt review --verdict` is not detectable (putting it back afterwards is).
- **F9 — the config parser is quadratic on one long line.** The key/value pattern backtracked: 40,000 spaces inside one line took 2.7 s, and `review`, `report`, `gates` and `doctor` all parse the file.
- **F10 — `__proto__`, `constructor` and `toString` keys were mishandled.** `toString: x` was reported as a duplicate key, and a `__proto__:` block swapped the prototype of the local map.
- **F12 — two readers of `config.yml`.** `design-config.ts` (ISS-0169, a regex) and `config.ts` (ISS-0166) read the same file.
- **F6 — high-risk cards with no `ai_*` fields are now refused until `--countersign`.** The release notes state it; the refusal must also say plainly that a person runs `--countersign`.

## Proposed solution

- **F4.** A configured provider rule that reassigns a model the shipped table already maps to another provider is a *provider override*. It is reported as a problem (so in the packet, `lyt gates` and `lyt doctor`), named in the card's level (`provider override: …`), and kept below risk high; at risk high the minimum is checked against the level the shipped table alone gives, and the override is shown but never counted when it lifts the level. A reassignment that lowers the level stands (it is stricter). New models and models the table does not know are added freely. "Reassigns" is exact, not a heuristic: a configured rule beats a shipped one only when it is at least as long, and then the shipped rule that mapped the model also maps the configured prefix, so one lookup of the prefix in the shipped table decides it (a test checks this over the whole table).
- **F9.** The key/value split is a single pass: the first `:` followed by a space or the end of the line, with the quoted-key form tried first. Same results, linear time.
- **F10.** Every map the reader builds has no prototype, so those keys are ordinary keys. The first line of a file also stops being a base indentation: top-level keys sit in column 0 (an indented first line is reported like any stray indentation), which is what the regex of the design reader already meant. An unknown key inside the `independence:` section is now reported, so a typo or such a key is visible and changes nothing.
- **F12.** `design.ts` and `design-config.ts` read the `design` key through `config.ts`; their exports, their behavior and their tests stay. The independence modules are not restructured.
- **F6.** The refusal says a person must run `--countersign` and that an automated wrapper or agent must never pass it. It suggests no other flag: the wrapper contract (ISS-0177) must name every flag a refusal suggests as a person's decision, and `--ai-model` is not one.
- **F7.** ADR-0010 gets a "Known limits" section (what is guaranteed, what is not), and the ISS-0166 Definition-of-Done item is reworded to say exactly that, its reviewer box left open.

Solution study (risk high: options, cost at 10, 100 and 500 cards, robustness floor):

| Question | Options | Chosen, and why |
|---|---|---|
| F4: what a config may do to the provider table | A. forbid reassigning a shipped model; B. report it, count it below risk high, never count it at risk high; C. let it count if a countersignature is recorded in the config | **B**. A breaks "the mapping is overridable" (a gateway that relabels a model has no way to say so at low risk). C adds a second record to keep in step with the card. B costs one extra computation, only when an override is in play, per card on demand: constant at 10, 100 and 500 cards. It fails visibly (a problem line everywhere the config is read), is idempotent, needs no state, is reversible (delete the line), and cannot reach another card. |
| F9: the long line | A. refuse lines over a few kB with a warning; B. a single-pass split | **B**. A would silently drop legitimate long values; B keeps every result and is linear: 200,000 characters under 100 ms, 500 reads of the file cost the same as 10. |
| F10: the keys | A. `Map`; B. maps with no prototype; C. refuse the keys | **B**. A changes every reader of `ConfigMap`; C makes a valid file fail. B is the smallest change and the keys become ordinary keys. |
| F12: one reader | A. delete `design-config.ts`; B. keep it, read through `config.ts` | **B**. Callers and tests stay; one reader of the file. |

## Ready

- **Scope** — the provider override rule and its reports, the parser's key split and prototype-free maps, the one reader, the refusal wording, ADR-0010 "Known limits" and the ISS-0166 Definition-of-Done item.
- **Constraints** — English only; no new dependency; the defaults stay the floor; every behavior and test of the design reader stays; no restructuring of the independence modules; one commit.
- **Out of scope** — the discovery gate and the other findings of the review (F1, F2, F3, F5, F8, F11), recording the risk when the work starts (named as a limit instead), the release tag and the README.
- **Solution** — option B in each row of the study above.
- `risk: high`.

## Definition of done

- [x] A configured rule that reassigns a model the shipped table maps is reported in the packet, `lyt gates` and `lyt doctor`, the level says `provider override: …`, and at risk high it can never lift a review to level 1 by itself; new and unknown models can still be added; the malicious reassignment of the review is refused at high risk and counted at medium — verify: auto
- [x] The reassignment check is exact over the whole shipped table (every model, prefix and provider tried), covers either side of the pair, normalises case and spaces, and leaves a reassignment that lowers the level standing — verify: auto
- [x] A 200,000-character line parses in under 100 ms for every shape that used to backtrack, and the key/value split keeps its results (pinned cases) — verify: auto
- [x] `__proto__`, `constructor`, `toString`, `hasOwnProperty` and `valueOf` parse as ordinary keys with no spurious duplicate report and no change of what the maps inherit, and in the independence section they are reported as unknown settings — verify: auto
- [x] `design-config.ts` and `design.ts` read the file through `config.ts`, which is the only code that reads `config.yml`; every design test is unchanged and green — verify: auto
- [x] The refusal at high risk says a person must run `--countersign` and an automated wrapper or agent must never pass it, and says nothing of `--countersign` when the project refuses outright — verify: auto
- [x] ADR-0010 has a "Known limits" section (guaranteed and not guaranteed) and changes nothing above it; the ISS-0166 Definition-of-Done item says what is guaranteed and what is not, with its reviewer box still open — verify: auto

## Evidence

Reproduced before the fix, on the 1.7 code: `claude-opus` reassigned to `someoneelse` made `lyt review --verdict go` at risk high exit 0 with no countersignature; `a` followed by 40,000 spaces and `b` took 2.6 s to parse; `toString: x` was reported as a duplicate key and a `__proto__:` block swapped the map's prototype. After the fix: the same `--verdict go` exits 1 (and with `--countersign` records level 3), the 200,000-character lines parse in a few milliseconds, and those keys are ordinary keys.

One difference of behavior, on purpose: a `config.yml` that repeats `design:` now reads the last value (what YAML libraries do), where the regex read the first.
