/**
 * Small readers of markdown documents, shared by the tests of method content.
 *
 * Zero dependencies.
 */

/**
 * A heading and everything under it, up to the next heading of the same or a
 * higher level. Empty when no line matches `heading`.
 */
export function section(doc: string, heading: RegExp): string {
  const lines = doc.split("\n");
  const start = lines.findIndex((l) => heading.test(l));
  if (start < 0) return "";
  const level = lines[start].match(/^#+/)![0].length;
  const end = lines.findIndex(
    (l, i) => i > start && /^#+ /.test(l) && l.match(/^#+/)![0].length <= level
  );
  return lines.slice(start, end < 0 ? undefined : end).join("\n");
}
