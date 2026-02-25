import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { readConfig, validateConfig, type NanopostConfig } from "../core/config";
import { loadPlugins } from "../core/plugins";
import { findNanopostDir } from "../core/paths";

/** Result of a single doctor check. */
export type CheckResult = {
  label: string;
  status: "pass" | "fail" | "warn";
  hint?: string;
};

/** Runs all health checks and returns results plus an overall ok flag. */
export function cmdDoctor(cwd: string): { results: CheckResult[]; ok: boolean } {
  const results: CheckResult[] = [];

  const nanopostDir = findNanopostDir(cwd);
  results.push(checkNanopostDir(nanopostDir));
  if (!nanopostDir) {
    return { results, ok: false };
  }

  const { results: configResults, config } = checkConfig(nanopostDir);
  results.push(...configResults);

  if (config) {
    results.push(...checkPlugins(nanopostDir, config));
  }

  results.push(...checkTooling());

  const ok = results.every((r) => r.status !== "fail");
  return { results, ok };
}

/** Prints doctor results to stdout and sets process exit code. */
export function printDoctorResults(results: CheckResult[], ok: boolean): void {
  for (const r of results) {
    const icon = r.status === "pass" ? "\u2714" : r.status === "fail" ? "\u2716" : "\u26A0";
    console.log(`${icon} ${r.label}`);
    if (r.hint) console.log(`  \u2192 ${r.hint}`);
  }

  if (!ok) process.exitCode = 1;
}

function checkNanopostDir(nanopostDir: string | null): CheckResult {
  if (nanopostDir) {
    return { label: ".nanopost directory found", status: "pass" };
  }
  return {
    label: ".nanopost directory not found",
    status: "fail",
    hint: "Run `nanopost init` in your project root.",
  };
}

type ConfigCheckResult = {
  results: CheckResult[];
  config: NanopostConfig | null;
};

function checkConfig(nanopostDir: string): ConfigCheckResult {
  const results: CheckResult[] = [];
  const configPath = path.join(nanopostDir, "config.json");

  if (!fs.existsSync(configPath)) {
    results.push({
      label: "config.json not found",
      status: "fail",
      hint: "Run `nanopost init` to create a default config.",
    });
    return { results, config: null };
  }

  try {
    const raw = fs.readFileSync(configPath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    validateConfig(parsed);
    results.push({ label: "config.json is valid", status: "pass" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ label: "config.json is invalid", status: "fail", hint: msg });
    return { results, config: null };
  }

  const config = readConfig(nanopostDir);
  const projectRoot = path.dirname(nanopostDir);
  const contentDir = path.resolve(projectRoot, config.contentDir);
  results.push(checkContentDir(contentDir));

  if (config.editor) {
    results.push(checkEditor(config.editor));
  }

  return { results, config };
}

function checkContentDir(contentDir: string): CheckResult {
  if (fs.existsSync(contentDir)) {
    return { label: `Content directory exists: ${contentDir}`, status: "pass" };
  }
  return {
    label: `Content directory missing: ${contentDir}`,
    status: "warn",
    hint: "It will be created when you write your first post.",
  };
}

function checkEditor(editorCmd: string): CheckResult {
  const cmd = editorCmd.split(" ").filter(Boolean)[0];
  if (!cmd) {
    return { label: "Editor configured but empty", status: "warn" };
  }

  try {
    execSync(`command -v ${cmd}`, { stdio: "ignore" });
    return { label: `Editor found: ${cmd}`, status: "pass" };
  } catch {
    return {
      label: `Editor not found on PATH: ${cmd}`,
      status: "warn",
      hint: `Install "${cmd}" or update editor in config.json.`,
    };
  }
}

function checkPlugins(nanopostDir: string, config: NanopostConfig): CheckResult[] {
  const enabled = (config.plugins ?? []).filter((p) => p.enabled !== false);
  if (enabled.length === 0) return [];

  const results: CheckResult[] = [];
  const loaded = loadPlugins(nanopostDir, config.plugins);
  const loadedNames = new Set(loaded.map((p) => p.name));

  for (const p of enabled) {
    if (loadedNames.has(p.name)) {
      results.push({ label: `Plugin "${p.name}" loaded`, status: "pass" });
    } else {
      results.push({
        label: `Plugin "${p.name}" failed to load`,
        status: "fail",
        hint: `Check .nanopost/plugins/${p.name}.js or install nanopost-plugin-${p.name}.`,
      });
    }
  }

  return results;
}

function checkTooling(): CheckResult[] {
  const results: CheckResult[] = [];

  results.push(checkCommand("git", "git --version", "Git is useful for version control."));

  return results;
}

function checkCommand(name: string, cmd: string, hint: string): CheckResult {
  try {
    execSync(cmd, { stdio: "ignore" });
    return { label: `${name} available`, status: "pass" };
  } catch {
    return { label: `${name} not found`, status: "warn", hint };
  }
}
