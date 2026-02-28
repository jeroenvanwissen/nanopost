import fs from "node:fs";
import path from "node:path";
import { readConfig } from "../core/config";
import { editExistingFile } from "../core/editor";
import { parseFrontmatter } from "../core/frontmatter";
import { findNanopostDir, findProjectRoot } from "../core/paths";
import { loadPlugins, runOnPostSaved } from "../core/plugins";

/**
 * Opens an existing post file in the editor.
 * After the editor closes, triggers onPostSaved plugins.
 */
export async function cmdEdit(cwd: string, filePath: string): Promise<void> {
  const resolved = path.resolve(cwd, filePath);

  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exitCode = 1;
    return;
  }

  const nanopostDir = findNanopostDir(cwd);
  if (!nanopostDir) {
    console.error("No .nanopost directory found. Run `nanopost init` in your project root.");
    process.exitCode = 1;
    return;
  }

  const projectRoot = findProjectRoot(cwd) ?? path.dirname(nanopostDir);
  const config = readConfig(nanopostDir);

  const updated = editExistingFile(resolved, config.editor);
  if (updated === null) {
    console.error("No editor configured. Set editor in config.json or $EDITOR.");
    process.exitCode = 1;
    return;
  }

  const { frontmatter, body } = parseFrontmatter(updated);
  const plugins = loadPlugins(nanopostDir, config.plugins);
  await runOnPostSaved(plugins, {
    filePath: resolved,
    projectRoot,
    nanopostDir,
    config,
    frontmatter,
    body,
  });
}
