import { describe, it, expect } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("converts a simple string to a slug", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("strips diacritics", () => {
    expect(slugify("café résumé")).toBe("cafe-resume");
  });

  it("replaces non-alphanumeric characters with hyphens", () => {
    expect(slugify("foo@bar!baz")).toBe("foo-bar-baz");
  });

  it("collapses consecutive hyphens", () => {
    expect(slugify("a---b---c")).toBe("a-b-c");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("---hello---")).toBe("hello");
  });

  it("truncates to maxLen and removes trailing hyphens", () => {
    const long = "a".repeat(100);
    const result = slugify(long, 10);
    expect(result.length).toBeLessThanOrEqual(10);
    expect(result).toBe("a".repeat(10));
  });

  it("returns 'note' for empty input", () => {
    expect(slugify("")).toBe("note");
  });

  it("returns 'note' for input with only special characters", () => {
    expect(slugify("!!!@@@###")).toBe("note");
  });

  it("handles unicode normalization", () => {
    expect(slugify("naïve")).toBe("naive");
  });

  it("uses default maxLen of 60", () => {
    const long = "a-b-".repeat(30);
    const result = slugify(long);
    expect(result.length).toBeLessThanOrEqual(60);
  });
});
