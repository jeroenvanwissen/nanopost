import path from "node:path";
import { spawnSync } from "node:child_process";
import { readConfig } from "../core/config";
import { findNanopostDir, findProjectRoot } from "../core/paths";
import { scanPosts } from "../core/posts";

/** Options for the last command. */
export type LastOptions = {
  edit?: boolean;
  path?: boolean;
  json?: boolean;
};

/** Shows the most recent post, with options to edit or output as JSON. */
export function cmdLast(cwd: string, opts: LastOptions): void {
  const nanopostDir = findNanopostDir(cwd);
  if (!nanopostDir) {
    console.error("No .nanopost directory found. Run `nanopost init` in your project root.");
    process.exitCode = 1;
    return;
  }

  const projectRoot = findProjectRoot(cwd) ?? path.dirname(nanopostDir);
  const config = readConfig(nanopostDir);
  const contentDir = path.resolve(projectRoot, config.contentDir);
  const posts = scanPosts(contentDir);

  if (posts.length === 0) {
    console.log("No posts found.");
    return;
  }

  const last = posts[0];

  if (opts.path) {
    console.log(last.path);
    return;
  }

  if (opts.json) {
    console.log(JSON.stringify(last, null, 2));
    return;
  }

  if (opts.edit) {
    openExistingInEditor(last.path, config.editor);
    return;
  }

  console.log(`${last.date} \u2014 ${last.title}`);
  if (last.body) {
    console.log();
    console.log(last.body);
  }
}

/** Opens an existing file in the configured editor. */
function openExistingInEditor(filePath: string, editorCmd?: string): void {
  const editor = editorCmd?.trim() || process.env.EDITOR || process.env.VISUAL;
  if (!editor) {
    console.error("No editor configured. Set editor in config.json or $EDITOR.");
    process.exitCode = 1;
    return;
  }

  const parts = editor.split(" ").filter(Boolean);
  const cmd = parts[0];
  const args = [...parts.slice(1), filePath];

  const res = spawnSync(cmd, args, { stdio: "inherit" });
  if (res.error) {
    console.error(`Failed to open editor: ${res.error.message}`);
    process.exitCode = 1;
  }
}
