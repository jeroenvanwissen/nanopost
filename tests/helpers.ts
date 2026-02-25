import fs from "node:fs";
import path from "node:path";
import os from "node:os";

/** Creates a temp directory with a valid .nanopost project setup. */
export function createTestProject(opts?: {
  config?: Record<string, unknown>;
  posts?: { filename: string; title: string; body: string }[];
}): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nanopost-integ-"));
  const nanopostDir = path.join(tmpDir, ".nanopost");
  fs.mkdirSync(nanopostDir, { recursive: true });
  fs.mkdirSync(path.join(nanopostDir, "plugins"), { recursive: true });

  const config = opts?.config ?? { contentDir: "content/status" };
  fs.writeFileSync(path.join(nanopostDir, "config.json"), JSON.stringify(config, null, 2), "utf8");

  const contentDir = path.join(tmpDir, String(config.contentDir ?? "content/status"));
  fs.mkdirSync(contentDir, { recursive: true });

  if (opts?.posts) {
    for (const post of opts.posts) {
      const filePath = path.join(contentDir, post.filename);
      const content = `---\ntitle: ${post.title}\n---\n\n${post.body}`;
      fs.writeFileSync(filePath, content, "utf8");
    }
  }

  return tmpDir;
}

/** Removes a test project directory. */
export function cleanupTestProject(tmpDir: string): void {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
