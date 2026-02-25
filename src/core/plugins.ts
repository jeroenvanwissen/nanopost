import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import type { NanopostConfig, PluginConfig } from "./config";
import type { Frontmatter } from "./frontmatter";

export interface PostSavedContext {
  filePath: string;
  projectRoot: string;
  nanopostDir: string;
  config: NanopostConfig;
  pluginConfig?: PluginConfig;
  frontmatter: Frontmatter;
  body: string;
}

export interface NanopostPlugin {
  name: string;
  onPostSaved?: (args: PostSavedContext) => Promise<void> | void;
}

export interface PluginRunResult {
  plugin: string;
  success: boolean;
  error?: Error;
}

const requireCjs = createRequire(__filename);

/** Maps loaded plugins to their configuration. */
const pluginConfigMap = new WeakMap<NanopostPlugin, PluginConfig>();

export function getPluginConfig(plugin: NanopostPlugin): PluginConfig | undefined {
  return pluginConfigMap.get(plugin);
}

export function loadPlugins(
  nanopostDir: string,
  plugins: PluginConfig[] | undefined,
): NanopostPlugin[] {
  const list = (plugins ?? []).filter((p) => p.enabled !== false);
  const out: NanopostPlugin[] = [];

  for (const p of list) {
    try {
      const localPath = path.join(nanopostDir, "plugins", `${p.name}.js`);
      let mod: unknown;

      if (fs.existsSync(localPath)) {
        mod = requireCjs(localPath);
      } else {
        mod = requireCjs(`nanopost-plugin-${p.name}`);
      }

      const raw = mod as Record<string, unknown> | null | undefined;
      const plugin = (raw?.default ?? raw) as NanopostPlugin;
      if (!plugin?.name) plugin.name = p.name;
      pluginConfigMap.set(plugin, p);
      out.push(plugin);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Plugin "${p.name}" failed to load: ${message}`);
    }
  }

  return out;
}

export async function runOnPostSaved(
  plugins: NanopostPlugin[],
  ctx: Omit<PostSavedContext, "pluginConfig">,
): Promise<PluginRunResult[]> {
  const results: PluginRunResult[] = [];

  for (const plugin of plugins) {
    if (plugin.onPostSaved) {
      try {
        const pluginConfig = pluginConfigMap.get(plugin);
        await plugin.onPostSaved({ ...ctx, pluginConfig });
        results.push({ plugin: plugin.name, success: true });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error(`Plugin "${plugin.name}" error: ${error.message}`);
        results.push({ plugin: plugin.name, success: false, error });
      }
    }
  }

  return results;
}
