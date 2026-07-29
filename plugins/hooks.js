import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHookEngine } from "../lib/hooks.js";

const HOME = process.env.HOME || "/tmp";
const CONFIG_DIR = join(HOME, ".config/opencode");
const CONFIG_PATH = join(CONFIG_DIR, "opencode.jsonc");

function loadHooksConfig() {
  try {
    if (!existsSync(CONFIG_PATH)) return [];
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    const cleaned = raw.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    const parsed = JSON.parse(cleaned);
    return parsed.hooks || [];
  } catch {
    return [];
  }
}

export const hooksPlugin = async () => {
  const engine = createHookEngine();
  engine.loadRules(loadHooksConfig());

  return {
    "tool.execute.before": async (input, output) => {
      const result = await engine.evaluate("PreToolUse", {
        tool: input.tool,
        args: input.args,
        session_id: input.sessionID,
        cwd: input.directory,
      });

      if (result.action === "block") {
        output.error = result.reason;
      }
    },

    "tool.execute.after": async (input, output) => {
      await engine.evaluate("PostToolUse", {
        tool: input.tool,
        args: input.args,
        exit_code: output.exitCode,
        output_size: (output.output || "").length,
        session_id: input.sessionID,
        cwd: input.directory,
      });
    },

    event: async ({ event }) => {
      if (event.type === "session.start") {
        await engine.evaluate("SessionStart", {
          session_id: event.properties?.sessionID,
          cwd: event.properties?.directory,
        });
      }
      if (event.type === "session.deleted") {
        await engine.evaluate("SessionEnd", {
          session_id: event.properties?.sessionID,
          duration_ms: event.properties?.durationMs,
        });
      }
    },
  };
};

export default hooksPlugin;
