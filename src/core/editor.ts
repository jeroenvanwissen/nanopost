import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function openInEditor(initial: string, editorCmd?: string): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nanopost-"));
  const file = path.join(tmpDir, "post.md");

  try {
    fs.writeFileSync(file, initial, "utf8");

    const editor = editorCmd?.trim() || process.env.EDITOR || process.env.VISUAL;
    if (!editor) {
      return initial;
    }

    // Basic split: allow commands like "code --wait"
    const parts = editor.split(" ").filter(Boolean);
    const cmd = parts[0];
    const args = [...parts.slice(1), file];

    const res = spawnSync(cmd, args, { stdio: "inherit" });
    if (res.error) throw res.error;

    const updated = fs.readFileSync(file, "utf8");
    return updated.trim();
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Silently ignore cleanup failures
    }
  }
}
