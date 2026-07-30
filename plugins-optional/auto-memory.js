import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tool } from "@opencode-ai/plugin";

const HOME = process.env.HOME || process.env.USERPROFILE || "/tmp";
const DATA_DIR = join(HOME, ".local", "share", "opencode", "plugins-data");
const STATE_FILE = join(DATA_DIR, "auto-memory-state.json");
const LOG_FILE = join(DATA_DIR, "auto-memory.log");

const PATTERNS = {
  decision: /\b(decidimos|decision|elegimos|usaremos|optamos por)\b/i,
  bug: /\b(bug|error|exception|crash|causa raiz|root cause|corregido|fix)\b/i,
  architecture: /\b(arquitectura|componente|interfaz|patron de diseno|design pattern)\b/i,
};

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
}

function loadState() {
  ensureDir();
  if (!existsSync(STATE_FILE)) return { candidates: [] };
  try {
    const state = JSON.parse(readFileSync(STATE_FILE, "utf8"));
    return Array.isArray(state.candidates) ? state : { candidates: [] };
  } catch {
    return { candidates: [] };
  }
}

function saveState(state) {
  ensureDir();
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), { mode: 0o600 });
}

function compact(text, max = 500) {
  return text.replace(/\s+/g, " ").trim().slice(0, max);
}

function extractTags(text) {
  return [...new Set(text.match(/#[a-z0-9_-]+/gi) || [])].slice(0, 5);
}

function detect(type, content) {
  if (!PATTERNS[type]?.test(content)) return null;
  const summary = compact(content);
  return {
    type,
    title: summary.slice(0, 80),
    content: summary,
    tags: extractTags(content),
  };
}

export const autoMemoryPlugin = async () => ({
  tool: {
    auto_memory_capture: tool({
      description: "Detecta y encola una decision, bug o nota de arquitectura para guardarla despues en memory-adapter.",
      args: {
        type: tool.schema.enum(["decision", "bug", "architecture"]),
        content: tool.schema.string(),
        project: tool.schema.string(),
        projectPath: tool.schema.string(),
      },
      async execute(args) {
        const candidate = detect(args.type, args.content);
        if (!candidate) return "No se detecto informacion de memoria suficiente.";

        const state = loadState();
        const entry = {
          ...candidate,
          project: args.project,
          projectPath: args.projectPath,
          createdAt: new Date().toISOString(),
        };
        state.candidates.push(entry);
        state.candidates = state.candidates.slice(-100);
        saveState(state);
        appendFileSync(LOG_FILE, `${entry.createdAt} ${entry.type} ${entry.title}\n`, { mode: 0o600 });
        return `Candidato ${entry.type} encolado. Usa memory-adapter para persistirlo cuando este confirmado.`;
      },
    }),

    auto_memory_summary: tool({
      description: "Lista los candidatos de memoria detectados y pendientes de confirmacion.",
      args: {
        project: tool.schema.string().optional(),
      },
      async execute(args) {
        const state = loadState();
        const candidates = args.project
          ? state.candidates.filter((entry) => entry.project === args.project)
          : state.candidates;
        return JSON.stringify(candidates.slice(-20), null, 2);
      },
    }),
  },
});
