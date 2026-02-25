import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { cmdInit } from "../src/commands/init";

describe("init (integration)", () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates .nanopost directory with config.json", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nanopost-init-test-"));

    cmdInit(tmpDir, {});

    const nanopostDir = path.join(tmpDir, ".nanopost");
    expect(fs.existsSync(nanopostDir)).toBe(true);
    expect(fs.existsSync(path.join(nanopostDir, "config.json"))).toBe(true);
    expect(fs.existsSync(path.join(nanopostDir, "plugins"))).toBe(true);
  });

  it("creates github plugin with --github flag", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nanopost-init-test-"));

    cmdInit(tmpDir, { github: true });

    const pluginPath = path.join(tmpDir, ".nanopost", "plugins", "github.js");
    expect(fs.existsSync(pluginPath)).toBe(true);

    const configPath = path.join(tmpDir, ".nanopost", "config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    expect(config.plugins).toEqual([{ name: "github", enabled: true }]);
  });

  it("does not overwrite existing .nanopost without --force", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nanopost-init-test-"));
    const nanopostDir = path.join(tmpDir, ".nanopost");
    fs.mkdirSync(nanopostDir, { recursive: true });
    fs.writeFileSync(path.join(nanopostDir, "config.json"), '{"custom": true}', "utf8");

    cmdInit(tmpDir, {});

    // Original config should be preserved
    const config = JSON.parse(fs.readFileSync(path.join(nanopostDir, "config.json"), "utf8"));
    expect(config.custom).toBe(true);
  });

  it("overwrites existing .nanopost with --force", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nanopost-init-test-"));
    const nanopostDir = path.join(tmpDir, ".nanopost");
    fs.mkdirSync(nanopostDir, { recursive: true });
    fs.writeFileSync(path.join(nanopostDir, "config.json"), '{"custom": true}', "utf8");

    cmdInit(tmpDir, { force: true });

    const config = JSON.parse(fs.readFileSync(path.join(nanopostDir, "config.json"), "utf8"));
    expect(config.custom).toBeUndefined();
    expect(config.contentDir).toBe("content/status");
  });
});
