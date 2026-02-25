# nanopost

> Write small thoughts. Commit them to your repo.

`nanopost` is a tiny CLI for capturing **short posts, dev notes, and status updates** as Markdown files inside your project.

No CMS. No UI. No friction.

## Install

```bash
npm install -g @jeroenvanwissen/nanopost
```

> You can keep the command name `nanopost` even if the npm package name is scoped.

## Setup (per project)

From your repo root:

```bash
nanopost init
```

This creates a `.nanopost/` folder with project-local config and plugins.

## Usage

### Inline (fastest)

```bash
nanopost Today we started working on a new tool called nanopost.
```

### Piped input (powerful)

```bash
git diff | nanopost --title "Refactor notes"
echo "Shipped a small improvement" | nanopost
```

### Interactive

```bash
nanopost new
```

## Behavior (contract)

Input precedence:

1. `stdin` (if not TTY)
2. positional args
3. interactive prompts

Flags:

- `--title <string>`
- `--status <string>`
- `--tags <a,b,c>`
- `--edit`
- `--dry-run`
- `--no-publish`

## Output

Default filename format:

`YYYY-MM-DD-<slug>.md`

Frontmatter always includes:

- `title`
- `date`

Optional:

- `status`
- `tags`

## Plugins (optional)

Plugins run lifecycle hooks after posts are saved. They are loaded from two locations (checked in order):

1. `.nanopost/plugins/<name>.js` — local project plugins (preferred)
2. `node_modules/nanopost-plugin-<name>` — installed npm packages

### Plugin interface

A plugin is a CommonJS module that exports a `NanopostPlugin` object:

```js
// .nanopost/plugins/notify.js
module.exports = {
  name: "notify",

  async onPostSaved({
    filePath,
    frontmatter,
    body,
    projectRoot,
    nanopostDir,
    config,
    pluginConfig,
  }) {
    // filePath      — absolute path to the saved .md file
    // frontmatter   — parsed frontmatter object (title, date, status, tags, ...)
    // body          — the post body text (without frontmatter)
    // projectRoot   — absolute path to the project root
    // nanopostDir   — absolute path to .nanopost/
    // config        — the full NanopostConfig object
    // pluginConfig  — this plugin's entry from config.plugins (name, enabled, options)

    console.log(`Post saved: ${frontmatter.title} → ${filePath}`);
  },
};
```

For a complete guide on writing plugins, see [docs/plugins.md](docs/plugins.md).

### Plugin configuration

Register plugins in `.nanopost/config.json`:

```json
{
  "plugins": [{ "name": "notify", "enabled": true, "options": { "channel": "#dev" } }]
}
```

| Field       | Type                        | Description                               |
| ----------- | --------------------------- | ----------------------------------------- |
| **name**    | `string`                    | Plugin name (matches filename or package) |
| **enabled** | `boolean` (default: `true`) | Set to `false` to skip loading            |
| **options** | `Record<string, unknown>`   | Arbitrary config passed to the plugin     |

### Lifecycle hooks

| Hook          | When it runs                        |
| ------------- | ----------------------------------- |
| `onPostSaved` | After a new post is written to disk |

Hooks can be synchronous or async (return a `Promise`). Plugins run sequentially in the order they appear in the `plugins` array.

### Error behavior

If a plugin fails to load or throws during a hook, nanopost logs a warning and continues. Other plugins still run. No post data is lost.

---

If it ever starts feeling like a CMS, it's doing too much.
