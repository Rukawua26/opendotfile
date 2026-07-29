import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createHookEngine } from "../lib/hooks.js";

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
  return writeScript(dir, "block.sh", `#!/bin/sh\ncat > /dev/null\necho "blocked" >&2\nexit 2`);
}

function slowScript(dir) {
  return writeScript(dir, "slow.sh", `#!/bin/sh\nsleep 10\necho "too late"`);
}

function customExitScript(dir, code) {
  return writeScript(dir, `exit${code}.sh`, `#!/bin/sh\nexit ${code}`);
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "hooks-"));
  mkdirSync(join(root, "scripts"), { recursive: true });
  return root;
}

test("Hook matchea tool name y se ejecuta (exit 0)", async () => {
  const root = fixture();
  const script = allowScript(join(root, "scripts"));
  const engine = createHookEngine();

  engine.loadRules([
    { event: "PreToolUse", matcher: "Bash", command: script },
  ]);

  const result = await engine.evaluate("PreToolUse", { tool: "Bash", args: { command: "echo hi" } });
  assert.equal(result.action, "allow");
  assert.equal(result.results.length, 1);
  assert.ok(result.results[0].result.stdout.includes("allowed"));
});

test("Hook con matcher que NO matchea no se ejecuta", async () => {
  const root = fixture();
  const script = blockScript(join(root, "scripts"));
  const engine = createHookEngine();

  engine.loadRules([
    { event: "PreToolUse", matcher: "Write", command: script },
  ]);

  const result = await engine.evaluate("PreToolUse", { tool: "Bash", args: {} });
  assert.equal(result.action, "allow");
  assert.equal(result.results.length, 0);
});

test("Exit code 2 bloquea la ejecucion con stderr como razon", async () => {
  const root = fixture();
  const script = blockScript(join(root, "scripts"));
  const engine = createHookEngine();

  engine.loadRules([
    { event: "PreToolUse", matcher: "Bash", command: script },
  ]);

  const result = await engine.evaluate("PreToolUse", { tool: "Bash", args: { command: "rm -rf /" } });
  assert.equal(result.action, "block");
  assert.ok(result.reason.includes("blocked"));
});

test("Exit code 0 permite y stdout se appendea", async () => {
  const root = fixture();
  const script = allowScript(join(root, "scripts"));
  const engine = createHookEngine();

  engine.loadRules([
    { event: "PreToolUse", command: script },
  ]);

  const result = await engine.evaluate("PreToolUse", { tool: "Read" });
  assert.equal(result.action, "allow");
  assert.ok(result.results[0].result.stdout.includes("allowed"));
});

test("Timeout fail-open permite la ejecucion", async () => {
  const root = fixture();
  const script = slowScript(join(root, "scripts"));
  const engine = createHookEngine();

  engine.loadRules([
    { event: "PreToolUse", matcher: "Bash", command: script, timeout: 1 },
  ]);

  const result = await engine.evaluate("PreToolUse", { tool: "Bash", args: {} });
  assert.equal(result.action, "allow");
  assert.ok(result.results[0].result.timedOut);
});

test("Exit code != 0 y != 2 permite la ejecucion (fail-open)", async () => {
  const root = fixture();
  const script = customExitScript(join(root, "scripts"), 1);
  const engine = createHookEngine();

  engine.loadRules([
    { event: "PreToolUse", command: script },
  ]);

  const result = await engine.evaluate("PreToolUse", { tool: "Bash" });
  assert.equal(result.action, "allow");
});

test("Hook sin matcher matchea todos los tools", async () => {
  const root = fixture();
  const script = allowScript(join(root, "scripts"));
  const engine = createHookEngine();

  engine.loadRules([
    { event: "PreToolUse", command: script },
  ]);

  const r1 = await engine.evaluate("PreToolUse", { tool: "Read" });
  assert.equal(r1.results.length, 1);

  const r2 = await engine.evaluate("PreToolUse", { tool: "Bash" });
  assert.equal(r2.results.length, 1);
});

test("Multiples hooks en el mismo evento; si uno bloquea los siguientes no se ejecutan", async () => {
  const root = fixture();
  const allowPath = allowScript(join(root, "scripts"));
  const blockPath = blockScript(join(root, "scripts"));
  const engine = createHookEngine();

  engine.loadRules([
    { event: "PreToolUse", matcher: "Bash", command: blockPath },
    { event: "PreToolUse", matcher: "Bash", command: allowPath },
  ]);

  const result = await engine.evaluate("PreToolUse", { tool: "Bash", args: {} });
  assert.equal(result.action, "block");
  assert.equal(result.results.length, 1, "segundo hook no deberia ejecutarse");
});

test("PostToolUse ejecuta hooks pero no puede bloquear (exit 2 no afecta)", async () => {
  const root = fixture();
  const script = blockScript(join(root, "scripts"));
  const engine = createHookEngine();

  engine.loadRules([
    { event: "PostToolUse", matcher: "Bash", command: script },
  ]);

  const result = await engine.evaluate("PostToolUse", { tool: "Bash", exit_code: 0 });
  assert.equal(result.action, "allow", "PostToolUse nunca bloquea");
});

test("Rules invalidas se filtran silenciosamente", () => {
  const engine = createHookEngine();
  engine.loadRules([
    null,
    {},
    { event: "InvalidEvent", command: "echo" },
    { event: "PreToolUse" },
    { event: "PreToolUse", command: "  " },
    { event: "PreToolUse", command: "echo hi" },
  ]);
  assert.equal(engine.getRules().length, 1);
});

test("SessionStart hooks se ejecutan", async () => {
  const root = fixture();
  const script = allowScript(join(root, "scripts"));
  const engine = createHookEngine();

  engine.loadRules([
    { event: "SessionStart", command: script },
  ]);

  const result = await engine.evaluate("SessionStart", { session_id: "test" });
  assert.equal(result.action, "allow");
  assert.equal(result.results.length, 1);
});

test("SessionEnd hooks se ejecutan", async () => {
  const root = fixture();
  const script = allowScript(join(root, "scripts"));
  const engine = createHookEngine();

  engine.loadRules([
    { event: "SessionEnd", command: script },
  ]);

  const result = await engine.evaluate("SessionEnd", { session_id: "test", duration_ms: 5000 });
  assert.equal(result.action, "allow");
  assert.equal(result.results.length, 1);
});

test("loadRules con array vacio o no array", () => {
  const engine = createHookEngine();
  engine.loadRules([]);
  assert.equal(engine.getRules().length, 0);
  engine.loadRules(null);
  assert.equal(engine.getRules().length, 0);
  engine.loadRules("not an array");
  assert.equal(engine.getRules().length, 0);
});
