import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tool } from "@opencode-ai/plugin";

const HOME = process.env.HOME || process.env.USERPROFILE || '/tmp';
const DATA_DIR = join(HOME, '.local/share/opencode/plugins-data');
const KANBAN_FILE = join(DATA_DIR, 'kanban.json');

const STATUSES = ['todo', 'in_progress', 'done', 'blocked'];

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function load() {
  ensureDir();
  if (!existsSync(KANBAN_FILE)) return [];
  try { return JSON.parse(readFileSync(KANBAN_FILE, 'utf-8')); }
  catch { return []; }
}

function save(tasks) {
  ensureDir();
  writeFileSync(KANBAN_FILE, JSON.stringify(tasks, null, 2));
}

let _id = 0;
function genId() { return `t${Date.now()}_${++_id}`; }
function shortId(id) { return (parseInt(id.split('_')[1], 10) || 0).toString(16).toUpperCase(); }

export const kanbanPlugin = async () => {
  return {
    tool: {
      kanban_create: tool({
        description: "Crear una tarea en el tablero Kanban. Úsalo cuando el usuario mencione algo que hacer o recordar.",
        args: {
          title: tool.schema.string().describe("Título corto de la tarea"),
          description: tool.schema.string().optional().describe("Descripción detallada"),
          priority: tool.schema.enum(["low", "medium", "high"]).optional().default("medium").describe("Prioridad"),
        },
        async execute(args, ctx) {
          const tasks = load();
          const task = {
            id: genId(),
            title: args.title,
            description: args.description || '',
            priority: args.priority || 'medium',
            status: 'todo',
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
          };
          tasks.push(task);
          save(tasks);
          ctx.metadata({ title: `📋 ${task.title.slice(0, 40)}` });
          return `✅ Tarea creada: "${task.title}" (${task.priority}, #${shortId(task.id)})`;
        },
      }),

      kanban_list: tool({
        description: "Listar tareas del tablero Kanban, opcionalmente filtradas por estado.",
        args: {
          status: tool.schema.enum(["todo", "in_progress", "done", "blocked", "all"]).optional().default("all").describe("Filtrar por estado"),
        },
        async execute(args) {
          const tasks = load();
          const filtered = args.status === 'all' ? tasks : tasks.filter(t => t.status === args.status);
          if (filtered.length === 0) return "📭 No hay tareas" + (args.status !== 'all' ? ` con estado "${args.status}"` : '');

          const group = {};
          for (const t of filtered) {
            if (!group[t.status]) group[t.status] = [];
            group[t.status].push(t);
          }

          const lines = [];
          for (const status of STATUSES) {
            if (!group[status]) continue;
            const icon = { todo: '📄', in_progress: '🔄', done: '✅', blocked: '🚫' }[status] || '📋';
            lines.push(`\n${icon} ${status}:`);
            for (const t of group[status]) {
              lines.push(`  #${shortId(t.id)} ${t.title} [${t.priority}]`);
            }
          }
          return lines.join('\n');
        },
      }),

      kanban_update: tool({
        description: "Cambiar el estado de una tarea existente en el tablero.",
        args: {
          id: tool.schema.string().describe("ID o parte del ID de la tarea"),
          status: tool.schema.enum(["todo", "in_progress", "done", "blocked"]).describe("Nuevo estado"),
        },
        async execute(args, ctx) {
          const tasks = load();
          const match = tasks.filter(t => t.id.includes(args.id) || t.title.toLowerCase().includes(args.id.toLowerCase()));
          if (match.length === 0) return "⚠️ No se encontró tarea con ese ID.";
          if (match.length > 1) return `⚠️ Múltiples tareas coinciden: ${match.map(t => `#${shortId(t.id)} ${t.title}`).join(', ')}. Sé más específico.`;
          match[0].status = args.status;
          match[0].updated = new Date().toISOString();
          save(tasks);
          ctx.metadata({ title: `🔄 ${match[0].title.slice(0, 40)} → ${args.status}` });
          return `✅ "${match[0].title}" → ${args.status}`;
        },
      }),

      kanban_delete: tool({
        description: "Eliminar una tarea del tablero Kanban.",
        args: {
          id: tool.schema.string().describe("ID o parte del ID de la tarea a eliminar"),
        },
        async execute(args, ctx) {
          const tasks = load();
          const match = tasks.filter(t => t.id.includes(args.id) || t.title.toLowerCase().includes(args.id.toLowerCase()));
          if (match.length === 0) return "⚠️ No se encontró tarea.";
          if (match.length > 1) return `⚠️ Múltiples tareas coinciden. Sé más específico.`;
          const idx = tasks.findIndex(t => t.id === match[0].id);
          tasks.splice(idx, 1);
          save(tasks);
          ctx.metadata({ title: `🗑️ ${match[0].title.slice(0, 40)}` });
          return `🗑️ Eliminada: "${match[0].title}"`;
        },
      }),
    },
  };
};

export default kanbanPlugin;
