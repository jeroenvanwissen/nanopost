import path from "node:path";
import { readConfig, getPostTypes } from "../core/config";
import { editExistingFile } from "../core/editor";
import { parseFrontmatter } from "../core/frontmatter";
import { findNanopostDir, findProjectRoot } from "../core/paths";
import { loadPlugins, runOnPostSaved } from "../core/plugins";
import { scanPosts, type Post } from "../core/posts";

/** Options for the last command. */
export type LastOptions = {
  edit?: boolean;
  path?: boolean;
  json?: boolean;
  type?: string;
};

/** Shows the most recent post, with options to edit or output as JSON. */
export async function cmdLast(cwd: string, opts: LastOptions): Promise<void> {
  const nanopostDir = findNanopostDir(cwd);
  if (!nanopostDir) {
    console.error("No .nanopost directory found. Run `nanopost init` in your project root.");
    process.exitCode = 1;
    return;
  }

  const projectRoot = findProjectRoot(cwd) ?? path.dirname(nanopostDir);
  const config = readConfig(nanopostDir);

  const allPosts: Post[] = [];

  // Scan all post types or filter by type
  const postTypes = getPostTypes(config);
  const typesToScan = opts.type ? [opts.type] : postTypes;

  for (const typeName of typesToScan) {
    if (!config.postTypes[typeName]) {
      console.error(`Error: Post type "${typeName}" not found in configuration.`);
      process.exitCode = 1;
      return;
    }

    const typeConfig = config.postTypes[typeName];
    const contentDir = path.resolve(projectRoot, typeConfig.contentDir);
    const posts = scanPosts(contentDir);
    allPosts.push(...posts);
  }

  // Sort by date descending (newest first)
  allPosts.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB.getTime() - dateA.getTime();
  });

  if (allPosts.length === 0) {
    console.log("No posts found.");
    return;
  }

  const last = allPosts[0];

  if (opts.path) {
    console.log(last.path);
    return;
  }

  if (opts.json) {
    console.log(JSON.stringify(last, null, 2));
    return;
  }

  if (opts.edit) {
    const updated = editExistingFile(last.path, config.editor);
    if (updated === null) {
      console.error("No editor configured. Set editor in config.json or $EDITOR.");
      process.exitCode = 1;
      return;
    }

    const { frontmatter, body } = parseFrontmatter(updated);
    const plugins = loadPlugins(nanopostDir, config.plugins);
    await runOnPostSaved(plugins, {
      filePath: last.path,
      projectRoot,
      nanopostDir,
      config,
      frontmatter,
      body,
    });
    return;
  }

  console.log(`${last.date} \u2014 ${last.title}`);
  if (last.body) {
    console.log();
    console.log(last.body);
  }
}
