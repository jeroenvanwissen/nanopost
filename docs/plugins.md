# Writing nanopost plugins

Plugins let you run custom code after a post is saved. Common use cases:

- Commit and push the post to git
- Post a notification to Slack, Discord, or a webhook
- Sync the post to an external CMS or API
- Generate a summary, RSS feed, or index file
- Validate post content or frontmatter

## Quick start

Create a file at `.nanopost/plugins/hello.js`:

```js
module.exports = {
  name: "hello",

  async onPostSaved({ filePath, frontmatter, body }) {
    console.log(`Saved "${frontmatter.title}" (${frontmatter.date})`);
    console.log(`File: ${filePath}`);
    console.log(`Body length: ${body.length} chars`);
  },
};
```

Register it in `.nanopost/config.json`:

```json
{
  "plugins": [{ "name": "hello", "enabled": true }]
}
```

Run `nanopost Hello world` and you'll see the plugin output after the post is written.

## Plugin interface

A plugin is a CommonJS module that exports an object with a `name` and one or more lifecycle hooks.

```js
module.exports = {
  name: "my-plugin",

  async onPostSaved(ctx) {
    // called after a post is saved to disk
  },
};
```

The module can use `module.exports` or `exports.default` (for TypeScript compiled to CJS).

### `name` (required)

A string identifier for your plugin. Used in log messages and error reports. If omitted, nanopost assigns the name from the config entry.

### `onPostSaved(ctx)` (optional)

Called after a new post has been written to disk. Can be synchronous or async (return a `Promise`).

## Hook context

The `onPostSaved` hook receives a single context object with these properties:

| Property       | Type                        | Description                                         |
| -------------- | --------------------------- | --------------------------------------------------- |
| `filePath`     | `string`                    | Absolute path to the saved `.md` file               |
| `frontmatter`  | `Record<string, unknown>`   | Parsed frontmatter as a plain object                |
| `body`         | `string`                    | The post body text (without frontmatter delimiters) |
| `projectRoot`  | `string`                    | Absolute path to the project root                   |
| `nanopostDir`  | `string`                    | Absolute path to the `.nanopost/` directory         |
| `config`       | `NanopostConfig`            | The full merged configuration object                |
| `pluginConfig` | `PluginConfig \| undefined` | This plugin's entry from `config.plugins`           |

### Frontmatter object

The `frontmatter` object contains the same key-value pairs that are written to the YAML block at the top of the post file. Typical fields:

```js
{
  title: "My post title",
  date: "2026-02-25",
  status: "note",        // from config defaults or --status flag
  tags: ["dev", "idea"]  // from --tags flag (array of strings)
}
```

The exact fields depend on your `frontmatter.defaults` config and what the user passes via flags or interactive prompts. Your plugin should handle missing fields gracefully:

```js
async onPostSaved({ frontmatter }) {
  const tags = frontmatter.tags ?? [];
  const status = frontmatter.status ?? "unknown";
  // ...
}
```

### Plugin config and options

You can pass arbitrary options to your plugin via the `options` field in `config.json`:

```json
{
  "plugins": [
    {
      "name": "notify",
      "enabled": true,
      "options": {
        "webhookUrl": "https://hooks.slack.com/...",
        "channel": "#dev"
      }
    }
  ]
}
```

Access them in your hook via `pluginConfig.options`:

```js
module.exports = {
  name: "notify",

  async onPostSaved({ frontmatter, pluginConfig }) {
    const opts = pluginConfig?.options ?? {};
    const url = opts.webhookUrl;
    if (!url) {
      console.warn("notify: no webhookUrl configured, skipping");
      return;
    }

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `New post: ${frontmatter.title}`,
        channel: opts.channel,
      }),
    });
  },
};
```

## Where plugins are loaded from

Plugins are resolved in this order:

1. **Local file**: `.nanopost/plugins/<name>.js`
2. **npm package**: `nanopost-plugin-<name>`

Local files take priority. This lets you override an npm plugin with a project-local version.

### Local plugins

Place your `.js` file in `.nanopost/plugins/`. The file name (without extension) must match the `name` in your config:

```
.nanopost/
  config.json          ← plugins: [{ "name": "notify" }]
  plugins/
    notify.js          ← loaded as "notify"
```

### npm plugins

Publish your plugin to npm with the naming convention `nanopost-plugin-<name>`:

```
npm install nanopost-plugin-notify
```

```json
{
  "plugins": [{ "name": "notify" }]
}
```

nanopost will `require("nanopost-plugin-notify")` if no local file is found.

## Execution order and error handling

- Plugins run **sequentially** in the order they appear in the `plugins` array.
- Each plugin is wrapped in a try/catch. If one plugin throws, the error is logged and the remaining plugins still run.
- A failing plugin never prevents the post from being saved. The file is already on disk before plugins execute.
- Use `--no-publish` to skip all plugin execution: `nanopost --no-publish "Quick note"`.

## Examples

### Git commit and push

```js
const { execSync } = require("node:child_process");

module.exports = {
  name: "git-push",

  async onPostSaved({ filePath, frontmatter }) {
    const title = frontmatter.title ?? "new post";
    execSync(`git add "${filePath}"`);
    execSync(`git commit -m "post: ${title}"`);
    execSync("git push", { stdio: "inherit" });
  },
};
```

### Tag-based routing

```js
const fs = require("node:fs");
const path = require("node:path");

module.exports = {
  name: "tag-index",

  async onPostSaved({ frontmatter, filePath, projectRoot }) {
    const tags = frontmatter.tags ?? [];
    if (tags.length === 0) return;

    const indexPath = path.join(projectRoot, "tags.json");
    const index = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, "utf8")) : {};

    for (const tag of tags) {
      if (!index[tag]) index[tag] = [];
      if (!index[tag].includes(filePath)) {
        index[tag].push(filePath);
      }
    }

    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), "utf8");
    console.log(`tag-index: updated ${tags.length} tag(s)`);
  },
};
```

### Webhook notification

```js
module.exports = {
  name: "webhook",

  async onPostSaved({ frontmatter, body, pluginConfig }) {
    const url = pluginConfig?.options?.url;
    if (!url) return;

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: frontmatter.title,
        date: frontmatter.date,
        status: frontmatter.status,
        tags: frontmatter.tags ?? [],
        excerpt: body.slice(0, 280),
      }),
    });
  },
};
```

### Post validation

```js
module.exports = {
  name: "validate",

  onPostSaved({ frontmatter, body }) {
    if (!frontmatter.title || frontmatter.title === "Note") {
      console.warn("validate: post has no meaningful title");
    }
    if (body.length < 10) {
      console.warn("validate: post body is very short");
    }
    if (body.length > 5000) {
      console.warn("validate: post body exceeds 5000 chars — is this still a nanopost?");
    }
  },
};
```

## Writing plugins in TypeScript

You can author plugins in TypeScript and compile to CommonJS. Define the context type inline or copy it from the source:

```ts
// Type definition (mirrors src/core/plugins.ts → PostSavedContext)
type PostSavedContext = {
  filePath: string;
  projectRoot: string;
  nanopostDir: string;
  config: Record<string, unknown>;
  pluginConfig?: { name: string; enabled?: boolean; options?: Record<string, unknown> };
  frontmatter: Record<string, unknown>;
  body: string;
};

type NanopostPlugin = {
  name: string;
  onPostSaved?: (ctx: PostSavedContext) => Promise<void> | void;
};

const plugin: NanopostPlugin = {
  name: "my-ts-plugin",

  async onPostSaved(ctx) {
    console.log(ctx.frontmatter.title);
  },
};

export default plugin;
```

Compile with `tsc` (targeting CommonJS) and place the output `.js` file in `.nanopost/plugins/` or publish it as an npm package.

## Tips

- Keep plugins fast. They run synchronously in sequence, so a slow plugin delays the CLI returning.
- Use `pluginConfig.options` for anything configurable -- don't hardcode URLs, paths, or tokens.
- Log with `console.log` or `console.warn`. nanopost doesn't capture stdout/stderr from plugins.
- Test your plugin by running `nanopost --dry-run "test"` first (plugins are skipped), then `nanopost "test"` to trigger the real flow.
- Use `--no-publish` during development to save posts without triggering plugins.
