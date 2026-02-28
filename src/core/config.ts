import fs from "node:fs";
import path from "node:path";

export type PluginConfig = {
  name: string;
  enabled?: boolean;
  options?: Record<string, unknown>;
};

export type FrontmatterFieldType = "string" | "boolean" | "array" | "object" | "number" | "date";

export type FrontmatterSchema = {
  [key: string]: FrontmatterFieldType;
};

export type PostTypeConfig = {
  contentDir: string;
  dateFormat?: string;
  filename?: {
    format?: string; // e.g., "date-slug" or "{date}-{title}"
    maxSlugLength?: number;
  };
  frontmatter?: {
    schema?: string[] | FrontmatterSchema;
    defaults?: Record<string, unknown>;
  };
};

export type NanopostConfig = {
  defaultType: string;
  postTypes: Record<string, PostTypeConfig>;
  editor?: string;
  plugins?: PluginConfig[];
};

export const DEFAULT_POST_TYPE_CONFIG: PostTypeConfig = {
  contentDir: "content/posts",
  dateFormat: "yyyy-MM-dd",
  filename: { format: "date-slug", maxSlugLength: 60 },
  frontmatter: { defaults: {} },
};

export const DEFAULT_CONFIG: NanopostConfig = {
  defaultType: "default",
  postTypes: {
    default: {
      contentDir: "content/posts",
      dateFormat: "yyyy-MM-dd",
      filename: { format: "date-slug", maxSlugLength: 60 },
      frontmatter: { defaults: {} },
    },
  },
  editor: "",
  plugins: [],
};

export function readConfig(nanopostDir: string): NanopostConfig {
  const file = path.join(nanopostDir, "config.json");
  if (!fs.existsSync(file)) return DEFAULT_CONFIG;
  const raw = fs.readFileSync(file, "utf8");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `config.json is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    );
  }

  validateConfig(parsed);
  return deepMerge(DEFAULT_CONFIG, parsed as Record<string, unknown>);
}

export function writeConfig(nanopostDir: string, cfg: NanopostConfig) {
  const file = path.join(nanopostDir, "config.json");
  fs.writeFileSync(file, JSON.stringify(cfg, null, 2) + "\n", "utf8");
}

/** Validates that parsed JSON conforms to expected config shape. */
export function validateConfig(raw: unknown): void {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Invalid config: root must be an object");
  }

  const obj = raw as Record<string, unknown>;

  // Require postTypes
  if (!("postTypes" in obj)) {
    throw new Error("Invalid config: postTypes is required");
  }

  if (!obj.postTypes || typeof obj.postTypes !== "object" || Array.isArray(obj.postTypes)) {
    throw new Error("Invalid config: postTypes must be an object");
  }

  const postTypes = obj.postTypes as Record<string, unknown>;
  const typeNames = Object.keys(postTypes);

  if (typeNames.length === 0) {
    throw new Error("Invalid config: postTypes must contain at least one post type");
  }

  // Validate each post type
  for (const typeName of typeNames) {
    const typeConfig = postTypes[typeName];
    if (!typeConfig || typeof typeConfig !== "object" || Array.isArray(typeConfig)) {
      throw new Error(`Invalid config: postTypes.${typeName} must be an object`);
    }

    const tc = typeConfig as Record<string, unknown>;

    if (!("contentDir" in tc) || typeof tc.contentDir !== "string" || tc.contentDir.length === 0) {
      throw new Error(
        `Invalid config: postTypes.${typeName}.contentDir must be a non-empty string`,
      );
    }

    if ("filename" in tc) {
      if (!tc.filename || typeof tc.filename !== "object" || Array.isArray(tc.filename)) {
        throw new Error(`Invalid config: postTypes.${typeName}.filename must be an object`);
      }
      const fn = tc.filename as Record<string, unknown>;
      if ("maxSlugLength" in fn) {
        if (typeof fn.maxSlugLength !== "number" || fn.maxSlugLength <= 0) {
          throw new Error(
            `Invalid config: postTypes.${typeName}.filename.maxSlugLength must be a positive number`,
          );
        }
      }
    }
  }

  // Require defaultType
  if (!("defaultType" in obj)) {
    throw new Error("Invalid config: defaultType is required");
  }

  if (typeof obj.defaultType !== "string") {
    throw new Error("Invalid config: defaultType must be a string");
  }

  if (!(obj.defaultType in postTypes)) {
    throw new Error(`Invalid config: defaultType "${obj.defaultType}" does not exist in postTypes`);
  }

  // Validate optional fields
  if ("editor" in obj && typeof obj.editor !== "string") {
    throw new Error("Invalid config: editor must be a string");
  }

  if ("plugins" in obj) {
    if (!Array.isArray(obj.plugins)) {
      throw new Error("Invalid config: plugins must be an array");
    }
    for (let i = 0; i < obj.plugins.length; i++) {
      const p = obj.plugins[i] as Record<string, unknown>;
      if (!p || typeof p !== "object" || typeof p.name !== "string") {
        throw new Error(`Invalid config: plugins[${i}] must have a "name" string`);
      }
    }
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** Simple deep merge (objects only). Arrays override. */
export function deepMerge<T extends Record<string, unknown>>(
  base: T,
  override: Record<string, unknown>,
): T {
  if (!isObject(base) || !isObject(override)) return (override ?? base) as T;
  const out = { ...base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(override)) {
    const baseVal = (base as Record<string, unknown>)[k];
    if (isObject(baseVal) && isObject(v)) {
      out[k] = deepMerge(baseVal, v);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

/** Resolves a post type config from the loaded config. */
export function resolvePostTypeConfig(
  config: NanopostConfig,
  typeName: string,
): PostTypeConfig & { editor?: string } {
  if (!config.postTypes[typeName]) {
    throw new Error(`Post type "${typeName}" not found in configuration`);
  }

  const typeConfig = config.postTypes[typeName];
  const merged = deepMerge(
    DEFAULT_POST_TYPE_CONFIG,
    typeConfig as Record<string, unknown>,
  ) as PostTypeConfig;

  // Auto-inject type field into frontmatter defaults
  if (!merged.frontmatter) {
    merged.frontmatter = { defaults: {} };
  }
  if (!merged.frontmatter.defaults) {
    merged.frontmatter.defaults = {};
  }
  if (!merged.frontmatter.defaults.type) {
    merged.frontmatter.defaults.type = typeName;
  }

  return { ...merged, editor: config.editor };
}

/** Gets list of available post types from config. */
export function getPostTypes(config: NanopostConfig): string[] {
  return Object.keys(config.postTypes);
}

/** Gets the default post type from config. */
export function getDefaultPostType(config: NanopostConfig): string {
  return config.defaultType;
}
