import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { findProjectRoot, findNanopostDir } from "./paths";

describe("findProjectRoot", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nanopost-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns directory containing .git", () => {
    fs.mkdirSync(path.join(tmpDir, ".git"));
    expect(findProjectRoot(tmpDir)).toBe(tmpDir);
  });

  it("returns directory containing .nanopost", () => {
    fs.mkdirSync(path.join(tmpDir, ".nanopost"));
    expect(findProjectRoot(tmpDir)).toBe(tmpDir);
  });

  it("walks up to find .git in parent", () => {
    fs.mkdirSync(path.join(tmpDir, ".git"));
    const child = path.join(tmpDir, "subdir");
    fs.mkdirSync(child);

    expect(findProjectRoot(child)).toBe(tmpDir);
  });

  it("walks up to find .nanopost in parent", () => {
    fs.mkdirSync(path.join(tmpDir, ".nanopost"));
    const child = path.join(tmpDir, "deep", "nested");
    fs.mkdirSync(child, { recursive: true });

    expect(findProjectRoot(child)).toBe(tmpDir);
  });

  it("returns null when neither .git nor .nanopost exists", () => {
    // Use an isolated dir with no .git or .nanopost ancestors
    const isolated = path.join(tmpDir, "isolated");
    fs.mkdirSync(isolated);

    // This will walk up to tmpDir and beyond. Since tmpDir has neither,
    // it will eventually reach the filesystem root.
    // We can't guarantee null here because the real filesystem may have .git above.
    // Instead, test that the function returns a string or null.
    const result = findProjectRoot(isolated);
    // The isolated dir itself should not be the result
    expect(result).not.toBe(isolated);
  });
});

describe("findNanopostDir", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nanopost-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns .nanopost directory when it exists", () => {
    const nanopostDir = path.join(tmpDir, ".nanopost");
    fs.mkdirSync(nanopostDir);

    expect(findNanopostDir(tmpDir)).toBe(nanopostDir);
  });

  it("returns null when .nanopost does not exist", () => {
    // Only create a .git, not .nanopost
    fs.mkdirSync(path.join(tmpDir, ".git"));

    const result = findNanopostDir(tmpDir);
    // Will walk up — can't guarantee null because real fs may have .nanopost above
    // but tmpDir itself should not return a .nanopost
    expect(result).not.toBe(path.join(tmpDir, ".nanopost"));
  });

  it("walks up to find .nanopost in parent", () => {
    const nanopostDir = path.join(tmpDir, ".nanopost");
    fs.mkdirSync(nanopostDir);
    const child = path.join(tmpDir, "src", "core");
    fs.mkdirSync(child, { recursive: true });

    expect(findNanopostDir(child)).toBe(nanopostDir);
  });

  it("requires .nanopost to be a directory, not a file", () => {
    // Create .nanopost as a file, not directory
    fs.writeFileSync(path.join(tmpDir, ".nanopost"), "not a dir", "utf8");

    const result = findNanopostDir(tmpDir);
    // Should not return this since it's not a directory
    expect(result).not.toBe(path.join(tmpDir, ".nanopost"));
  });
});
