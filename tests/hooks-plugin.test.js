import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createHookEngine } from "../lib/hooks.js";
import { hooksPlugin } from "../plugins/hooks.js";

function writeScript(dir, name, content) {
  const path = join(dir, name);
  writeFileSync(path, content);
  chmodSync(path, 0o755);
  return path;
}

function allowScript(dir) {
  return writeScript(dir, "allow.sh", `#!/bin/sh\ncat > /dev/null\necho "allowed"`);
}

function blockScript(dir) {
  return writeScript(dir, "block.sh", `#!/bin/sh\ncat > /dev/null\necho "blocked reason" >&2\nexit 2`);
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "hooks-plugin-"));
  mkdirSync(join(root, "scripts"), { recursive: true });
  return root;
}

test("plugin carga y expone hooks before/after", async () => {
  const plugin = await hooksPlugin();
  assert.ok(typeof plugin["tool.execute.before"] === "function");
  assert.ok(typeof plugin["tool.execute.after"] === "function");
  assert.ok(typeof plugin.event === "function");
});

test("tool.execute.before ejecuta PreToolUse hooks y puede bloquear", async () => {
  const root = fixture();
  const script = blockScript(join(root, "scripts"));

  const engine = createHookEngine();
  engine.loadRules([
    { event: "PreToolUse", matcher: "Bash", command: script },
  ]);

  const output = {};
  const input = { tool: "Bash", args: { command: "rm -rf /" }, sessionID: "s1", directory: root };

  for (const hook of engine.getRules().filter((r) => r.event === "PreToolUse")) {
    const result = await engine.evaluate("PreToolUse", {
      tool: input.tool,
      args: input.args,
      session_id: input.sessionID,
      cwd: input.directory,
    });
    if (result.action === "block") {
      output.error = result.reason;
      break;
    }
  }

  assert.ok(output.error, "deberia bloquear con un reason");
  assert.ok(output.error.includes("blocked reason"));
});

test("tool.execute.before permite con hook exit 0", async () => {
  const root = fixture();
  const script = allowScript(join(root, "scripts"));

  const engine = createHookEngine();
  engine.loadRules([
    { event: "PreToolUse", command: script },
  ]);

  const input = { tool: "Read", args: {}, sessionID: "s1", directory: root };
  let blocked = false;

  for (const hook of engine.getRules().filter((r) => r.event === "PreToolUse")) {
    const result = await engine.evaluate("PreToolUse", {
      tool: input.tool,
      args: input.args,
      session_id: input.sessionID,
      cwd: input.directory,
    });
    if (result.action === "block") {
      blocked = true;
      break;
    }
  }

  assert.equal(blocked, false);
});

test("tool.execute.after ejecuta PostToolUse hooks sin bloquear", async () => {
  const root = fixture();
  const script = allowScript(join(root, "scripts"));

  const engine = createHookEngine();
  engine.loadRules([
    { event: "PostToolUse", matcher: "Bash", command: script },
  ]);

  const input = { tool: "Bash", sessionID: "s1", directory: root };
  const output = { exitCode: 0, output: "done" };

  let error = null;
  try {
    await engine.evaluate("PostToolUse", {
      tool: input.tool,
      exit_code: output.exitCode,
      output_size: (output.output || "").length,
      session_id: input.sessionID,
      cwd: input.directory,
    });
  } catch (e) {
    error = e;
  }

  assert.equal(error, null, "PostToolUse no debe lanzar error");
});

test("event handler para session.start y session.deleted", async () => {
  const plugin = await hooksPlugin();
  assert.ok(typeof plugin.event === "function");

  const result = await plugin.event({
    event: { type: "session.start", properties: { sessionID: "s1" } },
  });
  assert.equal(result, undefined, "session.start no debe fallar");

  const result2 = await plugin.event({
    event: { type: "session.deleted", properties: { sessionID: "s1", durationMs: 5000 } },
  });
  assert.equal(result2, undefined, "session.deleted no debe fallar");
});

test("plugin convive con engine sin estado compartido", async () => {
  const engine1 = createHookEngine();
  const engine2 = createHookEngine();

  engine1.loadRules([{ event: "PreToolUse", matcher: "Bash", command: "echo one" }]);
  engine2.loadRules([{ event: "PreToolUse", matcher: "Write", command: "echo two" }]);

  assert.equal(engine1.getRules().length, 1);
  assert.equal(engine2.getRules().length, 1);
  assert.equal(engine1.getRules()[0].matcher, "Bash");
  assert.equal(engine2.getRules()[0].matcher, "Write");
});
