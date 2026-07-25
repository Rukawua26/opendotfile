#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { exit } from "node:process";
import { MemoryAdapter } from "./adapter.js";

const DEFAULT_DB_PATH = join(
  process.env.HOME || process.env.USERPROFILE || "/tmp",
  ".local",
  "share",
  "opencode",
  "memory-adapter",
  "memory.db",
);

function requireOption(args, name) {
  if (!args[name]) throw new Error(`--${name} required`);
  return args[name];
}

function projectIdentity(args) {
  if (args.project) return args.project;
  const root = resolve(args.path || process.cwd());
  const suffix = createHash("sha256").update(root).digest("hex").slice(0, 12);
  return `${basename(root)}-${suffix}`;
}

function writeJson(filePath, data) {
  const target = resolve(filePath);
  mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
  writeFileSync(target, JSON.stringify(data, null, 2), { mode: 0o600 });
  chmodSync(target, 0o600);
  return target;
}

async function withAdapter(args, callback) {
  const adapter = new MemoryAdapter(args.db || DEFAULT_DB_PATH).init();
  try {
    return await callback(adapter);
  } finally {
    adapter.close();
  }
}

const commands = {
  init: {
    description: "Initialize the memory database",
    run: (args) => withAdapter(args, async (adapter) => {
      console.log(`[OK] Database initialized at ${adapter.dbPath}`);
    }),
  },
  "save-decision": {
    description: "Persist a user-approved decision",
    run: (args) => withAdapter(args, async (adapter) => {
      const result = adapter.saveDecision({
        project: projectIdentity(args),
        projectPath: args.path || process.cwd(),
        title: requireOption(args, "title"),
        content: requireOption(args, "content"),
        rationale: args.rationale,
        tags: args.tags,
        category: args.category,
        isPrivate: Boolean(args.private),
      });
      console.log(`[OK] Decision saved (${result.id})`);
    }),
  },
  "save-bug": {
    description: "Persist a user-approved bug fix",
    run: (args) => withAdapter(args, async (adapter) => {
      const result = adapter.saveBugFix({
        project: projectIdentity(args),
        projectPath: args.path || process.cwd(),
        title: requireOption(args, "title"),
        description: requireOption(args, "description"),
        fix: requireOption(args, "fix"),
        rootCause: args["root-cause"],
        lesson: args.lesson,
        tags: args.tags,
      });
      console.log(`[OK] Bug fix saved (${result.id})`);
    }),
  },
  "save-architecture": {
    description: "Persist a user-approved architecture note",
    run: (args) => withAdapter(args, async (adapter) => {
      const result = adapter.saveArchitecture({
        project: projectIdentity(args),
        projectPath: args.path || process.cwd(),
        component: requireOption(args, "component"),
        description: requireOption(args, "description"),
        rationale: args.rationale,
        tags: args.tags,
      });
      console.log(`[OK] Architecture note saved (${result.id})`);
    }),
  },
  "save-preference": {
    description: "Persist a user-approved project preference",
    run: (args) => withAdapter(args, async (adapter) => {
      const result = adapter.savePreference({
        project: projectIdentity(args),
        projectPath: args.path || process.cwd(),
        key: requireOption(args, "key"),
        value: requireOption(args, "value"),
      });
      console.log(`[OK] Preference saved (${result.id})`);
    }),
  },
  export: {
    description: "Export project memory to JSON",
    run: (args) => withAdapter(args, async (adapter) => {
      const project = projectIdentity(args);
      const data = adapter.exportProject({
        project,
        projectPath: args.path || process.cwd(),
        includePrivate: Boolean(args["include-private"]),
        includeOperational: Boolean(args["include-operational"]),
      });
      const target = writeJson(args.out || "memory-export.json", data);
      console.log(`[OK] Exported to ${target}`);
    }),
  },
  import: {
    description: "Import project memory from JSON",
    run: (args) => withAdapter(args, async (adapter) => {
      const file = requireOption(args, "file");
      if (!existsSync(file)) throw new Error(`File not found: ${file}`);
      const data = JSON.parse(readFileSync(file, "utf8"));
      const result = adapter.importProject(data);
      console.log(`[OK] Imported project ${data.project.name} (${result.projectId})`);
    }),
  },
  sync: {
    description: "Export safe project memory and optionally commit it",
    run: (args) => withAdapter(args, async (adapter) => {
      const project = projectIdentity(args);
      const target = writeJson(
        args.out || join(
          process.env.HOME || process.env.USERPROFILE || "/tmp",
          ".local",
          "share",
          "opencode",
          "memory-sync",
          `${project}.json`,
        ),
        adapter.exportProject({ project, projectPath: args.path || process.cwd() }),
      );
      console.log(`[OK] Exported to ${target}`);
      if (!args.commit) return;
      execFileSync("git", ["add", "--", target], { cwd: args.path || process.cwd(), stdio: "inherit" });
      execFileSync("git", ["commit", "-m", `chore: sync memory for ${project}`], {
        cwd: args.path || process.cwd(),
        stdio: "inherit",
      });
    }),
  },
  "export-obsidian": {
    description: "Export decisions and bugs as Obsidian Markdown",
    run: (args) => withAdapter(args, async (adapter) => {
      const result = await adapter.exportToObsidian({
        project: projectIdentity(args),
        projectPath: args.path || process.cwd(),
        outputDir: args.out,
        includeBugs: Boolean(args["include-operational"]),
      });
      console.log(`[OK] Exported ${result.decisions} decisions and ${result.bugs} bugs to ${result.outputDir}`);
    }),
  },
  status: {
    description: "Show project memory status",
    run: (args) => withAdapter(args, async (adapter) => {
      console.log(JSON.stringify(adapter.getContext({
        project: projectIdentity(args),
        projectPath: args.path || process.cwd(),
      }), null, 2));
    }),
  },
};

const argv = process.argv.slice(2);
const options = {};
let command;
for (let index = 0; index < argv.length; index++) {
  const value = argv[index];
  if (!value.startsWith("--") && !command) {
    command = value;
  } else if (value.startsWith("--")) {
    const key = value.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      options[key] = next;
      index++;
    } else {
      options[key] = true;
    }
  }
}

if (!command || !commands[command]) {
  console.log("Usage: memory-adapter <command> [options]\n\nCommands:");
  for (const [name, definition] of Object.entries(commands)) {
    console.log(`  ${name.padEnd(18)} ${definition.description}`);
  }
  console.log("\nOptions: --db --project --path --out --file --title --content --description --fix --private --include-private --include-operational --commit");
  exit(command ? 1 : 0);
}

commands[command].run(options).catch((error) => {
  console.error(`[ERROR] ${error.message}`);
  exit(1);
});
