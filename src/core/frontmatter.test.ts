import { describe, it, expect } from "vitest";
import { toMarkdown, normalizeFrontmatter } from "./frontmatter";

describe("toMarkdown", () => {
  it("generates frontmatter with title and date", () => {
    const fm = { title: "Hello World", date: "2024-01-15" };
    const result = toMarkdown(fm, "Some body text");

    expect(result).toContain("---");
    expect(result).toContain("title: Hello World");
    expect(result).toContain("date: 2024-01-15");
    expect(result).toContain("Some body text");
  });

  it("includes tags as YAML array", () => {
    const fm = { title: "Post", tags: ["typescript", "cli"] };
    const result = toMarkdown(fm, "body");

    expect(result).toContain("tags:");
    expect(result).toContain("- typescript");
    expect(result).toContain("- cli");
  });

  it("includes custom fields", () => {
    const fm = { title: "Post", published: true, custom: "value" };
    const result = toMarkdown(fm, "body");

    expect(result).toContain("published: true");
    expect(result).toContain("custom: value");
  });

  it("handles empty body", () => {
    const fm = { title: "Empty" };
    const result = toMarkdown(fm, "");

    expect(result).toMatch(/^---\n/);
    expect(result).toMatch(/\n---\n/);
    // Body section should be essentially empty (just a newline)
    expect(result.endsWith("\n")).toBe(true);
  });

  it("produces valid frontmatter delimiters", () => {
    const fm = { title: "Test" };
    const result = toMarkdown(fm, "body");

    const lines = result.split("\n");
    expect(lines[0]).toBe("---");
    // Find the closing delimiter
    const closingIndex = lines.indexOf("---", 1);
    expect(closingIndex).toBeGreaterThan(0);
  });

  it("trims trailing whitespace from body", () => {
    const fm = { title: "Test" };
    const result = toMarkdown(fm, "body with trailing space   \n\n\n");

    expect(result).toContain("body with trailing space");
    // Should not have trailing spaces or extra newlines before final newline
    expect(result.endsWith("body with trailing space\n")).toBe(true);
  });

  it("handles boolean fields correctly with schema", () => {
    const fm = { title: "Post", draft: true };
    const schema = { title: "string" as const, draft: "boolean" as const };
    const result = toMarkdown(fm, "body", schema);

    // Boolean should be rendered as true/false, not "true"/"false"
    expect(result).toContain("draft: true");
    expect(result).not.toContain('draft: "true"');
  });

  it("handles array fields correctly with schema", () => {
    const fm = { title: "Post", categories: ["Website", "Feature"] };
    const schema = { title: "string" as const, categories: "array" as const };
    const result = toMarkdown(fm, "body", schema);

    expect(result).toContain("categories:");
    expect(result).toContain("- Website");
    expect(result).toContain("- Feature");
  });

  it("handles date fields as unquoted strings", () => {
    const fm = { title: "Post", date: "2023-01-01" };
    const schema = { title: "string" as const, date: "date" as const };
    const result = toMarkdown(fm, "body", schema);

    // Date should be unquoted in YAML
    expect(result).toContain("date: 2023-01-01");
  });
});

describe("normalizeFrontmatter", () => {
  it("converts string 'true' to boolean true", () => {
    const fm = { draft: "true" };
    const schema = { draft: "boolean" as const };
    const result = normalizeFrontmatter(fm, schema);

    expect(result.draft).toBe(true);
  });

  it("converts string 'false' to boolean false", () => {
    const fm = { draft: "false" };
    const schema = { draft: "boolean" as const };
    const result = normalizeFrontmatter(fm, schema);

    expect(result.draft).toBe(false);
  });

  it("parses comma-separated string to array", () => {
    const fm = { categories: "Website, Feature" };
    const schema = { categories: "array" as const };
    const result = normalizeFrontmatter(fm, schema);

    expect(result.categories).toEqual(["Website", "Feature"]);
  });

  it("keeps existing arrays as-is", () => {
    const fm = { categories: ["Website", "Feature"] };
    const schema = { categories: "array" as const };
    const result = normalizeFrontmatter(fm, schema);

    expect(result.categories).toEqual(["Website", "Feature"]);
  });

  it("converts string numbers to number type", () => {
    const fm = { count: "42" };
    const schema = { count: "number" as const };
    const result = normalizeFrontmatter(fm, schema);

    expect(result.count).toBe(42);
  });

  it("handles legacy array schema format", () => {
    const fm = { title: "Test", draft: true };
    const schema = ["title", "draft"];
    const result = normalizeFrontmatter(fm, schema);

    expect(result.title).toBe("Test");
    expect(result.draft).toBe(true);
  });
});
