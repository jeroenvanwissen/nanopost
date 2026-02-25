import { describe, it, expect } from "vitest";
import { toMarkdown } from "./frontmatter";

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
    const fm = { title: "Post", status: "draft", custom: "value" };
    const result = toMarkdown(fm, "body");

    expect(result).toContain("status: draft");
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
});
