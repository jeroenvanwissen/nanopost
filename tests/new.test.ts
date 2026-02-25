import { describe, it, expect, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { cmdNew } from "../src/commands/new";
import { createTestProject, cleanupTestProject } from "./helpers";
import * as input from "../src/core/input";

describe("new (integration)", () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) cleanupTestProject(tmpDir);
    vi.restoreAllMocks();
  });

  it("creates a markdown file with inline text", async () => {
    tmpDir = createTestProject();
    vi.spyOn(input, "hasPipedStdin").mockReturnValue(false);

    await cmdNew(tmpDir, ["Hello", "world"], { noPublish: true });

    const contentDir = path.join(tmpDir, "content", "status");
    const files = fs.readdirSync(contentDir).filter((f) => f.endsWith(".md"));
    expect(files.length).toBe(1);

    const content = fs.readFileSync(path.join(contentDir, files[0]), "utf8");
    expect(content).toContain("Hello world");
  });

  it("respects --title override", async () => {
    tmpDir = createTestProject();
    vi.spyOn(input, "hasPipedStdin").mockReturnValue(false);

    await cmdNew(tmpDir, ["some body text"], { title: "Custom Title", noPublish: true });

    const contentDir = path.join(tmpDir, "content", "status");
    const files = fs.readdirSync(contentDir).filter((f) => f.endsWith(".md"));
    expect(files.length).toBe(1);
    expect(files[0]).toContain("custom-title");

    const content = fs.readFileSync(path.join(contentDir, files[0]), "utf8");
    expect(content).toContain("title: Custom Title");
  });

  it("respects --tags flag", async () => {
    tmpDir = createTestProject();
    vi.spyOn(input, "hasPipedStdin").mockReturnValue(false);

    await cmdNew(tmpDir, ["tagged post"], { tags: "typescript,cli", noPublish: true });

    const contentDir = path.join(tmpDir, "content", "status");
    const files = fs.readdirSync(contentDir).filter((f) => f.endsWith(".md"));
    const content = fs.readFileSync(path.join(contentDir, files[0]), "utf8");
    expect(content).toContain("- typescript");
    expect(content).toContain("- cli");
  });

  it("prints to stdout with --dry-run without creating file", async () => {
    tmpDir = createTestProject();
    vi.spyOn(input, "hasPipedStdin").mockReturnValue(false);
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    await cmdNew(tmpDir, ["dry run test"], { dryRun: true, noPublish: true });

    const contentDir = path.join(tmpDir, "content", "status");
    const files = fs.readdirSync(contentDir).filter((f) => f.endsWith(".md"));
    expect(files.length).toBe(0);

    const output = writeSpy.mock.calls.map((c: unknown[]) => String(c[0])).join("");
    expect(output).toContain("dry run test");
  });

  it("fails gracefully when .nanopost is missing", async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nanopost-new-test-"));
    vi.spyOn(input, "hasPipedStdin").mockReturnValue(false);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await cmdNew(tmpDir, ["no project"], {});

    expect(process.exitCode).toBe(1);
    process.exitCode = undefined;
    errorSpy.mockRestore();
  });
});
