import { describe, it, expect, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { cmdDoctor, printDoctorResults } from "../src/commands/doctor";
import { createTestProject, cleanupTestProject } from "./helpers";

describe("doctor (integration)", () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) cleanupTestProject(tmpDir);
    process.exitCode = undefined;
  });

  it("reports all pass for a valid project", () => {
    tmpDir = createTestProject();
    const { results, ok } = cmdDoctor(tmpDir);

    expect(ok).toBe(true);
    const failCount = results.filter((r) => r.status === "fail").length;
    expect(failCount).toBe(0);
  });

  it("reports fail when .nanopost directory is missing", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nanopost-doctor-integ-"));
    const { results, ok } = cmdDoctor(tmpDir);

    expect(ok).toBe(false);
    expect(results[0].status).toBe("fail");
    expect(results[0].hint).toContain("nanopost init");
  });

  it("reports fail for invalid JSON config", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nanopost-doctor-integ-"));
    const nanopostDir = path.join(tmpDir, ".nanopost");
    fs.mkdirSync(nanopostDir, { recursive: true });
    fs.writeFileSync(path.join(nanopostDir, "config.json"), "{invalid", "utf8");

    const { results, ok } = cmdDoctor(tmpDir);

    expect(ok).toBe(false);
    const configResult = results.find((r) => r.label.includes("config.json"));
    expect(configResult?.status).toBe("fail");
  });

  it("reports fail for missing plugin", () => {
    tmpDir = createTestProject({
      config: {
        contentDir: "content/status",
        plugins: [{ name: "does-not-exist", enabled: true }],
      },
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { results, ok } = cmdDoctor(tmpDir);

    expect(ok).toBe(false);
    const pluginResult = results.find((r) => r.label.includes("does-not-exist"));
    expect(pluginResult?.status).toBe("fail");

    errorSpy.mockRestore();
  });

  it("sets exit code 1 when printing results with failures", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nanopost-doctor-integ-"));
    const { results, ok } = cmdDoctor(tmpDir);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    printDoctorResults(results, ok);

    expect(process.exitCode).toBe(1);
    logSpy.mockRestore();
  });

  it("does not set exit code when all checks pass", () => {
    tmpDir = createTestProject();
    const { results, ok } = cmdDoctor(tmpDir);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    process.exitCode = undefined;
    printDoctorResults(results, ok);

    expect(process.exitCode).toBeUndefined();
    logSpy.mockRestore();
  });
});
