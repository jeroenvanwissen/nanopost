import { describe, it, expect } from "vitest";
import { slugify, formatFilename } from "./slug";

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

describe("formatFilename", () => {
  it("formats filename with date and title variables", () => {
    const result = formatFilename("{date}-{title}", {
      date: "2023-01-01",
      title: "New Website",
      slug: "new-website",
    });
    expect(result).toBe("2023-01-01-new-website");
  });

  it("formats filename with date and slug variables", () => {
    const result = formatFilename("{date}-{slug}", {
      date: "2023-01-01",
      title: "New Website",
      slug: "new-website",
    });
    expect(result).toBe("2023-01-01-new-website");
  });

  it("slugifies title variable", () => {
    const result = formatFilename("{date}-{title}", {
      date: "2023-01-01",
      title: "Hello World!",
      slug: "hello-world",
    });
    expect(result).toBe("2023-01-01-hello-world");
  });

  it("respects maxSlugLength for title", () => {
    const longTitle = "a".repeat(100);
    const result = formatFilename(
      "{date}-{title}",
      { date: "2023-01-01", title: longTitle, slug: longTitle },
      10,
    );
    expect(result).toBe("2023-01-01-aaaaaaaaaa");
  });

  it("supports custom variables", () => {
    const result = formatFilename("{date}-{type}-{title}", {
      date: "2023-01-01",
      title: "Post",
      slug: "post",
      type: "devlog",
    });
    expect(result).toBe("2023-01-01-devlog-post");
  });

  it("handles templates without variables", () => {
    const result = formatFilename("static-filename", {
      date: "2023-01-01",
      title: "Post",
      slug: "post",
    });
    expect(result).toBe("static-filename");
  });

  it("handles multiple instances of same variable", () => {
    const result = formatFilename("{date}/{date}-{title}", {
      date: "2023-01-01",
      title: "Post",
      slug: "post",
    });
    expect(result).toBe("2023-01-01/2023-01-01-post");
  });
});
