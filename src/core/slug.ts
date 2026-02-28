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

/**
 * Formats a filename using a template string with variables.
 * Supported variables: {date}, {title}, {slug}, and any frontmatter field
 * Example: "{date}-{title}" -> "2023-01-01-my-post"
 */
export function formatFilename(
  template: string,
  variables: Record<string, string>,
  maxSlugLength = 60,
): string {
  let result = template;

  // Replace variables in the template
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    if (result.includes(placeholder)) {
      // Slugify the value if it's title or slug
      const processedValue =
        key === "title" || key === "slug" ? slugify(value, maxSlugLength) : value;
      result = result.replace(new RegExp(`\\{${key}\\}`, "g"), processedValue);
    }
  }

  return result;
}
