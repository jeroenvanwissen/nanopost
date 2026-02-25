import fs from "node:fs";
import path from "node:path";

export type PluginConfig = {
  name: string;
  enabled?: boolean;
  options?: Record<string, unknown>;
};

export type NanopostConfig = {
  contentDir: string;
  editor?: string;
  filename?: {
    format?: "date-slug";
    dateFormat?: "yyyy-MM-dd";
    maxSlugLength?: number;
  };
  frontmatter?: {
    defaults?: Record<string, unknown>;
  };
  plugins?: PluginConfig[];
};

export const DEFAULT_CONFIG: NanopostConfig = {
  contentDir: "content/status",
  editor: "",
  filename: { format: "date-slug", dateFormat: "yyyy-MM-dd", maxSlugLength: 60 },
  frontmatter: { defaults: { status: "note" } },
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

  if ("contentDir" in obj && (typeof obj.contentDir !== "string" || obj.contentDir.length === 0)) {
    throw new Error("Invalid config: contentDir must be a non-empty string");
  }

  if ("editor" in obj && typeof obj.editor !== "string") {
    throw new Error("Invalid config: editor must be a string");
  }

  if ("filename" in obj) {
    if (!obj.filename || typeof obj.filename !== "object" || Array.isArray(obj.filename)) {
      throw new Error("Invalid config: filename must be an object");
    }
    const fn = obj.filename as Record<string, unknown>;
    if ("maxSlugLength" in fn) {
      if (typeof fn.maxSlugLength !== "number" || fn.maxSlugLength <= 0) {
        throw new Error("Invalid config: filename.maxSlugLength must be a positive number");
      }
    }
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
