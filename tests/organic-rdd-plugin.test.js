import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import organicRddPlugin from "../plugins/organic-rdd.js";

test("plugin exposes the negotiated tool surface and structured results", async () => {
  const root = mkdtempSync(join(tmpdir(), "organic-rdd-plugin-"));
  const project = join(root, "project");
  mkdirSync(join(project, "docs"), { recursive: true });
  writeFileSync(join(project, "docs", "readme.md"), "docs");

  const previous = process.env.OPENCODE_ORGANIC_RDD_DIR;
  process.env.OPENCODE_ORGANIC_RDD_DIR = join(root, "store");
  try {
    const plugin = await organicRddPlugin();
    assert.deepEqual(Object.keys(plugin.tool).sort(), [
      "review_capture",
      "review_finalize",
      "review_gate",
      "review_mode_get",
      "review_mode_set",
      "review_start",
      "review_status",
      "review_verify",
    ]);

    const started = JSON.parse(await plugin.tool.review_start.execute({
      feature_id: "docs",
      files: ["docs/readme.md"],
    }, { directory: project }));
    assert.equal(started.ok, true);
    assert.equal(started.result.status, "approved");

    const otherProject = join(root, "other-project");
    mkdirSync(otherProject);
    const mismatch = JSON.parse(await plugin.tool.review_gate.execute({
      review_id: started.result.review_id,
    }, { directory: otherProject }));
    assert.equal(mismatch.ok, false);
    assert.equal(mismatch.error.code, "project_mismatch");

    const failed = JSON.parse(await plugin.tool.review_status.execute(
      { review_id: "../../escape" },
      { directory: project },
    ));
    assert.equal(failed.ok, false);
    assert.equal(failed.error.code, "review_id_invalid");
  } finally {
    if (previous === undefined) delete process.env.OPENCODE_ORGANIC_RDD_DIR;
    else process.env.OPENCODE_ORGANIC_RDD_DIR = previous;
  }
});
