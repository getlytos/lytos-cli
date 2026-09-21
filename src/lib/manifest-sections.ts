/**
 * Manifest section headings and language-dependent placeholder text.
 *
 * Defined once per supported language, so `templates.ts` (what `lyt init`
 * writes) and `linter.ts` (what `lyt lint` requires) read from the same
 * source and cannot silently drift apart — see ISS-0149, where a manifest
 * generated with `language: fr` failed `lyt lint` because the linter only
 * recognized the English headings.
 *
 * Adding a language: extend `MANIFEST_LANGS` and fill in every table below.
 */

export type ManifestLang = "en" | "fr";

export const MANIFEST_LANGS: ManifestLang[] = ["en", "fr"];

export interface ManifestSectionDef {
  /** Stable id, independent of wording. */
  key: string;
  /** English name, used in lint messages (CLI output stays English). */
  name: string;
  heading: Record<ManifestLang, string>;
}

export const MANIFEST_SECTIONS: ManifestSectionDef[] = [
  {
    key: "identity",
    name: "Identity",
    heading: { en: "Identity", fr: "Identité" },
  },
  {
    key: "why",
    name: "Why this project exists",
    heading: {
      en: "Why this project exists",
      fr: "Pourquoi ce projet existe",
    },
  },
  {
    key: "stack",
    name: "Tech stack",
    heading: { en: "Tech stack", fr: "Stack technique" },
  },
];

/** The "Owner" row label in the Identity table. */
export const MANIFEST_OWNER_LABEL: Record<ManifestLang, string> = {
  en: "Owner",
  fr: "Propriétaire",
};

/** Placeholder text left under "Why this project exists" until filled in. */
export const MANIFEST_WHY_PLACEHOLDER: Record<ManifestLang, string> = {
  en: '*3-5 sentences. The "why" of this project.*',
  fr: '*3-5 phrases. Le "pourquoi" de ce projet.*',
};
