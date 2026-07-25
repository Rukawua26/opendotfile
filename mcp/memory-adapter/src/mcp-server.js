import { createInterface } from "node:readline";
import { createHash } from "node:crypto";
import { basename, resolve } from "node:path";
import { MemoryAdapter } from "./adapter.js";

const adapter = new MemoryAdapter().init();
const PROJECT_ROOT = resolve(process.env.OPENCODE_PROJECT_ROOT || process.cwd());
const PROJECT_NAME = process.env.OPENCODE_PROJECT_NAME || `${basename(PROJECT_ROOT)}-${createHash("sha256").update(PROJECT_ROOT).digest("hex").slice(0, 12)}`;

const TOOLS = [
  {
    name: "search_memory",
    description: "Search non-private project decisions and operational memory.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        category: { type: "string", enum: ["decisions", "bugs", "architecture"] },
        limit: { type: "number", default: 10 },
      },
      required: [],
    },
  },
  {
    name: "search_memory_semantic",
    description: "Search non-private memory using local Ollama embeddings when available.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        category: { type: "string", enum: ["decisions", "bugs", "architecture"] },
        limit: { type: "number", default: 10 },
      },
      required: ["query"],
    },
  },
  {
    name: "get_context",
    description: "Get recent non-private project context.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", default: 5 },
      },
      required: [],
    },
  },
  {
    name: "get_history",
    description: "Get project session history.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", default: 20 },
      },
      required: [],
    },
  },
  {
    name: "export_project",
    description: "Return shareable non-private decisions as JSON. Operational records are excluded.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

function validateToolArgs(name, args) {
  if (!args || typeof args !== "object" || Array.isArray(args)) throw new Error("Tool arguments must be an object");
  if (JSON.stringify(args).length > 50000) throw new Error("Tool arguments exceed 50000 bytes");

  const definition = TOOLS.find((candidate) => candidate.name === name);
  if (!definition) throw new Error(`Unknown tool: ${name}`);
  const properties = definition.inputSchema.properties;

  for (const key of definition.inputSchema.required || []) {
    if (args[key] === undefined || args[key] === null || args[key] === "") throw new Error(`${key} is required`);
  }
  for (const [key, value] of Object.entries(args)) {
    const schema = properties[key];
    if (!schema) throw new Error(`Unknown argument: ${key}`);
    if (schema.type === "string" && typeof value !== "string") throw new Error(`${key} must be a string`);
    if (schema.type === "number" && typeof value !== "number") throw new Error(`${key} must be a number`);
    if (typeof value === "string" && value.length > 20000) throw new Error(`${key} exceeds 20000 characters`);
    if (schema.enum && !schema.enum.includes(value)) throw new Error(`${key} has an invalid value`);
  }

  return {
    ...args,
    limit: args.limit === undefined ? undefined : Math.max(1, Math.min(50, args.limit)),
  };
}

async function handleToolCall(name, rawArgs) {
  try {
    const args = validateToolArgs(name, rawArgs);
    const project = { project: PROJECT_NAME, projectPath: PROJECT_ROOT };
    const methods = {
      search_memory: () => adapter.searchMemory({ ...project, ...args, semantic: false }),
      search_memory_semantic: () => adapter.searchMemory({ ...project, ...args, semantic: true }),
      get_context: () => adapter.getContext({ ...project, ...args }),
      get_history: () => adapter.getHistory({ ...project, ...args }),
      export_project: () => adapter.exportProject(project),
    };
    return { content: [{ type: "text", text: JSON.stringify(methods[name]()) }] };
  } catch (error) {
    return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
  }
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

const input = createInterface({ input: process.stdin });
input.on("line", async (line) => {
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    send({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" } });
    return;
  }

  const { id, method, params } = message;
  if (method === "initialize") {
    send({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        serverInfo: { name: "memory-adapter", version: "1.3.0" },
        capabilities: { tools: { listChanged: false } },
      },
    });
  } else if (method === "tools/list") {
    send({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
  } else if (method === "tools/call") {
    send({ jsonrpc: "2.0", id, result: await handleToolCall(params?.name, params?.arguments || {}) });
  } else if (method === "ping") {
    send({ jsonrpc: "2.0", id, result: {} });
  } else if (method !== "initialized" && method !== "notifications/initialized") {
    send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
  }
});

input.on("close", () => {
  adapter.close();
});
