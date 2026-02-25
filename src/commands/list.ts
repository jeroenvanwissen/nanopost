import path from "node:path";
import { readConfig } from "../core/config";
import { findNanopostDir, findProjectRoot } from "../core/paths";
import { scanPosts, type Post } from "../core/posts";

/** Options for the list command. */
export type ListOptions = {
  limit?: number;
  json?: boolean;
  grep?: string;
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
  const contentDir = path.resolve(projectRoot, config.contentDir);

  let posts = scanPosts(contentDir);
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
    console.log(`${post.date}  ${post.title}`);
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
