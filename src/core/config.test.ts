import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readConfig, writeConfig, validateConfig, deepMerge, DEFAULT_CONFIG } from "./config";

describe("readConfig", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nanopost-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns DEFAULT_CONFIG when no config file exists", () => {
    const result = readConfig(tmpDir);
    expect(result).toEqual(DEFAULT_CONFIG);
  });

  it("merges valid config over defaults", () => {
    const customConfig = { contentDir: "posts" };
    fs.writeFileSync(path.join(tmpDir, "config.json"), JSON.stringify(customConfig), "utf8");

    const result = readConfig(tmpDir);
    expect(result.contentDir).toBe("posts");
    // Defaults still present for unset fields
    expect(result.editor).toBe(DEFAULT_CONFIG.editor);
    expect(result.filename).toEqual(DEFAULT_CONFIG.filename);
  });

  it("deep merges nested fields", () => {
    const customConfig = { filename: { maxSlugLength: 30 } };
    fs.writeFileSync(path.join(tmpDir, "config.json"), JSON.stringify(customConfig), "utf8");

    const result = readConfig(tmpDir);
    expect(result.filename?.maxSlugLength).toBe(30);
    // Other nested defaults preserved
    expect(result.filename?.format).toBe("date-slug");
  });

  it("throws on invalid JSON with clear message", () => {
    fs.writeFileSync(path.join(tmpDir, "config.json"), "{broken json", "utf8");

    expect(() => readConfig(tmpDir)).toThrow("config.json is not valid JSON");
  });

  it("throws when contentDir is not a string", () => {
    fs.writeFileSync(path.join(tmpDir, "config.json"), JSON.stringify({ contentDir: 42 }), "utf8");

    expect(() => readConfig(tmpDir)).toThrow("contentDir must be a non-empty string");
  });

  it("throws when contentDir is empty string", () => {
    fs.writeFileSync(path.join(tmpDir, "config.json"), JSON.stringify({ contentDir: "" }), "utf8");

    expect(() => readConfig(tmpDir)).toThrow("contentDir must be a non-empty string");
  });

  it("accepts minimal valid config", () => {
    fs.writeFileSync(
      path.join(tmpDir, "config.json"),
      JSON.stringify({ contentDir: "my-posts" }),
      "utf8",
    );

    const result = readConfig(tmpDir);
    expect(result.contentDir).toBe("my-posts");
  });
});

describe("validateConfig", () => {
  it("throws when root is not an object", () => {
    expect(() => validateConfig("string")).toThrow("root must be an object");
    expect(() => validateConfig(42)).toThrow("root must be an object");
    expect(() => validateConfig(null)).toThrow("root must be an object");
    expect(() => validateConfig([])).toThrow("root must be an object");
  });

  it("accepts an empty object", () => {
    expect(() => validateConfig({})).not.toThrow();
  });

  it("throws when editor is not a string", () => {
    expect(() => validateConfig({ editor: 123 })).toThrow("editor must be a string");
  });

  it("throws when filename is not an object", () => {
    expect(() => validateConfig({ filename: "bad" })).toThrow("filename must be an object");
  });

  it("throws when filename.maxSlugLength is not a positive number", () => {
    expect(() => validateConfig({ filename: { maxSlugLength: -5 } })).toThrow(
      "filename.maxSlugLength must be a positive number",
    );
    expect(() => validateConfig({ filename: { maxSlugLength: 0 } })).toThrow(
      "filename.maxSlugLength must be a positive number",
    );
    expect(() => validateConfig({ filename: { maxSlugLength: "ten" } })).toThrow(
      "filename.maxSlugLength must be a positive number",
    );
  });

  it("throws when plugins is not an array", () => {
    expect(() => validateConfig({ plugins: "bad" })).toThrow("plugins must be an array");
  });

  it("throws when a plugin is missing a name", () => {
    expect(() => validateConfig({ plugins: [{ enabled: true }] })).toThrow(
      'plugins[0] must have a "name" string',
    );
  });

  it("accepts valid plugins array", () => {
    expect(() =>
      validateConfig({ plugins: [{ name: "test-plugin", enabled: true }] }),
    ).not.toThrow();
  });
});

describe("writeConfig", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nanopost-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("writes config and readConfig round-trips it", () => {
    const config = { ...DEFAULT_CONFIG, contentDir: "my-notes" };
    writeConfig(tmpDir, config);

    const result = readConfig(tmpDir);
    expect(result.contentDir).toBe("my-notes");
    expect(result.editor).toBe(DEFAULT_CONFIG.editor);
  });

  it("writes valid JSON to disk", () => {
    writeConfig(tmpDir, DEFAULT_CONFIG);

    const raw = fs.readFileSync(path.join(tmpDir, "config.json"), "utf8");
    expect(() => JSON.parse(raw)).not.toThrow();
  });
});

describe("deepMerge", () => {
  it("merges flat objects", () => {
    const base = { a: 1, b: 2 };
    const override = { b: 3, c: 4 };
    expect(deepMerge(base, override)).toEqual({ a: 1, b: 3, c: 4 });
  });

  it("deep merges nested objects", () => {
    const base = { nested: { x: 1, y: 2 } };
    const override = { nested: { y: 3 } };
    expect(deepMerge(base, override)).toEqual({ nested: { x: 1, y: 3 } });
  });

  it("overrides arrays instead of merging them", () => {
    const base = { tags: ["a", "b"] };
    const override = { tags: ["c"] };
    expect(deepMerge(base, override)).toEqual({ tags: ["c"] });
  });

  it("returns base when override has no matching keys", () => {
    const base = { a: 1 };
    const override = { b: 2 };
    expect(deepMerge(base, override)).toEqual({ a: 1, b: 2 });
  });
});
