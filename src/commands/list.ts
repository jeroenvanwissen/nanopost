import path from "node:path";
import { readConfig, getPostTypes } from "../core/config";
import { findNanopostDir, findProjectRoot } from "../core/paths";
import { scanPosts, type Post } from "../core/posts";

/** Options for the list command. */
export type ListOptions = {
  limit?: number;
  json?: boolean;
  grep?: string;
  type?: string;
};

/** Lists posts sorted by date (newest first), with optional filtering. */
export function cmdList(cwd: string, opts: ListOptions): void {
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

  let posts = allPosts;
  posts = applyGrep(posts, opts.grep);
  posts = applyLimit(posts, opts.limit);

  if (opts.json) {
    console.log(JSON.stringify(posts, null, 2));
    return;
  }

  if (posts.length === 0) {
    console.log("No posts found.");
    return;
  }

  for (const post of posts) {
    const typeInfo = post.frontmatter?.type ? ` [${post.frontmatter.type}]` : "";
    console.log(`${post.date}  ${post.title}${typeInfo}`);
  }
}

function applyGrep(posts: Post[], grep: string | undefined): Post[] {
  if (!grep) return posts;
  const pattern = grep.toLowerCase();
  return posts.filter((p) => {
    return p.title.toLowerCase().includes(pattern) || p.body.toLowerCase().includes(pattern);
  });
}

function applyLimit(posts: Post[], limit: number | undefined): Post[] {
  if (limit === undefined || limit <= 0) return posts;
  return posts.slice(0, limit);
}
