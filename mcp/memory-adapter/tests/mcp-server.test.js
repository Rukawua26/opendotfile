import { after, before, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { MemoryAdapter } from "../src/adapter.js";

const HOME = "/tmp/test-memory-mcp";
const PROJECT_ROOT = join(HOME, "trusted-project");
const PROJECT_NAME = "trusted-project-test";
const DB_PATH = join(HOME, ".local", "share", "opencode", "memory-adapter", "memory.db");
const SERVER = new URL("../src/mcp-server.js", import.meta.url);

describe("memory MCP server", () => {
  let child;
  let buffer = "";
  const pending = [];

  function request(method, params) {
    const id = pending.length + 1;
    return new Promise((resolve, reject) => {
      pending.push({ id, resolve, reject });
      child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    });
  }

  before(() => {
    rmSync(HOME, { recursive: true, force: true });
    mkdirSync(PROJECT_ROOT, { recursive: true });
    const setup = new MemoryAdapter(DB_PATH).init();
    setup.saveDecision({
      project: PROJECT_NAME,
      projectPath: PROJECT_ROOT,
      title: "Trusted decision",
      content: "Visible only in the trusted project",
    });
    setup.saveDecision({
      project: "other-project",
      projectPath: join(HOME, "other-project"),
      title: "Other decision",
      content: "Must not cross project boundaries",
    });
    setup.close();
    child = spawn(process.execPath, [SERVER.pathname], {
      cwd: PROJECT_ROOT,
      env: {
        ...process.env,
        HOME,
        PATH: process.env.PATH,
        OPENCODE_PROJECT_ROOT: PROJECT_ROOT,
        OPENCODE_PROJECT_NAME: PROJECT_NAME,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });
    child.stdout.on("data", (chunk) => {
      buffer += chunk.toString();
      let newline;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const message = JSON.parse(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
        const index = pending.findIndex((item) => item.id === message.id);
        if (index >= 0) pending.splice(index, 1)[0].resolve(message);
      }
    });
  });

  after(() => {
    child.stdin.end();
    child.kill();
    rmSync(HOME, { recursive: true, force: true });
  });

  it("exposes only read-only tools without private export", async () => {
    await request("initialize", {});
    const response = await request("tools/list", {});
    const names = response.result.tools.map((item) => item.name);
    const exportTool = response.result.tools.find((item) => item.name === "export_project");

    assert.ok(!names.includes("import_project"));
    assert.ok(!names.includes("export_to_obsidian"));
    assert.ok(!names.some((name) => name.startsWith("save_")));
    assert.ok(!Object.hasOwn(exportTool.inputSchema.properties, "includePrivate"));
    assert.ok(!Object.hasOwn(exportTool.inputSchema.properties, "project"));
  });

  it("rejects unknown arguments and invalid types", async () => {
    const response = await request("tools/call", {
      name: "search_memory",
      arguments: {
        query: "decision",
        limit: "unbounded",
      },
    });

    assert.strictEqual(response.result.isError, true);
    assert.match(response.result.content[0].text, /limit must be a number/);
  });

  it("binds reads to the trusted project without creating metadata", async () => {
    const context = await request("tools/call", { name: "get_context", arguments: {} });
    const payload = JSON.parse(context.result.content[0].text);
    assert.deepStrictEqual(payload.recentDecisions.map((item) => item.title), ["Trusted decision"]);

    const database = new MemoryAdapter(DB_PATH).init();
    const projects = database.db.prepare("SELECT name FROM projects ORDER BY name").all();
    database.close();
    assert.deepStrictEqual(projects.map((item) => item.name), ["other-project", PROJECT_NAME]);
  });
});
