import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { cmdLast } from "../src/commands/last";
import { createTestProject, cleanupTestProject } from "./helpers";

const SAMPLE_POSTS = [
  { filename: "2024-01-10-alpha.md", title: "Alpha", body: "First post" },
  { filename: "2024-03-20-gamma.md", title: "Gamma", body: "Latest post content" },
];

describe("last (integration)", () => {
  let tmpDir: string;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    if (tmpDir) cleanupTestProject(tmpDir);
    logSpy.mockRestore();
  });

  it("shows the most recent post", () => {
    tmpDir = createTestProject({ posts: SAMPLE_POSTS });

    cmdLast(tmpDir, {});

    const calls = logSpy.mock.calls.map((c: unknown[]) => c[0]) as string[];
    expect(calls[0]).toBe("2024-03-20 \u2014 Gamma");
    expect(calls).toContain("Latest post content");
  });

  it("prints file path with --path", () => {
    tmpDir = createTestProject({ posts: SAMPLE_POSTS });

    cmdLast(tmpDir, { path: true });

    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain("2024-03-20-gamma.md");
    expect(output).toContain(path.join("content", "status"));
  });

  it("outputs valid JSON with --json", () => {
    tmpDir = createTestProject({ posts: SAMPLE_POSTS });

    cmdLast(tmpDir, { json: true });

    const output = logSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.title).toBe("Gamma");
    expect(parsed.date).toBe("2024-03-20");
    expect(parsed.body).toBe("Latest post content");
  });

  it("handles no posts gracefully", () => {
    tmpDir = createTestProject();

    cmdLast(tmpDir, {});

    expect(logSpy).toHaveBeenCalledWith("No posts found.");
  });

  it("fails gracefully when .nanopost is missing", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nanopost-last-integ-"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    cmdLast(tmpDir, {});

    expect(process.exitCode).toBe(1);
    process.exitCode = undefined;
    errorSpy.mockRestore();
  });
});
