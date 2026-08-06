import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

function readJSONC(file) {
  return JSON.parse(readFileSync(join(ROOT, file), "utf8").replace(/^\s*\/\/.*$/gm, ""));
}

test("perfiles usan solo modelos validos y no integran Kimi K3", () => {
  const files = [
    "opencode.jsonc",
    "profiles/work/opencode.jsonc",
    "profiles/personal/opencode.jsonc",
    "profiles/light/opencode.jsonc",
  ];
  for (const file of files) {
    const raw = readFileSync(join(ROOT, file), "utf8");
    assert.doesNotMatch(raw, /gpt-4o|kimi-k3/i, file);
  }
});

test("perfiles diferencian modelo, esfuerzo, pasos y plugins opcionales", () => {
  const root = readJSONC("opencode.jsonc");
  const work = readJSONC("profiles/work/opencode.jsonc");
  const personal = readJSONC("profiles/personal/opencode.jsonc");
  const light = readJSONC("profiles/light/opencode.jsonc");

  assert.equal(root.model, "openai/gpt-5.6-sol");
  assert.equal(work.model, "openai/gpt-5.6-sol");
  assert.equal(work.agent.build.variant, "high");
  assert.equal(work.agent.build.steps, 48);
  assert.ok(work.plugin.every((plugin) => !plugin.includes("plugins-optional/")));
  assert.equal(personal.model, "openai/gpt-5.4-mini");
  assert.equal(personal.agent.build.variant, "medium");
  assert.equal(personal.agent.build.steps, 20);
  assert.ok(personal.plugin.every((plugin) => !plugin.includes("plugins-optional/")));
  assert.equal(light.model, "openai/gpt-5.4-mini");
  assert.equal(light.agent.build.variant, "low");
  assert.equal(light.agent.build.steps, 8);
  assert.equal(light.agent.build.permission.task, "deny");
  assert.ok(light.plugin.every((plugin) => !plugin.includes("plugins-optional/")));
});

test("todos los perfiles protegen y cargan Organic RDD", () => {
  const files = [
    "opencode.jsonc",
    "profiles/work/opencode.jsonc",
    "profiles/personal/opencode.jsonc",
    "profiles/light/opencode.jsonc",
  ];
  const mutations = [
    "review_mode_set",
    "review_start",
    "review_capture",
    "review_verify",
    "review_finalize",
    "review_gate",
  ];

  for (const file of files) {
    const config = readJSONC(file);
    assert.ok(config.plugin.some((plugin) => plugin.endsWith("plugins/organic-rdd.js")), file);
    assert.equal(config.permission.review_mode_get, "allow", file);
    assert.equal(config.permission.review_status, "allow", file);
    assert.equal(config.permission.review_validate, "allow", file);
    for (const tool of mutations) assert.equal(config.permission[tool], "ask", `${file}: ${tool}`);
  }
});
