import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { scanPosts } from "./posts";
import { parseFrontmatter } from "./frontmatter";

describe("parseFrontmatter", () => {
  it("parses valid frontmatter with title and date", () => {
    const content = "---\ntitle: Hello World\ndate: 2024-01-15\n---\n\nSome body text";
    const { frontmatter, body: parsedBody } = parseFrontmatter(content);

    expect(frontmatter.title).toBe("Hello World");
    expect(parsedBody).toBe("Some body text");
  });

  it("returns empty frontmatter when no delimiters", () => {
    const content = "Just plain text";
    const { frontmatter, body } = parseFrontmatter(content);

    expect(frontmatter).toEqual({});
    expect(body).toBe("Just plain text");
  });

  it("returns empty frontmatter when only opening delimiter", () => {
    const content = "---\ntitle: Hello\nNo closing delimiter";
    const { frontmatter } = parseFrontmatter(content);

    expect(frontmatter).toEqual({});
  });

  it("parses tags as array", () => {
    const content = "---\ntitle: Post\ntags:\n  - typescript\n  - cli\n---\n\nbody";
    const { frontmatter } = parseFrontmatter(content);

    expect(frontmatter.tags).toEqual(["typescript", "cli"]);
  });

  it("handles empty body after frontmatter", () => {
    const content = "---\ntitle: Empty\n---\n";
    const { frontmatter, body } = parseFrontmatter(content);

    expect(frontmatter.title).toBe("Empty");
    expect(body).toBe("");
  });
});

describe("scanPosts", () => {
  let tmpDir: string;
  let contentDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nanopost-posts-test-"));
    contentDir = path.join(tmpDir, "content", "posts");
    fs.mkdirSync(contentDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns empty array for empty directory", () => {
    const posts = scanPosts(contentDir);
    expect(posts).toEqual([]);
  });

  it("returns empty array for non-existent directory", () => {
    const posts = scanPosts(path.join(tmpDir, "nonexistent"));
    expect(posts).toEqual([]);
  });

  it("scans posts with frontmatter", () => {
    fs.writeFileSync(
      path.join(contentDir, "2024-01-15-hello-world.md"),
      "---\ntitle: Hello World\ndate: 2024-01-15\n---\n\nBody text",
      "utf8",
    );

    const posts = scanPosts(contentDir);
    expect(posts).toHaveLength(1);
    expect(posts[0].title).toBe("Hello World");
    expect(posts[0].date).toBe("2024-01-15");
    expect(posts[0].body).toBe("Body text");
  });

  it("sorts posts by date newest first", () => {
    fs.writeFileSync(
      path.join(contentDir, "2024-01-10-older.md"),
      "---\ntitle: Older Post\n---\n\nOld",
      "utf8",
    );
    fs.writeFileSync(
      path.join(contentDir, "2024-03-20-newer.md"),
      "---\ntitle: Newer Post\n---\n\nNew",
      "utf8",
    );
    fs.writeFileSync(
      path.join(contentDir, "2024-02-15-middle.md"),
      "---\ntitle: Middle Post\n---\n\nMid",
      "utf8",
    );

    const posts = scanPosts(contentDir);
    expect(posts).toHaveLength(3);
    expect(posts[0].date).toBe("2024-03-20");
    expect(posts[1].date).toBe("2024-02-15");
    expect(posts[2].date).toBe("2024-01-10");
  });

  it("derives title from filename when frontmatter has no title", () => {
    fs.writeFileSync(
      path.join(contentDir, "2024-01-15-my-great-post.md"),
      "---\ntype: note\n---\n\nBody",
      "utf8",
    );

    const posts = scanPosts(contentDir);
    expect(posts[0].title).toBe("my great post");
  });

  it("extracts date from filename prefix", () => {
    fs.writeFileSync(
      path.join(contentDir, "2024-06-01-test.md"),
      "---\ntitle: Test\n---\n\nbody",
      "utf8",
    );

    const posts = scanPosts(contentDir);
    expect(posts[0].date).toBe("2024-06-01");
  });

  it("ignores non-markdown files", () => {
    fs.writeFileSync(path.join(contentDir, "notes.txt"), "not markdown", "utf8");
    fs.writeFileSync(
      path.join(contentDir, "2024-01-15-post.md"),
      "---\ntitle: Post\n---\n\nbody",
      "utf8",
    );

    const posts = scanPosts(contentDir);
    expect(posts).toHaveLength(1);
  });
});
