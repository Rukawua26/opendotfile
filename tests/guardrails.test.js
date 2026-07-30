import assert from "node:assert/strict";
import test from "node:test";
import { guardrailsPlugin } from "../plugins/guardrails.js";

test("advertencia de herramienta repetida usa metadata y no muta args", async () => {
  const plugin = await guardrailsPlugin();
  const args = { path: "src/main.js", options: { depth: 2 } };
  const output = { args: structuredClone(args) };

  for (let i = 0; i < 5; i++) {
    output.metadata = undefined;
    await plugin["tool.execute.before"]({ tool: "Read", sessionID: "repeat", callID: `read-${i}` }, output);
    await plugin["tool.execute.after"]({ tool: "Read", sessionID: "repeat", callID: `read-${i}` }, output);
  }

  assert.deepEqual(output.args, args);
  assert.match(output.metadata.guardrail_warning, /Read/);
  assert.equal(output.metadata.guardrail_triggered, "consecutive_tools");
});

test("advertencia consecutiva se emite una sola vez hasta cambiar de herramienta", async () => {
  const plugin = await guardrailsPlugin();
  const warnings = [];
  for (let i = 0; i < 6; i++) {
    const output = {};
    await plugin["tool.execute.before"]({ tool: "Grep", sessionID: "repeat-once" }, output);
    await plugin["tool.execute.after"]({ tool: "Grep", sessionID: "repeat-once" }, output);
    if (output.metadata?.guardrail_triggered === "consecutive_tools") warnings.push(output.metadata);
  }
  assert.equal(warnings.length, 1);
});

test("advertencia pendiente queda asociada al callID correcto", async () => {
  const plugin = await guardrailsPlugin();
  for (let i = 0; i < 5; i++) {
    await plugin["tool.execute.before"]({ tool: "Read", sessionID: "calls", callID: "read" }, {});
  }
  const unrelated = {};
  await plugin["tool.execute.after"]({ tool: "Bash", sessionID: "calls", callID: "bash" }, unrelated);
  assert.equal(unrelated.metadata, undefined);
  const matching = {};
  await plugin["tool.execute.after"]({ tool: "Read", sessionID: "calls", callID: "read" }, matching);
  assert.equal(matching.metadata.guardrail_triggered, "consecutive_tools");
});

test("advertencia total queda asociada al callID que alcanza el umbral", async () => {
  const plugin = await guardrailsPlugin();
  for (let i = 0; i < 20; i++) {
    await plugin["tool.execute.before"]({ tool: `Tool${i}`, sessionID: "total-calls", callID: `call-${i}` }, {});
  }
  const first = {};
  await plugin["tool.execute.after"]({ tool: "Tool0", sessionID: "total-calls", callID: "call-0" }, first);
  assert.equal(first.metadata, undefined);
  const threshold = {};
  await plugin["tool.execute.after"]({ tool: "Tool19", sessionID: "total-calls", callID: "call-19" }, threshold);
  assert.equal(threshold.metadata.guardrail_triggered, "total_calls");
});

test("advertencia de total es determinista y se emite una sola vez", async () => {
  const plugin = await guardrailsPlugin();
  const output = {};
  for (let i = 0; i < 20; i++) {
    output.metadata = undefined;
    await plugin["tool.execute.before"]({ tool: `Tool${i}`, sessionID: "total" }, output);
    await plugin["tool.execute.after"]({ tool: `Tool${i}`, sessionID: "total" }, output);
  }

  assert.equal(output.metadata.guardrail_triggered, "total_calls");
  const afterThreshold = {};
  await plugin["tool.execute.before"]({ tool: "Next", sessionID: "total" }, afterThreshold);
  await plugin["tool.execute.after"]({ tool: "Next", sessionID: "total" }, afterThreshold);
  assert.equal(afterThreshold.metadata, undefined);
});

test("advertencia de resultado vacio no muta output.output", async () => {
  const plugin = await guardrailsPlugin();
  const output = { output: "" };
  for (let i = 0; i < 3; i++) {
    output.metadata = undefined;
    await plugin["tool.execute.after"]({ tool: "Bash", sessionID: "empty" }, output);
  }

  assert.equal(output.output, "");
  assert.match(output.metadata.guardrail_warning, /Bash/);
  assert.equal(output.metadata.guardrail_triggered, "empty_output");
});

test("advertencia de resultado vacio se emite una sola vez hasta obtener salida", async () => {
  const plugin = await guardrailsPlugin();
  let warningCount = 0;
  for (let i = 0; i < 6; i++) {
    const output = { output: "" };
    await plugin["tool.execute.after"]({ tool: "Bash", sessionID: "empty-once" }, output);
    if (output.metadata?.guardrail_triggered === "empty_output") warningCount++;
  }
  assert.equal(warningCount, 1);

  await plugin["tool.execute.after"]({ tool: "Bash", sessionID: "empty-once" }, { output: "success" });
  const output = { output: "" };
  for (let i = 0; i < 3; i++) {
    await plugin["tool.execute.after"]({ tool: "Bash", sessionID: "empty-once" }, output);
  }
  assert.equal(output.metadata.guardrail_triggered, "empty_output");
});

test("cambiar de herramienta no rearma salida vacia sin salida valida", async () => {
  const plugin = await guardrailsPlugin();
  for (let i = 0; i < 3; i++) {
    await plugin["tool.execute.after"]({ tool: "Bash", sessionID: "empty-global" }, { output: "" });
  }
  for (let i = 0; i < 3; i++) {
    const output = { output: "" };
    await plugin["tool.execute.after"]({ tool: "Read", sessionID: "empty-global" }, output);
    assert.notEqual(output.metadata?.guardrail_triggered, "empty_output");
  }
});

test("advertencias simultaneas se conservan en metadata", async () => {
  const plugin = await guardrailsPlugin();
  const output = { output: "" };
  for (let i = 0; i < 20; i++) {
    await plugin["tool.execute.before"]({ tool: `Tool${i}`, sessionID: "collision" }, output);
    await plugin["tool.execute.after"]({ tool: `Tool${i}`, sessionID: "collision" }, output);
  }
  for (let i = 0; i < 3; i++) {
    await plugin["tool.execute.after"]({ tool: "Tool19", sessionID: "collision" }, output);
  }
  const triggers = output.metadata.guardrail_warnings.map((item) => item.trigger);
  assert.ok(triggers.includes("total_calls"));
  assert.ok(triggers.includes("empty_output"));
});

test("session.compacted reinicia el estado de guardrails", async () => {
  const plugin = await guardrailsPlugin();
  const output = {};
  for (let i = 0; i < 20; i++) {
    await plugin["tool.execute.before"]({ tool: `Tool${i}`, sessionID: "compact" }, output);
    await plugin["tool.execute.after"]({ tool: `Tool${i}`, sessionID: "compact" }, output);
  }
  await plugin.event({ event: { type: "session.compacted", properties: { sessionID: "compact" } } });

  const afterReset = {};
  for (let i = 0; i < 20; i++) {
    await plugin["tool.execute.before"]({ tool: `Tool${i}`, sessionID: "compact" }, afterReset);
    await plugin["tool.execute.after"]({ tool: `Tool${i}`, sessionID: "compact" }, afterReset);
  }
  assert.equal(afterReset.metadata.guardrail_triggered, "total_calls");
});

test("session.deleted elimina el estado usando properties.info.id", async () => {
  const plugin = await guardrailsPlugin();
  for (let i = 0; i < 20; i++) {
    await plugin["tool.execute.before"]({ tool: `Tool${i}`, sessionID: "deleted" }, {});
    await plugin["tool.execute.after"]({ tool: `Tool${i}`, sessionID: "deleted" }, { output: "done" });
  }
  await plugin.event({ event: { type: "session.deleted", properties: { info: { id: "deleted" } } } });
  const output = {};
  await plugin["tool.execute.before"]({ tool: "Fresh", sessionID: "deleted" }, output);
  await plugin["tool.execute.after"]({ tool: "Fresh", sessionID: "deleted" }, output);
  assert.equal(output.metadata, undefined);
});
