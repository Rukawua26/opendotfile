import { spawn } from "node:child_process";
import { resolve } from "node:path";

const DEFAULT_TIMEOUT_S = 5;
const ALLOWED_EVENTS = new Set(["PreToolUse", "PostToolUse", "SessionStart", "SessionEnd"]);

export class HooksError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "HooksError";
    this.code = code;
    this.details = details;
  }
}

function matchTool(toolName, matcher) {
  if (!matcher) return true;
  try {
    return new RegExp(matcher).test(toolName);
  } catch {
    return false;
  }
}

export function createHookEngine() {
  let rules = [];

  function loadRules(rawRules) {
    if (!Array.isArray(rawRules)) {
      rules = [];
      return;
    }
    rules = rawRules.filter((r) => {
      if (!r || typeof r !== "object") return false;
      if (!ALLOWED_EVENTS.has(r.event)) return false;
      if (typeof r.command !== "string" || !r.command.trim()) return false;
      return true;
    });
  }

  function getRules() {
    return rules;
  }

  function runScript(rule, payload) {
    return new Promise((resolvePromise) => {
      const timeoutMs = (rule.timeout || DEFAULT_TIMEOUT_S) * 1000;
      const cmd = resolve(process.cwd(), rule.command);
      const env = { ...process.env, HOOK_EVENT: rule.event };

      const child = spawn(cmd, [], {
        shell: true,
        env,
        stdio: ["pipe", "pipe", "pipe"],
        timeout: timeoutMs,
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
      child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          child.kill("SIGTERM");
          resolvePromise({ exitCode: null, timedOut: true, stdout, stderr });
        }
      }, timeoutMs + 500);

      child.on("error", (err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolvePromise({ exitCode: null, error: err.message, stdout, stderr });
        }
      });

      child.on("close", (code) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolvePromise({ exitCode: code, timedOut: false, stdout, stderr });
        }
      });

      try {
        child.stdin.write(JSON.stringify(payload));
        child.stdin.end();
      } catch (err) {
        if (err.code !== "EPIPE") throw err;
      }
    });
  }

  async function evaluate(event, context = {}) {
    const matching = rules.filter((r) => r.event === event && matchTool(context.tool, r.matcher));
    const results = [];

    for (const rule of matching) {
      const payload = {
        hook_event_name: event,
        ...context,
      };

      const result = await runScript(rule, payload);
      results.push({ rule, result });

      if (event === "PreToolUse" && result.exitCode === 2) {
        return { action: "block", reason: result.stderr || "Hook bloqueo la ejecucion", results };
      }
    }

    return { action: "allow", results };
  }

  return { loadRules, getRules, evaluate };
}
