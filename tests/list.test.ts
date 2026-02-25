import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { cmdList } from "../src/commands/list";
import { createTestProject, cleanupTestProject } from "./helpers";

const SAMPLE_POSTS = [
  { filename: "2024-01-10-alpha.md", title: "Alpha", body: "First post about cats" },
  { filename: "2024-02-15-beta.md", title: "Beta", body: "Second post about dogs" },
  { filename: "2024-03-20-gamma.md", title: "Gamma", body: "Third post about TypeScript" },
];

describe("list (integration)", () => {
  let tmpDir: string;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    if (tmpDir) cleanupTestProject(tmpDir);
    logSpy.mockRestore();
  });

  it("lists posts sorted newest-first", () => {
    tmpDir = createTestProject({ posts: SAMPLE_POSTS });

    cmdList(tmpDir, {});

    const calls = logSpy.mock.calls.map((c: unknown[]) => c[0]) as string[];
    expect(calls[0]).toBe("2024-03-20  Gamma");
    expect(calls[1]).toBe("2024-02-15  Beta");
    expect(calls[2]).toBe("2024-01-10  Alpha");
  });

  it("respects --limit flag", () => {
    tmpDir = createTestProject({ posts: SAMPLE_POSTS });

    cmdList(tmpDir, { limit: 2 });

    const calls = logSpy.mock.calls.map((c: unknown[]) => c[0]) as string[];
    const postLines = calls.filter((c) => c.match(/^\d{4}-\d{2}-\d{2}/));
    expect(postLines).toHaveLength(2);
    expect(postLines[0]).toBe("2024-03-20  Gamma");
  });

  it("outputs valid JSON with --json", () => {
    tmpDir = createTestProject({ posts: SAMPLE_POSTS });

    cmdList(tmpDir, { json: true });

    const output = logSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(3);
    expect(parsed[0].title).toBe("Gamma");
  });

  it("filters with --grep (case-insensitive)", () => {
    tmpDir = createTestProject({ posts: SAMPLE_POSTS });

    cmdList(tmpDir, { grep: "typescript" });

    const calls = logSpy.mock.calls.map((c: unknown[]) => c[0]) as string[];
    expect(calls).toContain("2024-03-20  Gamma");
    expect(calls).not.toContain("2024-01-10  Alpha");
  });

  it("handles empty content directory", () => {
    tmpDir = createTestProject();

    cmdList(tmpDir, {});

    expect(logSpy).toHaveBeenCalledWith("No posts found.");
  });

  it("handles missing content directory", () => {
    tmpDir = createTestProject();
    fs.rmSync(path.join(tmpDir, "content"), { recursive: true, force: true });

    cmdList(tmpDir, {});

    expect(logSpy).toHaveBeenCalledWith("No posts found.");
  });

  it("combines --grep and --limit", () => {
    tmpDir = createTestProject({
      posts: [
        ...SAMPLE_POSTS,
        { filename: "2024-04-01-delta.md", title: "Delta", body: "Another post about cats" },
      ],
    });

    cmdList(tmpDir, { grep: "cats", limit: 1 });

    const calls = logSpy.mock.calls.map((c: unknown[]) => c[0]) as string[];
    const postLines = calls.filter((c) => c.match(/^\d{4}-\d{2}-\d{2}/));
    expect(postLines).toHaveLength(1);
  });
});
