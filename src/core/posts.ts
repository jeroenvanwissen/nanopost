import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter } from "./frontmatter";

/** Represents a scanned post with metadata extracted from filename and frontmatter. */
export type Post = {
  file: string;
  title: string;
  date: string;
  body: string;
  path: string;
};

/** Scans the content directory for Markdown posts, sorted newest-first. */
export function scanPosts(contentDir: string): Post[] {
  if (!fs.existsSync(contentDir)) return [];

  const files = fs.readdirSync(contentDir).filter((f) => f.endsWith(".md"));
  const posts: Post[] = [];

  for (const file of files) {
    const filePath = path.join(contentDir, file);
    const content = fs.readFileSync(filePath, "utf8");
    const { frontmatter, body } = parseFrontmatter(content);

    const date = extractDate(file, frontmatter);
    const title = typeof frontmatter.title === "string" ? frontmatter.title : titleFromFile(file);

    posts.push({ file, title, date, body, path: filePath });
  }

  posts.sort((a, b) => b.date.localeCompare(a.date));
  return posts;
}

/** Extracts date from filename (YYYY-MM-DD prefix) or frontmatter. */
function extractDate(file: string, frontmatter: Record<string, unknown>): string {
  const match = file.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];

  if (frontmatter.date) return String(frontmatter.date).slice(0, 10);

  return "unknown";
}

/** Derives a title from a filename by stripping the date prefix and extension. */
function titleFromFile(file: string): string {
  return file
    .replace(/^\d{4}-\d{2}-\d{2}-/, "")
    .replace(/\.md$/, "")
    .replace(/-/g, " ");
}
