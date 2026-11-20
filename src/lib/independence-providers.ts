/**
 * Reviewer independence — which provider a model comes from (ADR-0010 §2,
 * ISS-0166).
 *
 * A small table shipped with the CLI maps a model-id prefix to a provider; a
 * project overrides or extends it under `independence.providers` in
 * `.lytos/config.yml`. A model it does not list has an UNKNOWN provider, which
 * the level computation counts as level 3 and flags — never as a different
 * provider. A wrong match could grade a weak review as strong, so matching is
 * deliberately narrow (see `matchesPrefix`) and a miss is the safe side.
 *
 * Pure. Zero dependencies.
 */

export interface ProviderRule {
  /** Lowercase model-id prefix, matched on a boundary (see `matchesPrefix`). */
  prefix: string;
  provider: string;
  origin: "shipped" | "config";
}

/**
 * The shipped model-to-provider table: small on purpose. A project overrides or
 * extends it under `independence.providers` in `.lytos/config.yml`. A model it
 * does not list has an UNKNOWN provider, which counts as level 3.
 */
export const SHIPPED_PROVIDERS: readonly ProviderRule[] = (
  [
    ["claude", "anthropic"],
    ["gpt", "openai"],
    ["chatgpt", "openai"],
    ["o1", "openai"],
    ["o3", "openai"],
    ["o4", "openai"],
    ["gemini", "google"],
    ["gemma", "google"],
    ["mistral", "mistral"],
    ["mixtral", "mistral"],
    ["codestral", "mistral"],
    ["grok", "xai"],
    ["deepseek", "deepseek"],
    ["llama", "meta"],
    ["qwen", "alibaba"],
  ] as const
).map(([prefix, provider]) => ({ prefix, provider, origin: "shipped" }));

/** Case and surrounding space never make two model ids different. */
export function normalizeModel(model: string): string {
  return model.trim().toLowerCase();
}

/**
 * Does `prefix` name the start of `id`? The character after the prefix must not
 * be a letter: `gpt` matches `gpt-5`, `gpt5`, `gpt` — not `gptj` — and `o3`
 * matches `o3-mini`, not `o3rd-party`. A model that fails to match comes back
 * UNKNOWN, which is the safe side; a wrong match could grade a weak review as
 * strong.
 */
export function matchesPrefix(id: string, prefix: string): boolean {
  if (prefix === "" || !id.startsWith(prefix)) return false;
  return id.length === prefix.length || !/[a-z]/.test(id[prefix.length]);
}

/**
 * The provider of a model: the longest matching prefix wins; between two rules
 * of the same length a configured one beats a shipped one.
 */
export function resolveProvider(
  model: string,
  rules: readonly ProviderRule[]
): ProviderRule | null {
  const id = normalizeModel(model);
  let best: ProviderRule | null = null;
  for (const rule of rules) {
    if (!matchesPrefix(id, rule.prefix)) continue;
    const longer = !best || rule.prefix.length > best.prefix.length;
    const sameButConfigured =
      best &&
      rule.prefix.length === best.prefix.length &&
      rule.origin === "config" &&
      best.origin === "shipped";
    if (longer || sameButConfigured) best = rule;
  }
  return best;
}
