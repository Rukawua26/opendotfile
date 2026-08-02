import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  OrganicRddError,
  clearPointer,
  createOrganicRdd,
  pointerPath,
  readPointer,
  writePointer,
} from "../lib/organic-rdd.js";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const HOOK_PATH = join(repoRoot, "hooks", "pre-commit");

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "organic-rdd-gate-hook-"));
  const project = join(root, "project");
  const store = join(root, "store");
  mkdirSync(project, { recursive: true });

  function file(path, content = path) {
    const target = join(project, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    return path;
  }

  return { root, project, store, file, rdd: createOrganicRdd({ storeDir: store }) };
}

function initGit(project) {
  execFileSync("git", ["init", "-q"], { cwd: project, stdio: "pipe" });
  execFileSync("git", ["config", "user.email", "t@t.co"], { cwd: project, stdio: "pipe" });
  execFileSync("git", ["config", "user.name", "T"], { cwd: project, stdio: "pipe" });
}

function gitStage(project, path) {
  execFileSync("git", ["add", path], { cwd: project, stdio: "pipe" });
}

function approve(receipt, rdd) {
  for (const lens of receipt.required_lenses) {
    rdd.capture({ review_id: receipt.review_id, lens, status: "pass", summary: "ok", evidence: ["review"] });
  }
  rdd.verify({ review_id: receipt.review_id, status: "pass", evidence: ["node --test"] });
  return rdd.finalize(receipt.review_id);
}

test("pointerPath resolves under the project with the canonical file name", () => {
  const { project } = fixture();
  const path = pointerPath(project);
  assert.ok(path.startsWith(resolve(project)));
  assert.ok(path.endsWith(join(".organic-rdd", "receipt")));
});

test("writePointer and readPointer roundtrip a valid review ID", () => {
  const { project } = fixture();
  const rid = "r_1785674726273_478e562b-a734-4c9a-8d16-048c589dda25";
  writePointer(project, rid);
  assert.equal(readPointer(project), rid);
  assert.equal(statSync(pointerPath(project)).mode & 0o777, 0o600);
});

test("readPointer returns null when no pointer exists and for invalid IDs", () => {
  const { project } = fixture();
  assert.equal(readPointer(project), null);
  mkdirSync(dirname(pointerPath(project)), { recursive: true });
  writeFileSync(pointerPath(project), "not a valid id!\n");
  assert.equal(readPointer(project), null);
});

test("clearPointer removes the pointer file", () => {
  const { project } = fixture();
  writePointer(project, "r_valid_1");
  assert.ok(existsSync(pointerPath(project)));
  clearPointer(project);
  assert.equal(existsSync(pointerPath(project)), false);
});

test("finalize writes the pointer when the receipt is approved", () => {
  const { project, file, rdd } = fixture();
  file("commands/example.md");
  const receipt = rdd.start({ project_path: project, feature_id: "001", files: ["commands/example.md"] });
  const approved = approve(receipt, rdd);
  assert.equal(approved.status, "approved");
  assert.equal(readPointer(project), receipt.review_id);
});

test("start clears any prior pointer so old approvals do not gate new work", () => {
  const { project, file, rdd } = fixture();
  file("commands/one.md");
  const first = rdd.start({ project_path: project, feature_id: "001", files: ["commands/one.md"] });
  approve(first, rdd);
  assert.equal(readPointer(project), first.review_id);

  file("commands/two.md");
  const second = rdd.start({ project_path: project, feature_id: "002", files: ["commands/two.md"] });
  assert.equal(second.status, "reviewing");
  assert.equal(readPointer(project), null);
});

test("finalize clears the pointer when approval is blocked", () => {
  const { project, file, rdd } = fixture();
  file("commands/example.md");
  const receipt = rdd.start({ project_path: project, feature_id: "001", files: ["commands/example.md"] });
  approve(receipt, rdd);
  assert.equal(readPointer(project), receipt.review_id);

  writeFileSync(join(project, "commands", "example.md"), "changed bytes");
  const blocked = rdd.finalize(receipt.review_id);
  assert.equal(blocked.status, "blocked");
  assert.equal(readPointer(project), null);
});

test("the pre-commit hook script exists, is executable, and parses", () => {
  assert.ok(existsSync(HOOK_PATH));
  chmodSync(HOOK_PATH, 0o755);
  assert.ok((statSync(HOOK_PATH).mode & 0o111) > 0, "hook must be executable");
  execFileSync("sh", ["-n", HOOK_PATH], { stdio: "pipe" });
});

test("the gate a pre-commit hook would call passes for a fresh approved receipt", () => {
  const { project, file, rdd } = fixture();
  file("commands/example.md");
  const receipt = rdd.start({ project_path: project, feature_id: "001", files: ["commands/example.md"] });
  approve(receipt, rdd);
  const result = rdd.gate(receipt.review_id, project, { strict_manifest: true });
  assert.equal(result.decision, "pass");
});

test("the gate a pre-commit hook would call blocks a stale candidate", () => {
  const { project, file, rdd } = fixture();
  file("commands/example.md");
  const receipt = rdd.start({ project_path: project, feature_id: "001", files: ["commands/example.md"] });
  approve(receipt, rdd);

  writeFileSync(join(project, "commands", "example.md"), "mutated after approval");
  const result = rdd.gate(receipt.review_id, project, { strict_manifest: true });
  assert.equal(result.decision, "fail");
  assert.equal(result.reason, "candidate_stale");
});

test("staged-only gate ignores untracked files and staged-clean working tree", () => {
  const { project, file, rdd } = fixture();
  initGit(project);
  file("commands/example.md");
  gitStage(project, "commands/example.md");
  execFileSync("git", ["commit", "-qm", "init"], { cwd: project, stdio: "pipe" });

  const receipt = rdd.start({ project_path: project, feature_id: "001", files: ["commands/example.md"] });
  approve(receipt, rdd);

  writeFileSync(join(project, ".organic-rdd", "receipt"), "r_pointer\n");
  writeFileSync(join(project, "unrelated.txt"), "untracked noise");
  const result = rdd.gate(receipt.review_id, project, { strict_manifest: true, stagedOnly: true });
  assert.equal(result.decision, "pass");
});

test("staged-only gate blocks a staged file outside the manifest", () => {
  const { project, file, rdd } = fixture();
  initGit(project);
  file("commands/example.md");
  gitStage(project, "commands/example.md");
  execFileSync("git", ["commit", "-qm", "init"], { cwd: project, stdio: "pipe" });

  const receipt = rdd.start({ project_path: project, feature_id: "001", files: ["commands/example.md"] });
  approve(receipt, rdd);

  file("commands/other.md", "staged");
  gitStage(project, "commands/other.md");
  const result = rdd.gate(receipt.review_id, project, { strict_manifest: true, stagedOnly: true });
  assert.equal(result.decision, "fail");
  assert.equal(result.reason, "manifest_incomplete");
});

test("the gate a pre-commit hook would call skips when review mode is disabled", () => {
  const { project, file, rdd } = fixture();
  rdd.setMode("disabled");
  file("commands/example.md");
  const receipt = rdd.start({ project_path: project, feature_id: "001", files: ["commands/example.md"] });
  const result = rdd.gate(receipt.review_id, project, { strict_manifest: true });
  assert.equal(result.decision, "skipped");
  assert.equal(result.status, "unmanaged");
});
