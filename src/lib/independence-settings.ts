/**
 * Reviewer independence — the project's settings, read from `.lytos/config.yml`
 * (ADR-0010 §2 and §3, ISS-0166).
 *
 *     independence:
 *       ranking: [model-a, model-b]     # exact model ids, WEAKEST first
 *       providers:                      # model-id prefix: provider
 *         claude: anthropic
 *       minimum:                        # per risk: any | fresh-session
 *         low: any                      #           | level-2 | level-1
 *         medium: fresh-session
 *         high: level-2
 *       below_minimum:                  # per risk: warn | countersign | refuse
 *         medium: warn
 *         high: countersign
 *
 * The values above are the DEFAULTS and the FLOOR: a project may tighten them,
 * never loosen them (the rule ADR-0007 sets for the risk matrix, applied here).
 * A looser value is reported and ignored, so a high-risk card can always count
 * on level 3 not producing a `review: go` alone. The same goes for an invalid
 * value and for a risk with no value: the default stays, and the packet,
 * `lyt gates` and `lyt doctor` say so. A config that cannot be read changes
 * nothing. No ranking is shipped: it is a declared order of models, a claim
 * about quality that only the project can make.
 *
 * Pure apart from `loadSettings`, which reads the one file. Zero dependencies.
 */

import type { ConfigMap, ConfigNode, LoadedConfig } from "./config.js";
import { readConfig } from "./config.js";
import {
  normalizeModel,
  reassignmentOf,
  SHIPPED_PROVIDERS,
  type ProviderRule,
} from "./independence-providers.js";
import {
  ACTIONS,
  DEFAULT_BELOW_MINIMUM,
  DEFAULT_MINIMUM,
  MINIMUMS,
  RISKS,
  defaultSettings,
  type BelowAction,
  type ByRisk,
  type IndependenceSettings,
  type Minimum,
} from "./independence-policy.js";
import type { RiskTier } from "./quality.js";

function isRisk(value: string): value is RiskTier {
  return (RISKS as readonly string[]).includes(value);
}

function isSection(node: ConfigNode | undefined): node is ConfigMap {
  return typeof node === "object" && node !== null && !Array.isArray(node);
}

function readRanking(node: ConfigNode | undefined, s: IndependenceSettings) {
  if (node === undefined || node === "") return;
  if (!Array.isArray(node)) {
    s.problems.push(
      "independence.ranking: expected a list of model ids, weakest first — no ranking is in force"
    );
    return;
  }
  const items = node.map(normalizeModel).filter((m) => m.length > 0);
  const twice = items.find((m, i) => items.indexOf(m) !== i);
  if (twice) {
    s.problems.push(
      `independence.ranking: "${twice}" is listed twice, so the order is ambiguous — no ranking is in force`
    );
    return;
  }
  s.ranking = items;
  s.fromConfig.ranking = true;
}

/** A configured rule that moves a model the shipped table maps (ISS-0176, F4). */
function reassignmentProblem(
  rawPrefix: string,
  rule: ProviderRule,
  shipped: ProviderRule
): string {
  return `independence.providers.${rawPrefix}: reassigns the models the shipped table maps to "${shipped.provider}" ("${shipped.prefix}") to "${rule.provider}" — a provider override: it counts below risk high and is flagged, but at risk high the shipped mapping is used`;
}

function readProviders(node: ConfigNode | undefined, s: IndependenceSettings) {
  if (node === undefined || node === "") return;
  if (!isSection(node)) {
    s.problems.push(
      "independence.providers: expected `model-id-prefix: provider` lines — the shipped table is used"
    );
    return;
  }
  const rules: ProviderRule[] = [];
  for (const [rawPrefix, value] of Object.entries(node)) {
    const prefix = normalizeModel(rawPrefix);
    const provider =
      typeof value === "string" ? value.trim().toLowerCase() : "";
    if (
      /^[a-z0-9][a-z0-9._:/-]*$/.test(prefix) &&
      /^[a-z0-9][\w.-]*$/.test(provider)
    ) {
      const rule: ProviderRule = { prefix, provider, origin: "config" };
      const shipped = reassignmentOf(rule);
      if (shipped)
        s.problems.push(reassignmentProblem(rawPrefix, rule, shipped));
      rules.push(rule);
    } else {
      s.problems.push(
        `independence.providers.${rawPrefix}: not a model-id prefix and a provider name — ignored`
      );
    }
  }
  s.providers = [...SHIPPED_PROVIDERS, ...rules];
  s.fromConfig.providers = rules.length;
}

interface ByRiskSpec<T extends string> {
  key: string;
  order: readonly T[];
  defaults: Readonly<ByRisk<T>>;
}

/** A `risk: value` section, tighten-only against its defaults. */
function readByRisk<T extends string>(
  node: ConfigNode | undefined,
  spec: ByRiskSpec<T>,
  out: { values: ByRisk<T>; from: ByRisk<boolean> },
  problems: string[]
): void {
  if (node === undefined || node === "") return;
  if (!isSection(node)) {
    problems.push(
      `independence.${spec.key}: expected \`low\`, \`medium\` and \`high\` lines — the defaults stay`
    );
    return;
  }
  for (const [rawRisk, raw] of Object.entries(node)) {
    const risk = rawRisk.trim().toLowerCase();
    const where = `independence.${spec.key}.${rawRisk}`;
    const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
    if (!isRisk(risk)) {
      problems.push(`${where}: not a risk (low, medium, high) — ignored`);
    } else if (!(spec.order as readonly string[]).includes(value)) {
      problems.push(
        `${where}: "${typeof raw === "string" ? raw : "[nested value]"}" is not one of ${spec.order.join(", ")} — the default (${spec.defaults[risk]}) stays`
      );
    } else if (
      spec.order.indexOf(value as T) < spec.order.indexOf(spec.defaults[risk])
    ) {
      problems.push(
        `${where}: "${value}" is looser than the default (${spec.defaults[risk]}) — ignored: a project may only tighten`
      );
    } else {
      out.values[risk] = value as T;
      out.from[risk] = true;
    }
  }
}

const MINIMUM_SPEC: ByRiskSpec<Minimum> = {
  key: "minimum",
  order: MINIMUMS,
  defaults: DEFAULT_MINIMUM,
};
const BELOW_SPEC: ByRiskSpec<BelowAction> = {
  key: "below_minimum",
  order: ACTIONS,
  defaults: DEFAULT_BELOW_MINIMUM,
};

const SECTION_KEYS = ["ranking", "providers", "minimum", "below_minimum"];

/** The `independence:` section itself, key by key. */
function applySection(section: ConfigMap, s: IndependenceSettings): void {
  for (const key of Object.keys(section)) {
    if (!SECTION_KEYS.includes(key)) {
      s.problems.push(
        `independence.${key}: unknown setting (${SECTION_KEYS.join(", ")}) — ignored`
      );
    }
  }
  readRanking(section.ranking, s);
  readProviders(section.providers, s);
  readByRisk(
    section.minimum,
    MINIMUM_SPEC,
    { values: s.minimum, from: s.fromConfig.minimum },
    s.problems
  );
  readByRisk(
    section.below_minimum,
    BELOW_SPEC,
    { values: s.belowMinimum, from: s.fromConfig.belowMinimum },
    s.problems
  );
}

/**
 * The settings a loaded config produces. Pure: anything wrong is a line in
 * `problems` and the default, never an exception.
 */
export function settingsFromConfig(config: LoadedConfig): IndependenceSettings {
  const s = defaultSettings();
  s.config = { path: ".lytos/config.yml", present: config.present };
  if (config.unreadable) {
    s.problems.push(".lytos/config.yml could not be read — the defaults apply");
  }
  for (const line of config.ignored) {
    s.problems.push(
      `.lytos/config.yml line ${line.line}: ${line.reason} — ignored`
    );
  }
  const section = config.data.independence;
  if (section === undefined || section === "") return s;
  if (!isSection(section)) {
    s.problems.push(
      "independence: expected a section (ranking, providers, minimum, below_minimum) — the defaults apply"
    );
    return s;
  }
  applySection(section, s);
  return s;
}

/** Read `.lytos/config.yml` under `lytosDir` and resolve the settings. */
export function loadSettings(lytosDir: string): IndependenceSettings {
  return settingsFromConfig(readConfig(lytosDir));
}
