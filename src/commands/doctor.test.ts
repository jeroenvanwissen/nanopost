import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { cmdDoctor } from "./doctor";

function createTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "nanopost-doctor-test-"));
}

function setupValidProject(tmpDir: string): void {
  const nanopostDir = path.join(tmpDir, ".nanopost");
  fs.mkdirSync(nanopostDir, { recursive: true });
  fs.mkdirSync(path.join(nanopostDir, "plugins"), { recursive: true });
  fs.writeFileSync(
    path.join(nanopostDir, "config.json"),
    JSON.stringify(
      {
        defaultType: "default",
        postTypes: {
          default: {
            contentDir: "content/posts",
          },
        },
      },
      null,
      2,
    ),
    "utf8",
  );
  fs.mkdirSync(path.join(tmpDir, "content", "posts"), { recursive: true });
}

describe("cmdDoctor", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTmpDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("reports pass for a valid setup", () => {
    setupValidProject(tmpDir);
    const { results, ok } = cmdDoctor(tmpDir);

    expect(ok).toBe(true);
    const statuses = results.map((r) => r.status);
    expect(statuses).not.toContain("fail");
  });

  it("reports fail when .nanopost is missing", () => {
    const { results, ok } = cmdDoctor(tmpDir);

    expect(ok).toBe(false);
    expect(results[0].status).toBe("fail");
    expect(results[0].label).toContain(".nanopost");
  });

  it("reports fail when config.json is invalid JSON", () => {
    const nanopostDir = path.join(tmpDir, ".nanopost");
    fs.mkdirSync(nanopostDir, { recursive: true });
    fs.writeFileSync(path.join(nanopostDir, "config.json"), "not json {{{", "utf8");

    const { results, ok } = cmdDoctor(tmpDir);

    expect(ok).toBe(false);
    const configResult = results.find((r) => r.label.includes("config.json"));
    expect(configResult?.status).toBe("fail");
  });

  it("reports fail when config.json has invalid fields", () => {
    const nanopostDir = path.join(tmpDir, ".nanopost");
    fs.mkdirSync(nanopostDir, { recursive: true });
    fs.writeFileSync(
      path.join(nanopostDir, "config.json"),
      JSON.stringify({ contentDir: 123 }),
      "utf8",
    );

    const { results, ok } = cmdDoctor(tmpDir);

    expect(ok).toBe(false);
    const configResult = results.find((r) => r.label.includes("config.json"));
    expect(configResult?.status).toBe("fail");
  });

  it("reports warn when content directory is missing", () => {
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

    const { results } = cmdDoctor(tmpDir);

    const contentResult = results.find((r) => r.label.includes("Content directory"));
    expect(contentResult?.status).toBe("warn");
  });

  it("reports fail when a plugin file is missing", () => {
    const nanopostDir = path.join(tmpDir, ".nanopost");
    fs.mkdirSync(nanopostDir, { recursive: true });
    fs.mkdirSync(path.join(nanopostDir, "plugins"), { recursive: true });
    fs.writeFileSync(
      path.join(nanopostDir, "config.json"),
      JSON.stringify({
        defaultType: "default",
        postTypes: {
          default: {
            contentDir: "content/posts",
          },
        },
        plugins: [{ name: "nonexistent", enabled: true }],
      }),
      "utf8",
    );

    const { results, ok } = cmdDoctor(tmpDir);

    expect(ok).toBe(false);
    const pluginResult = results.find((r) => r.label.includes("nonexistent"));
    expect(pluginResult?.status).toBe("fail");
  });

  it("reports pass for all checks in a fully valid setup", () => {
    setupValidProject(tmpDir);
    const { results, ok } = cmdDoctor(tmpDir);

    expect(ok).toBe(true);
    const passing = results.filter((r) => r.status === "pass");
    expect(passing.length).toBeGreaterThanOrEqual(2);
  });

  it("includes remediation hints for failures", () => {
    const { results } = cmdDoctor(tmpDir);

    const failures = results.filter((r) => r.status === "fail");
    expect(failures.length).toBeGreaterThan(0);
    for (const f of failures) {
      expect(f.hint).toBeDefined();
      expect(f.hint!.length).toBeGreaterThan(0);
    }
  });
});
