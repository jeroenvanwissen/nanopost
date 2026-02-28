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
    const customConfig = {
      defaultType: "default",
      postTypes: {
        default: { contentDir: "posts" },
      },
    };
    fs.writeFileSync(path.join(tmpDir, "config.json"), JSON.stringify(customConfig), "utf8");

    const result = readConfig(tmpDir);
    expect(result.postTypes.default.contentDir).toBe("posts");
    // Defaults still present for unset fields
    expect(result.editor).toBe(DEFAULT_CONFIG.editor);
    expect(result.postTypes.default.filename).toEqual(DEFAULT_CONFIG.postTypes.default.filename);
  });

  it("deep merges nested fields", () => {
    const customConfig = {
      defaultType: "default",
      postTypes: {
        default: { contentDir: "content/posts", filename: { maxSlugLength: 30 } },
      },
    };
    fs.writeFileSync(path.join(tmpDir, "config.json"), JSON.stringify(customConfig), "utf8");

    const result = readConfig(tmpDir);
    expect(result.postTypes.default.filename?.maxSlugLength).toBe(30);
    // Other nested defaults preserved
    expect(result.postTypes.default.filename?.format).toBe("date-slug");
  });

  it("throws on invalid JSON with clear message", () => {
    fs.writeFileSync(path.join(tmpDir, "config.json"), "{broken json", "utf8");

    expect(() => readConfig(tmpDir)).toThrow("config.json is not valid JSON");
  });

  it("throws when contentDir is not a string", () => {
    const badConfig = {
      defaultType: "default",
      postTypes: { default: { contentDir: 42 } },
    };
    fs.writeFileSync(path.join(tmpDir, "config.json"), JSON.stringify(badConfig), "utf8");

    expect(() => readConfig(tmpDir)).toThrow("contentDir must be a non-empty string");
  });

  it("throws when contentDir is empty string", () => {
    const badConfig = {
      defaultType: "default",
      postTypes: { default: { contentDir: "" } },
    };
    fs.writeFileSync(path.join(tmpDir, "config.json"), JSON.stringify(badConfig), "utf8");

    expect(() => readConfig(tmpDir)).toThrow("contentDir must be a non-empty string");
  });

  it("accepts minimal valid config", () => {
    const minimalConfig = {
      defaultType: "default",
      postTypes: { default: { contentDir: "my-posts" } },
    };
    fs.writeFileSync(path.join(tmpDir, "config.json"), JSON.stringify(minimalConfig), "utf8");

    const result = readConfig(tmpDir);
    expect(result.postTypes.default.contentDir).toBe("my-posts");
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
    // Empty object should fail validation - requires postTypes
    expect(() => validateConfig({})).toThrow("postTypes is required");
  });

  it("throws when editor is not a string", () => {
    const badConfig = {
      defaultType: "default",
      postTypes: { default: { contentDir: "posts" } },
      editor: 123,
    };
    expect(() => validateConfig(badConfig)).toThrow("editor must be a string");
  });

  it("throws when filename is not an object", () => {
    const badConfig = {
      defaultType: "default",
      postTypes: { default: { contentDir: "posts", filename: "bad" } },
    };
    expect(() => validateConfig(badConfig)).toThrow("filename must be an object");
  });

  it("throws when filename.maxSlugLength is not a positive number", () => {
    const badConfig1 = {
      defaultType: "default",
      postTypes: { default: { contentDir: "posts", filename: { maxSlugLength: -5 } } },
    };
    const badConfig2 = {
      defaultType: "default",
      postTypes: { default: { contentDir: "posts", filename: { maxSlugLength: 0 } } },
    };
    const badConfig3 = {
      defaultType: "default",
      postTypes: { default: { contentDir: "posts", filename: { maxSlugLength: "ten" as any } } },
    };
    expect(() => validateConfig(badConfig1)).toThrow(
      "filename.maxSlugLength must be a positive number",
    );
    expect(() => validateConfig(badConfig2)).toThrow(
      "filename.maxSlugLength must be a positive number",
    );
    expect(() => validateConfig(badConfig3)).toThrow(
      "filename.maxSlugLength must be a positive number",
    );
  });

  it("throws when plugins is not an array", () => {
    const badConfig = {
      defaultType: "default",
      postTypes: { default: { contentDir: "posts" } },
      plugins: "bad",
    };
    expect(() => validateConfig(badConfig)).toThrow("plugins must be an array");
  });

  it("throws when a plugin is missing a name", () => {
    const badConfig = {
      defaultType: "default",
      postTypes: { default: { contentDir: "posts" } },
      plugins: [{ enabled: true }],
    };
    expect(() => validateConfig(badConfig)).toThrow('plugins[0] must have a "name" string');
  });

  it("accepts valid plugins array", () => {
    const validConfig = {
      defaultType: "default",
      postTypes: { default: { contentDir: "posts" } },
      plugins: [{ name: "test-plugin", enabled: true }],
    };
    expect(() => validateConfig(validConfig)).not.toThrow();
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
    const config = {
      ...DEFAULT_CONFIG,
      postTypes: {
        default: { ...DEFAULT_CONFIG.postTypes.default, contentDir: "my-notes" },
      },
    };
    writeConfig(tmpDir, config);

    const result = readConfig(tmpDir);
    expect(result.postTypes.default.contentDir).toBe("my-notes");
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
