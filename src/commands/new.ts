import fs from "node:fs";
import path from "node:path";
import prompts from "prompts";
import { readConfig } from "../core/config";
import { toMarkdown } from "../core/frontmatter";
import { slugify } from "../core/slug";
import { formatDateYYYYMMDD } from "../core/time";
import { openInEditor } from "../core/editor";
import { loadPlugins, runOnPostSaved } from "../core/plugins";
import { findProjectRoot, findNanopostDir } from "../core/paths";
import { hasPipedStdin, readStdin } from "../core/input";

export type NewOptions = {
  title?: string;
  status?: string;
  tags?: string;
  edit?: boolean;
  dryRun?: boolean;
  noPublish?: boolean;
};

export async function cmdNew(cwd: string, args: string[], opts: NewOptions) {
  const nanopostDir = findNanopostDir(cwd);
  if (!nanopostDir) {
    console.error("No .nanopost directory found. Run `nanopost init` in your project root.");
    process.exitCode = 1;
    return;
  }

  const projectRoot = findProjectRoot(cwd) ?? path.dirname(nanopostDir);
  const config = readConfig(nanopostDir);

  // ---- input selection (contract) ----
  let body = "";
  if (hasPipedStdin()) {
    body = await readStdin();
  } else if (args.length > 0) {
    body = args.join(" ").trim();
  }

  let title = (opts.title ?? "").trim();
  let status = (opts.status ?? "").trim();
  let tags: string[] = parseTags(opts.tags);

  if (!body) {
    // interactive
    const res = await prompts([
      {
        type: "text",
        name: "title",
        message: "Title (optional)",
        initial: "",
      },
      {
        type: "text",
        name: "status",
        message: "Status (optional)",
        initial: "",
      },
      {
        type: "text",
        name: "tags",
        message: "Tags (comma-separated, optional)",
        initial: "",
      },
      {
        type: "text",
        name: "body",
        message: "Body",
        initial: "",
      },
    ]);

    title = title || String(res.title ?? "").trim();
    status = status || String(res.status ?? "").trim();
    tags = tags.length ? tags : parseTags(String(res.tags ?? ""));
    body = String(res.body ?? "").trim();
  }

  if (opts.edit) {
    body = openInEditor(body || "", config.editor);
  }

  if (!title) title = deriveTitle(body, hasPipedStdin());
  const date = formatDateYYYYMMDD(new Date());

  const maxSlugLen = config.filename?.maxSlugLength ?? 60;
  const slug = slugify(title, maxSlugLen);
  const fileName = `${date}-${slug}.md`;
  const outDir = path.resolve(projectRoot, config.contentDir);
  const outPath = path.join(outDir, fileName);

  const fm: Record<string, unknown> = {
    ...(config.frontmatter?.defaults ?? {}),
    title,
    date,
  };

  if (status) fm.status = status;
  if (tags.length) fm.tags = tags;

  // Clean up defaults: don't write empty status/tags from defaults unless user wants them
  // If defaults.status exists but user didn't specify status, keep it (that's intentional).
  // If you want to omit defaults entirely, remove defaults from config.
  const md = toMarkdown(fm, body);

  if (opts.dryRun) {
    process.stdout.write(md);
    return;
  }

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, md, "utf8");
  console.log(outPath);

  if (!opts.noPublish) {
    const plugins = loadPlugins(nanopostDir, config.plugins);
    await runOnPostSaved(plugins, {
      filePath: outPath,
      projectRoot,
      nanopostDir,
      config,
      frontmatter: fm,
      body,
    });
  }
}

function parseTags(s?: string): string[] {
  if (!s) return [];
  return s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function deriveTitle(body: string, fromPipe: boolean): string {
  const text = (body || "").trim();
  if (!text) return "Note";

  if (fromPipe) {
    const line = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find(Boolean);
    return (line ?? text).slice(0, 80);
  }

  // first sentence-ish
  const m = text.match(/^(.+?[.!?])(\s|$)/);
  const candidate = (m?.[1] ?? text.split(/\r?\n/)[0] ?? text).trim();
  return candidate.slice(0, 80);
}
