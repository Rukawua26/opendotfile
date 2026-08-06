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

test("segunda lectura identica emite warning suave y tercera mas fuerte", async () => {
  const plugin = await guardrailsPlugin();
  const args = { path: "a.js" };

  const out1 = { output: "content-a" };
  await plugin["tool.execute.before"]({ tool: "read", sessionID: "dup", callID: "r1", args }, out1);
  await plugin["tool.execute.after"]({ tool: "read", sessionID: "dup", callID: "r1" }, out1);
  assert.equal(out1.metadata, undefined);

  const out2 = { output: "content-b" };
  await plugin["tool.execute.before"]({ tool: "read", sessionID: "dup", callID: "r2", args }, out2);
  await plugin["tool.execute.after"]({ tool: "read", sessionID: "dup", callID: "r2" }, out2);
  assert.equal(out2.metadata.guardrail_triggered, "duplicate_read");

  const out3 = { output: "content-c" };
  await plugin["tool.execute.before"]({ tool: "read", sessionID: "dup", callID: "r3", args }, out3);
  await plugin["tool.execute.after"]({ tool: "read", sessionID: "dup", callID: "r3" }, out3);
  assert.equal(out3.metadata.guardrail_triggered, "repeated_read");
});

test("lectura a rango distinto no dispara warning", async () => {
  const plugin = await guardrailsPlugin();
  await plugin["tool.execute.before"]({ tool: "read", sessionID: "range", callID: "r1", args: { path: "a.js", offset: 1, limit: 10 } }, {});
  await plugin["tool.execute.before"]({ tool: "read", sessionID: "range", callID: "r2", args: { path: "a.js", offset: 11, limit: 10 } }, {});
  const after = {};
  await plugin["tool.execute.before"]({ tool: "read", sessionID: "range", callID: "r2" }, after);
  await plugin["tool.execute.after"]({ tool: "read", sessionID: "range", callID: "r2" }, after);
  assert.equal(after.metadata, undefined);
});

test("edit resetea el historial de lecturas", async () => {
  const plugin = await guardrailsPlugin();
  await plugin["tool.execute.before"]({ tool: "read", sessionID: "editreset", callID: "r1", args: { path: "a.js" } }, {});
  await plugin["tool.execute.before"]({ tool: "edit", sessionID: "editreset", callID: "e1", args: { filePath: "a.js" } }, {});
  const out = {};
  await plugin["tool.execute.before"]({ tool: "read", sessionID: "editreset", callID: "r2", args: { path: "a.js" } }, out);
  await plugin["tool.execute.after"]({ tool: "read", sessionID: "editreset", callID: "r2" }, out);
  assert.equal(out.metadata, undefined);
});

test("warn_upres en 50 y 100 tools", async () => {
  const plugin = await guardrailsPlugin();
  const triggers = new Set();
  for (let i = 0; i < 100; i++) {
    const out = { output: "ok" };
    await plugin["tool.execute.before"]({ tool: `T${i}`, sessionID: "totals-upto", callID: `c${i}` }, out);
    await plugin["tool.execute.after"]({ tool: `T${i}`, sessionID: "totals-upto", callID: `c${i}` }, out);
    for (const w of (out.metadata?.guardrail_warnings || [])) triggers.add(w.trigger);
  }
  assert.ok(triggers.has("total_calls"), "missing total_calls");
  assert.ok(triggers.has("total_calls_50"), "missing total_calls_50");
  assert.ok(triggers.has("total_calls_100"), "missing total_calls_100");
});
