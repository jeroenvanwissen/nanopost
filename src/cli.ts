import { Command } from "commander";
import { cmdInit } from "./commands/init";
import { cmdNew, type NewOptions } from "./commands/new";
import { cmdDoctor, printDoctorResults } from "./commands/doctor";
import { cmdList } from "./commands/list";
import { cmdLast } from "./commands/last";

const program = new Command();

program
  .name("nanopost")
  .description("Write small thoughts. Commit them to your repo.")
  .version("0.1.0");

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
  .option("--title <title>", "override title")
  .option("--status <status>", "set status")
  .option("--tags <tags>", "comma-separated tags")
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
  .action((opts) => {
    cmdList(process.cwd(), {
      limit: opts.limit,
      json: !!opts.json,
      grep: opts.grep,
    });
  });

program
  .command("last")
  .description("Show the most recent post")
  .option("--edit", "open the last post in your editor")
  .option("--path", "print only the file path")
  .option("--json", "output as JSON")
  .action((opts) => {
    cmdLast(process.cwd(), {
      edit: !!opts.edit,
      path: !!opts.path,
      json: !!opts.json,
    });
  });

// Default command (inline / piped / interactive)
program
  .argument("[text...]", "inline post text")
  .option("--title <title>", "override title")
  .option("--status <status>", "set status")
  .option("--tags <tags>", "comma-separated tags")
  .option("--edit", "open editor to edit body")
  .option("--dry-run", "print markdown to stdout without writing")
  .option("--no-publish", "do not run plugins after saving")
  .action(async (text: string[], opts) => {
    // If no args and no stdin: show help (not interactive) to keep contract clean.
    // Users can run `nanopost new` for interactive.
    const hasArgs = (text?.length ?? 0) > 0;
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
  title?: string;
  status?: string;
  tags?: string;
  edit?: boolean;
  dryRun?: boolean;
  /** Commander negated options: --no-publish becomes publish: false */
  publish?: boolean;
}

function normalizeNewOpts(opts: CommanderNewOpts): NewOptions {
  return {
    title: opts.title,
    status: opts.status,
    tags: opts.tags,
    edit: !!opts.edit,
    dryRun: !!opts.dryRun,
    noPublish: opts.publish === false,
  };
}
