import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { cmdLast } from "./last";

function createTmpProject(): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nanopost-last-test-"));
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

describe("cmdLast", () => {
  let tmpDir: string;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = createTmpProject();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    logSpy.mockRestore();
  });

  it("shows the most recent post with date, title, and body", () => {
    writePost(tmpDir, "2024-01-10-old.md", "Old Post", "old body");
    writePost(tmpDir, "2024-03-20-new.md", "New Post", "new body");

    cmdLast(tmpDir, {});

    const calls = logSpy.mock.calls.map((c: unknown[]) => c[0]);
    expect(calls[0]).toBe("2024-03-20 \u2014 New Post");
    expect(calls).toContain("new body");
  });

  it("prints only the file path with --path", () => {
    writePost(tmpDir, "2024-01-15-hello.md", "Hello", "world");

    cmdLast(tmpDir, { path: true });

    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain("2024-01-15-hello.md");
    expect(output).toContain(path.join("content", "posts"));
  });

  it("outputs valid JSON with --json", () => {
    writePost(tmpDir, "2024-01-15-hello.md", "Hello", "world");

    cmdLast(tmpDir, { json: true });

    const output = logSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.title).toBe("Hello");
    expect(parsed.date).toBe("2024-01-15");
    expect(parsed.body).toBe("world");
  });

  it("handles no posts gracefully", () => {
    cmdLast(tmpDir, {});

    expect(logSpy).toHaveBeenCalledWith("No posts found.");
  });

  it("shows post without body when body is empty", () => {
    writePost(tmpDir, "2024-01-15-empty.md", "Empty", "");

    cmdLast(tmpDir, {});

    const calls = logSpy.mock.calls.map((c: unknown[]) => c[0]);
    expect(calls[0]).toBe("2024-01-15 \u2014 Empty");
    // Should not print extra blank lines for empty body
    expect(calls).toHaveLength(1);
  });
});
