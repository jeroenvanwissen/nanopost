import { Command } from "commander";
import { cmdInit } from "./commands/init";
import { cmdNew, type NewOptions } from "./commands/new";
import { cmdDoctor, printDoctorResults } from "./commands/doctor";
import { cmdList } from "./commands/list";
import { cmdLast } from "./commands/last";
import { cmdEdit } from "./commands/edit";

const program = new Command();

program
  .name("nanopost")
  .description("Write small thoughts. Commit them to your repo.")
  .version("0.2.3")
  .enablePositionalOptions()
  .passThroughOptions();

program
  .command("init")
  .description("Initialize .nanopost/ in the current project")
  .option("--github", "create and enable the GitHub publishing plugin")
  .option("--force", "overwrite existing files")
  .action((opts) => {
    cmdInit(process.cwd(), { github: !!opts.github, force: !!opts.force });
  });

program
  .command("new")
  .description("Create a new nanopost post (interactive)")
  .option("--title <words...>", "override title")
  .option("--tags <tags>", "comma-separated tags")
  .option("--type <type>", "post type to create")
  .option("--edit", "open editor to edit body")
  .option("--dry-run", "print markdown to stdout without writing")
  .option("--no-publish", "do not run plugins after saving")
  .action(async (opts) => {
    await cmdNew(process.cwd(), [], normalizeNewOpts(opts));
  });

program
  .command("doctor")
  .description("Check project setup and report issues")
  .action(() => {
    const { results, ok } = cmdDoctor(process.cwd());
    printDoctorResults(results, ok);
  });

program
  .command("list")
  .description("List all posts (newest first)")
  .option("--limit <n>", "show only the first N posts", parseInt)
  .option("--json", "output as JSON array")
  .option("--grep <text>", "filter posts by title or body text")
  .option("--type <type>", "filter by post type")
  .action((opts) => {
    cmdList(process.cwd(), {
      limit: opts.limit,
      json: !!opts.json,
      grep: opts.grep,
      type: opts.type,
    });
  });

program
  .command("last")
  .description("Show the most recent post")
  .option("--edit", "open the last post in your editor")
  .option("--path", "print only the file path")
  .option("--json", "output as JSON")
  .option("--type <type>", "filter by post type")
  .action(async (opts) => {
    await cmdLast(process.cwd(), {
      edit: !!opts.edit,
      path: !!opts.path,
      json: !!opts.json,
      type: opts.type,
    });
  });

// Default command (inline / piped / interactive)
program
  .argument("[text...]", "inline post text")
  .option("--title <words...>", "override title")
  .option("--tags <tags>", "comma-separated tags")
  .option("--type <type>", "post type to create")
  .option("--edit", "open editor to edit body")
  .option("--dry-run", "print markdown to stdout without writing")
  .option("--no-publish", "do not run plugins after saving")
  .action(async (text: string[], opts) => {
    // If a single argument is a path to an existing .md file with --edit, edit it
    const hasArgs = (text?.length ?? 0) > 0;
    if (hasArgs && opts.edit && text.length === 1) {
      await cmdEdit(process.cwd(), text[0]);
      return;
    }

    // If no args and no stdin: show help (not interactive) to keep contract clean.
    // Users can run `nanopost new` for interactive.
    const hasStdin = !process.stdin.isTTY;
    if (!hasArgs && !hasStdin) {
      program.help();
      return;
    }
    await cmdNew(process.cwd(), text ?? [], normalizeNewOpts(opts));
  });

program.parseAsync(process.argv);

/** Raw option shape from Commander for `new`/default commands. */
interface CommanderNewOpts {
  title?: string[];
  tags?: string;
  type?: string;
  edit?: boolean;
  dryRun?: boolean;
  /** Commander negated options: --no-publish becomes publish: false */
  publish?: boolean;
}

function normalizeNewOpts(opts: CommanderNewOpts): NewOptions {
  return {
    title: opts.title ? opts.title.join(" ") : undefined,
    tags: opts.tags,
    type: opts.type,
    edit: !!opts.edit,
    dryRun: !!opts.dryRun,
    noPublish: opts.publish === false,
  };
}
