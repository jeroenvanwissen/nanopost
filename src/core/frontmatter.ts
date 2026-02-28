import YAML from "yaml";
import type { FrontmatterFieldType, FrontmatterSchema } from "./config";

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

/**
 * Normalizes frontmatter values based on schema types.
 * This ensures proper YAML serialization (e.g., booleans as true/false, not "true"/"false").
 */
export function normalizeFrontmatter(
  frontmatter: Frontmatter,
  schema?: string[] | FrontmatterSchema,
): Frontmatter {
  if (!schema) return frontmatter;

  const normalized: Frontmatter = { ...frontmatter };
  const typeMap: Record<string, FrontmatterFieldType> = {};

  // Build type map from schema
  if (Array.isArray(schema)) {
    // Legacy array format - infer types from values
    for (const key of schema) {
      if (key in normalized) {
        typeMap[key] = inferType(normalized[key]);
      }
    }
  } else {
    // Object format with explicit types
    Object.assign(typeMap, schema);
  }

  // Normalize each field based on its type
  for (const [key, type] of Object.entries(typeMap)) {
    if (!(key in normalized)) continue;
    const value = normalized[key];

    switch (type) {
      case "boolean":
        normalized[key] = coerceBoolean(value);
        break;
      case "number":
        normalized[key] = coerceNumber(value);
        break;
      case "array":
        normalized[key] = coerceArray(value);
        break;
      case "date":
        // Keep dates as strings (they're already formatted)
        normalized[key] = String(value ?? "");
        break;
      case "object":
        // Keep objects as-is
        break;
      case "string":
      default:
        normalized[key] = String(value ?? "");
        break;
    }
  }

  return normalized;
}

function inferType(value: unknown): FrontmatterFieldType {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (Array.isArray(value)) return "array";
  if (value && typeof value === "object") return "object";
  return "string";
}

function coerceBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    return lower === "true" || lower === "yes" || lower === "1";
  }
  return Boolean(value);
}

function coerceNumber(value: unknown): number {
  if (typeof value === "number") return value;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

function coerceArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    // Parse comma-separated values
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/** Serializes frontmatter and body into a Markdown string with YAML delimiters. */
export function toMarkdown(
  frontmatter: Frontmatter,
  body: string,
  schema?: string[] | FrontmatterSchema,
): string {
  const normalized = normalizeFrontmatter(frontmatter, schema);
  const fm = YAML.stringify(normalized).trimEnd();
  const b = body.trimEnd();
  return `---\n${fm}\n---\n\n${b}\n`;
}
