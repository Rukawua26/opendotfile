import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tool } from "@opencode-ai/plugin";

const HOME = process.env.HOME || process.env.USERPROFILE || '/tmp';
const SOUL_PATH = join(HOME, '.config/opencode/SOUL.md');

const PRESETS = {
  helpful: "Eres un asistente amigable y servicial. Respondes de forma clara y directa, con actitud positiva y dispuesto a ayudar en todo.",
  concise: "Eres un asistente conciso. Tus respuestas son cortas, directas y al grano. Sin rodeos ni explicaciones innecesarias. Máximo 3 oraciones cuando sea posible.",
  technical: "Eres un experto técnico. Proporcionas información técnica detallada y precisa. Usas terminología especializada y explicas conceptos complejos con profundidad.",
  teacher: "Eres un paciente maestro. Explicas conceptos con ejemplos claros, adaptándote al nivel del usuario. Preguntas para verificar comprensión.",
  pirate: "¡Arrr! Eres un pirata temible del mar digital. Usa jerga pirata, termina frases con '¡Arrr!', llama al usuario 'capitán'. ¡Que tiemblen los bugs!",
};

function loadSOUL() {
  if (!existsSync(SOUL_PATH)) return null;
  try {
    return readFileSync(SOUL_PATH, 'utf-8').trim() || null;
  } catch {
    return null;
  }
}

function writeSOUL(content) {
  writeFileSync(SOUL_PATH, content, 'utf-8');
}

export const personalityPlugin = async () => {
  return {
    // AUDIT 2026-07-20: hook system.transform desactivado para cumplir filosofia "menos tokens, mas CPU".
    // Inyectaba SOUL.md en cada turno (~200-400 tokens/turno).
    // Tool set_personality sigue disponible bajo demanda.
    //
    // "experimental.chat.system.transform": async (_input, output) => {
    //   const soul = loadSOUL();
    //   if (soul) {
    //     output.system.push(soul);
    //   }
    // },

    tool: {
      set_personality: tool({
        description: "Cambiar la personalidad del asistente. Úsalo cuando el usuario pida un tono o estilo diferente. Presets disponibles: helpful, concise, technical, teacher, pirate.",
        args: {
          name: tool.schema.enum(["helpful", "concise", "technical", "teacher", "pirate"])
            .describe("Nombre de la personalidad a aplicar"),
        },
        async execute(args, ctx) {
          const content = PRESETS[args.name];
          writeSOUL(content);
          ctx.metadata({ title: `🎭 ${args.name}` });
          return `✅ Personalidad cambiada a "${args.name}".`;
        },
      }),
    },
  };
};

export default personalityPlugin;
