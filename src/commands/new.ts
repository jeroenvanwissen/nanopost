import fs from "node:fs";
import path from "node:path";
import prompts from "prompts";
import {
  readConfig,
  resolvePostTypeConfig,
  getPostTypes,
  getDefaultPostType,
} from "../core/config";
import { toMarkdown } from "../core/frontmatter";
import { slugify, formatFilename } from "../core/slug";
import { formatDateYYYYMMDD, formatDate } from "../core/time";
import { openInEditor } from "../core/editor";
import { loadPlugins, runOnPostSaved } from "../core/plugins";
import { findProjectRoot, findNanopostDir } from "../core/paths";
import { hasPipedStdin, readStdin } from "../core/input";

export type NewOptions = {
  title?: string;
  tags?: string;
  type?: string;
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

  // Determine post type
  let postType = opts.type;

  // If no type specified, prompt or use default
  if (!postType) {
    const availableTypes = getPostTypes(config);
    const defaultType = getDefaultPostType(config);

    if (availableTypes.length === 0) {
      console.error("No post types configured. Check your .nanopost/config.json");
      process.exitCode = 1;
      return;
    }

    if (availableTypes.length === 1) {
      postType = availableTypes[0];
    } else if (!hasPipedStdin() && args.length === 0) {
      // Interactive mode - prompt for type
      const typePrompt = await prompts({
        type: "select",
        name: "type",
        message: "Select post type",
        choices: availableTypes.map((t) => ({
          title: t === defaultType ? `${t} (default)` : t,
          value: t,
        })),
        initial: defaultType ? availableTypes.indexOf(defaultType) : 0,
      });

      postType = typePrompt.type;

      if (!postType) {
        // User cancelled
        process.exitCode = 0;
        return;
      }
    } else {
      // Non-interactive mode - use default type
      postType = defaultType || availableTypes[0];
    }
  }

  // Resolve the type config
  const typeConfig = resolvePostTypeConfig(config, postType!);

  // ---- input selection (contract) ----
  let body = "";
  if (hasPipedStdin()) {
    body = await readStdin();
  } else if (args.length > 0) {
    body = args.join(" ").trim();
  }

  let title = (opts.title ?? "").trim();
  let tags: string[] = parseTags(opts.tags);
  const customFields: Record<string, unknown> = {};

  if (!body) {
    // interactive — build prompts dynamically from type config frontmatter defaults
    const defaults = typeConfig.frontmatter?.defaults ?? {};
    const autoFields = new Set(["title", "date"]);
    const dynamicKeys: string[] = [];
    const promptList: prompts.PromptObject[] = [];

    // Always prompt title first (unless provided via CLI)
    if (!title) {
      promptList.push({
        type: "text",
        name: "title",
        message: "Title (optional)",
        initial: "",
      });
    }

    // Dynamic prompts for each frontmatter default field
    for (const [key, defaultValue] of Object.entries(defaults)) {
      if (autoFields.has(key)) continue;

      // Skip fields already provided via CLI
      if (key === "tags" && tags.length) continue;

      dynamicKeys.push(key);

      if (key === "tags") {
        const initial = Array.isArray(defaultValue)
          ? defaultValue.join(", ")
          : String(defaultValue ?? "");
        promptList.push({
          type: "text",
          name: "tags",
          message: "Tags (comma-separated, optional)",
          initial,
        });
      } else {
        promptList.push({
          type: "text",
          name: key,
          message: `${key.charAt(0).toUpperCase() + key.slice(1)} (optional)`,
          initial: String(defaultValue ?? ""),
        });
      }
    }

    // Only prompt body inline if --edit is not set
    if (!opts.edit) {
      promptList.push({
        type: "text",
        name: "body",
        message: "Body",
        initial: "",
      });
    }

    const res = await prompts(promptList);

    title = title || String(res.title ?? "").trim();

    // Collect dynamic field values
    for (const key of dynamicKeys) {
      if (key === "tags") {
        tags = tags.length ? tags : parseTags(String(res.tags ?? ""));
      } else {
        const val = String(res[key] ?? "").trim();
        if (val) customFields[key] = val;
      }
    }

    if (!opts.edit) {
      body = String(res.body ?? "").trim();
    }
  }

  if (opts.edit) {
    body = openInEditor(body || "", typeConfig.editor);
  }

  if (!title) title = deriveTitle(body, hasPipedStdin());
  const now = new Date();
  const fileDate = formatDateYYYYMMDD(now);
  const fmDate = formatDate(now, typeConfig.dateFormat ?? "yyyy-MM-dd");

  const maxSlugLen = typeConfig.filename?.maxSlugLength ?? 60;
  const slug = slugify(title, maxSlugLen);

  // Build frontmatter before generating filename (needed for variable substitution)
  const fm: Record<string, unknown> = {
    ...(typeConfig.frontmatter?.defaults ?? {}),
    ...customFields,
    title,
    date: fmDate,
  };

  if (tags.length) fm.tags = tags;

  // Generate filename based on format template
  const filenameFormat = typeConfig.filename?.format ?? "date-slug";
  let fileName: string;

  if (filenameFormat === "date-slug") {
    // Legacy format for backward compatibility
    fileName = `${fileDate}-${slug}.md`;
  } else {
    // Variable-based format (e.g., "{date}-{title}")
    // Build variables object with common fields + frontmatter fields
    const variables: Record<string, string> = {
      date: fileDate,
      title,
      slug,
    };

    // Add frontmatter fields as potential variables
    for (const [key, value] of Object.entries(fm)) {
      if (typeof value === "string") {
        variables[key] = value;
      }
    }

    fileName = formatFilename(filenameFormat, variables, maxSlugLen);
    // Ensure .md extension
    if (!fileName.endsWith(".md")) {
      fileName += ".md";
    }
  }

  const outDir = path.resolve(projectRoot, typeConfig.contentDir);
  const outPath = path.join(outDir, fileName);

  const md = toMarkdown(fm, body, typeConfig.frontmatter?.schema);

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
