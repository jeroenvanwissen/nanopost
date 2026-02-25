import fs from "node:fs";
import path from "node:path";

export function findProjectRoot(startDir: string): string | null {
  // Prefer git root if possible, but avoid shelling out here.
  // We'll treat the directory containing .git OR .nanopost as root candidates.
  let dir = startDir;
  while (true) {
    const dotNanopost = path.join(dir, ".nanopost");
    const dotGit = path.join(dir, ".git");
    if (fs.existsSync(dotNanopost) || fs.existsSync(dotGit)) return dir;

    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function findNanopostDir(startDir: string): string | null {
  let dir = startDir;
  while (true) {
    const candidate = path.join(dir, ".nanopost");
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) return candidate;

    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
