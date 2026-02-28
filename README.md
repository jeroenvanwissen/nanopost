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

- `--title <string>` - Override post title
- `--tags <a,b,c>` - Comma-separated tags
- `--type <type>` - Specify post type (e.g., blog, devlog)
- `--edit` - Open editor for body content
- `--dry-run` - Print output without writing file
- `--no-publish` - Skip running plugins

## Output

Default filename format:

`YYYY-MM-DD-<slug>.md`

Frontmatter always includes:

- `title`
- `date`

Optional:

- `tags`
- Any fields defined in `frontmatter.defaults`

## Configuration

The `.nanopost/config.json` file controls how posts are created and formatted.

### Post Types

Nanopost supports multiple post types, allowing you to organize different kinds of content with distinct settings. Each post type can have its own:

- Content directory
- Filename format
- Frontmatter schema and defaults
- Date format

**Example configuration:**

```json
{
  "defaultType": "blog",
  "editor": "code --wait",
  "postTypes": {
    "blog": {
      "contentDir": "content/blog",
      "dateFormat": "yyyy-MM-dd",
      "filename": {
        "format": "{date}-{title}",
        "maxSlugLength": 60
      },
      "frontmatter": {
        "schema": {
          "title": "string",
          "date": "date",
          "author": "string",
          "tags": "array",
          "draft": "boolean"
        },
        "defaults": {
          "author": "Your Name",
          "draft": false,
          "tags": []
        }
      }
    },
    "devlog": {
      "contentDir": "content/devlog",
      "filename": {
        "format": "{date}-devlog-{slug}",
        "maxSlugLength": 40
      },
      "frontmatter": {
        "defaults": {
          "progress": "in-progress",
          "hours": 0
        }
      }
    }
  },
  "plugins": []
}
```

**Creating posts with types:**

```bash
# Interactive - prompts for type selection
nanopost new

# Specify type via flag
nanopost new --type=devlog "Fixed the database bug"

# Quick post with default type
echo "New feature released" | nanopost
```

**Listing and filtering by type:**

```bash
# List all posts from all types
nanopost list

# List only devlog posts
nanopost list --type=devlog

# Show most recent post of any type
nanopost last

# Show most recent devlog post
nanopost last --type=devlog
```

See [examples/multi-type-config.json](examples/multi-type-config.json) for a complete example.

### Filename Format

You can customize the filename format using variables:

```json
{
  "filename": {
    "format": "{date}-{title}",
    "maxSlugLength": 40
  }
}
```

**Supported variables:**

- `{date}` - The post date (YYYY-MM-DD format)
- `{title}` - The post title (automatically slugified)
- `{slug}` - Same as title (for clarity)
- Any frontmatter field name

**Examples:**

- `"{date}-{title}"` → `2023-01-01-my-post.md`
- `"{date}-{type}-{title}"` → `2023-01-01-devlog-my-post.md`

Legacy format `"date-slug"` is still supported for backward compatibility.

### Frontmatter Schema

Define field types to ensure proper YAML formatting:

```json
{
  "frontmatter": {
    "schema": {
      "title": "string",
      "date": "date",
      "description": "string",
      "type": "string",
      "categories": "array",
      "draft": "boolean"
    },
    "defaults": {
      "type": "devlog",
      "categories": [],
      "draft": true,
      "description": ""
    }
  }
}
```

**Supported types:**

- `"string"` - Text values (quoted in YAML if needed)
- `"boolean"` - `true` or `false` (not quoted)
- `"number"` - Numeric values (not quoted)
- `"array"` - YAML arrays (e.g., `- item1`)
- `"date"` - Date strings (not quoted)
- `"object"` - Nested objects

**Why use schema types?**

Without schema types, all values are treated as strings:

```yaml
draft: "true" # ❌ string, not boolean
```

With schema types:

```yaml
draft: true # ✅ actual boolean
```

This is especially important for static site generators that expect specific types (e.g., Astro, Hugo, Jekyll).

**Example output:**

```yaml
---
categories:
  - Website
  - Feature
date: 2023-01-01
description: "Launched new website built with Astro.build."
draft: false
title: New Year, New Website
type: devlog
---
```

See [examples/multi-type-config.json](examples/multi-type-config.json) for a complete example with multiple post types.

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

### Plugin API Reference

**NanopostPlugin Interface:**

| Property      | Type                                               | Required | Description                |
| ------------- | -------------------------------------------------- | -------- | -------------------------- |
| `name`        | `string`                                           | Yes      | Plugin identifier          |
| `onPostSaved` | `(ctx: PostSavedContext) => Promise<void> \| void` | No       | Hook after post is written |

**PostSavedContext:**

| Field          | Type                        | Description                     |
| -------------- | --------------------------- | ------------------------------- |
| `filePath`     | `string`                    | Absolute path to saved .md file |
| `frontmatter`  | `Record<string, unknown>`   | Parsed frontmatter object       |
| `body`         | `string`                    | Post body text (no frontmatter) |
| `projectRoot`  | `string`                    | Absolute path to project root   |
| `nanopostDir`  | `string`                    | Absolute path to .nanopost/     |
| `config`       | `NanopostConfig`            | Full config object              |
| `pluginConfig` | `PluginConfig \| undefined` | This plugin's config entry      |

See [docs/plugins.md](docs/plugins.md) for complete examples and best practices.

### Error behavior

If a plugin fails to load or throws during a hook, nanopost logs a warning and continues. Other plugins still run. No post data is lost.

---

If it ever starts feeling like a CMS, it's doing too much.
