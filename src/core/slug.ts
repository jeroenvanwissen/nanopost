export function slugify(input: string, maxLen = 60): string {
  const s = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

  const trimmed = s.slice(0, maxLen).replace(/-+$/g, "");
  return trimmed || "note";
}
