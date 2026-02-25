import YAML from "yaml";

export type Frontmatter = Record<string, unknown>;

/** Parses a Markdown file's YAML frontmatter and body. */
export function parseFrontmatter(content: string): { frontmatter: Frontmatter; body: string } {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith("---")) {
    return { frontmatter: {}, body: content.trim() };
  }

  const end = trimmed.indexOf("\n---", 3);
  if (end === -1) {
    return { frontmatter: {}, body: content.trim() };
  }

  const yamlBlock = trimmed.slice(4, end);
  const body = trimmed.slice(end + 4).trim();
  const parsed = YAML.parse(yamlBlock);
  const frontmatter = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};

  return { frontmatter: frontmatter as Frontmatter, body };
}

/** Serializes frontmatter and body into a Markdown string with YAML delimiters. */
export function toMarkdown(frontmatter: Frontmatter, body: string): string {
  const fm = YAML.stringify(frontmatter).trimEnd();
  const b = body.trimEnd();
  return `---\n${fm}\n---\n\n${b}\n`;
}
