import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { cmdList } from "./list";

function createTmpProject(): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nanopost-list-test-"));
  const nanopostDir = path.join(tmpDir, ".nanopost");
  fs.mkdirSync(nanopostDir, { recursive: true });
  fs.writeFileSync(
    path.join(nanopostDir, "config.json"),
    JSON.stringify({
      defaultType: "default",
      postTypes: {
        default: {
          contentDir: "content/posts",
        },
      },
    }),
    "utf8",
  );
  const contentDir = path.join(tmpDir, "content", "posts");
  fs.mkdirSync(contentDir, { recursive: true });
  return tmpDir;
}

function writePost(tmpDir: string, filename: string, title: string, body: string): void {
  const contentDir = path.join(tmpDir, "content", "posts");
  fs.writeFileSync(path.join(contentDir, filename), `---\ntitle: ${title}\n---\n\n${body}`, "utf8");
}

describe("cmdList", () => {
  let tmpDir: string;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = createTmpProject();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    consoleSpy.mockRestore();
  });

  it("lists posts sorted by date newest first", () => {
    writePost(tmpDir, "2024-01-10-old.md", "Old Post", "old");
    writePost(tmpDir, "2024-03-20-new.md", "New Post", "new");

    cmdList(tmpDir, {});

    expect(consoleSpy).toHaveBeenCalledWith("2024-03-20  New Post");
    expect(consoleSpy).toHaveBeenCalledWith("2024-01-10  Old Post");
    // Newest should be first
    const calls = consoleSpy.mock.calls.map((c: unknown[]) => c[0]);
    const newIdx = calls.indexOf("2024-03-20  New Post");
    const oldIdx = calls.indexOf("2024-01-10  Old Post");
    expect(newIdx).toBeLessThan(oldIdx);
  });

  it("respects --limit flag", () => {
    writePost(tmpDir, "2024-01-10-a.md", "Post A", "a");
    writePost(tmpDir, "2024-02-10-b.md", "Post B", "b");
    writePost(tmpDir, "2024-03-10-c.md", "Post C", "c");

    cmdList(tmpDir, { limit: 2 });

    const calls = consoleSpy.mock.calls.map((c: unknown[]) => c[0]) as string[];
    const postLines = calls.filter((c) => c.match(/^\d{4}-\d{2}-\d{2}/));
    expect(postLines).toHaveLength(2);
  });

  it("outputs valid JSON with --json", () => {
    writePost(tmpDir, "2024-01-15-hello.md", "Hello", "world");

    cmdList(tmpDir, { json: true });

    const output = consoleSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe("Hello");
  });

  it("filters posts with --grep", () => {
    writePost(tmpDir, "2024-01-10-alpha.md", "Alpha Post", "content about cats");
    writePost(tmpDir, "2024-02-10-beta.md", "Beta Post", "content about dogs");

    cmdList(tmpDir, { grep: "cats" });

    const calls = consoleSpy.mock.calls.map((c: unknown[]) => c[0]) as string[];
    expect(calls).toContain("2024-01-10  Alpha Post");
    expect(calls).not.toContain("2024-02-10  Beta Post");
  });

  it("grep is case-insensitive", () => {
    writePost(tmpDir, "2024-01-10-alpha.md", "Alpha Post", "TypeScript");

    cmdList(tmpDir, { grep: "typescript" });

    const calls = consoleSpy.mock.calls.map((c: unknown[]) => c[0]) as string[];
    expect(calls).toContain("2024-01-10  Alpha Post");
  });

  it("handles empty content directory gracefully", () => {
    cmdList(tmpDir, {});

    expect(consoleSpy).toHaveBeenCalledWith("No posts found.");
  });

  it("handles missing content directory gracefully", () => {
    // Remove the content directory
    fs.rmSync(path.join(tmpDir, "content"), { recursive: true, force: true });

    cmdList(tmpDir, {});

    expect(consoleSpy).toHaveBeenCalledWith("No posts found.");
  });
});
