import fs from "node:fs";
import path from "node:path";
import { DEFAULT_CONFIG, writeConfig } from "../core/config";
import { findProjectRoot, findNanopostDir } from "../core/paths";

export type InitOptions = {
  github?: boolean;
  force?: boolean;
};

export function cmdInit(cwd: string, opts: InitOptions) {
  const existing = findNanopostDir(cwd);
  if (existing && !opts.force) {
    console.log(`.nanopost already exists at: ${existing}`);
    return;
  }

  const root = findProjectRoot(cwd) ?? cwd;
  const dir = path.join(root, ".nanopost");
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, "plugins"), { recursive: true });

  writeConfig(dir, DEFAULT_CONFIG);

  if (opts.github) {
    const pluginPath = path.join(dir, "plugins", "github.js");
    if (!fs.existsSync(pluginPath) || opts.force) {
      fs.writeFileSync(pluginPath, githubPluginTemplate(), "utf8");
    }

    // Enable plugin in config
    const cfg = { ...DEFAULT_CONFIG, plugins: [{ name: "github", enabled: true }] };
    writeConfig(dir, cfg);
  }

  console.log(`Created ${dir}`);
  console.log(`Config: ${path.join(dir, "config.json")}`);
}

function githubPluginTemplate(): string {
  return `const { execSync } = require("node:child_process");

module.exports = {
  name: "github",
  async onPostSaved({ filePath }) {
    // Requires: git + GitHub CLI (gh) authenticated
    execSync(\`git add "\${filePath}"\`);
    execSync(\`git commit -m "nanopost: add \${filePath}"\`);
    execSync(\`git push\`, { stdio: "inherit" });
    execSync(\`gh pr create --fill\`, { stdio: "inherit" });
  }
};
`;
}
