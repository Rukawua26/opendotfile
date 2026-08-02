import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  OrganicRddError,
  classifyPaths,
  createOrganicRdd,
} from "../lib/organic-rdd.js";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "organic-rdd-"));
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

function git(args, cwd) {
  return execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
}

function initGit(project) {
  git(["init"], project);
  git(["config", "user.email", "test@example.com"], project);
  git(["config", "user.name", "Test User"], project);
}

test("classifies the highest risk and explains required lenses", () => {
  assert.deepEqual(classifyPaths(["docs/readme.md"]), {
    tier: 0,
    reasons: ["informational documentation"],
    required_lenses: [],
  });
  assert.deepEqual(classifyPaths(["commands/review-start.md"]), {
    tier: 1,
    reasons: ["workflow guidance"],
    required_lenses: ["code-review"],
  });
  assert.deepEqual(classifyPaths(["AGENTS.md"]), {
    tier: 2,
    reasons: ["central OpenCode configuration"],
    required_lenses: ["code-review", "verifier"],
  });

  const plugin = classifyPaths(["docs/readme.md", "plugins/sandbox.js"]);
  assert.equal(plugin.tier, 3);
  assert.deepEqual(plugin.required_lenses, [
    "code-review",
    "verifier",
    "security-review",
    "architecture-review",
  ]);
  assert.match(plugin.reasons.join(" "), /runtime|security/i);
});

test("candidate identity is deterministic and changes with file bytes", () => {
  const { project, file, rdd } = fixture();
  file("commands/example.md", "first");

  const first = rdd.inspectCandidate(project, ["commands/example.md"]);
  const second = rdd.inspectCandidate(project, ["commands/example.md"]);
  assert.equal(first.candidate_id, second.candidate_id);
  assert.match(first.candidate_id, /^[a-f0-9]{64}$/);

  writeFileSync(join(project, "commands/example.md"), "second");
  const changed = rdd.inspectCandidate(project, ["commands/example.md"]);
  assert.notEqual(changed.candidate_id, first.candidate_id);
});

test("Tier 0 is approved without lenses or verification", () => {
  const { project, file, rdd } = fixture();
  file("docs/readme.md");

  const receipt = rdd.start({ project_path: project, feature_id: "docs", files: ["docs/readme.md"] });
  assert.equal(receipt.tier, 0);
  assert.equal(receipt.status, "approved");
  assert.equal(receipt.verify_status, "skipped");
  assert.deepEqual(receipt.required_lenses, []);

  const gate = rdd.gate(receipt.review_id);
  assert.equal(gate.decision, "pass");
  assert.equal(rdd.status(receipt.review_id).gate_ready, true);
});

test("managed lifecycle requires passing lenses and verification", () => {
  const { project, file, rdd } = fixture();
  file("commands/example.md");

  const receipt = rdd.start({ project_path: project, feature_id: "001", files: ["commands/example.md"] });
  assert.equal(receipt.status, "reviewing");
  assert.equal(rdd.finalize(receipt.review_id).status, "blocked");

  rdd.capture({
    review_id: receipt.review_id,
    lens: "code-review",
    status: "pass",
    summary: "No findings",
    evidence: ["independent code review"],
  });
  rdd.verify({ review_id: receipt.review_id, status: "pass", evidence: ["node --test"] });
  const approved = rdd.finalize(receipt.review_id);
  assert.equal(approved.status, "approved");
  assert.equal(rdd.gate(receipt.review_id).decision, "pass");
});

test("failed evidence blocks approval", () => {
  const { project, file, rdd } = fixture();
  file("AGENTS.md");
  const receipt = rdd.start({ project_path: project, feature_id: "policy", files: ["AGENTS.md"] });

  rdd.capture({ review_id: receipt.review_id, lens: "code-review", status: "pass", summary: "Pass", evidence: ["review"] });
  rdd.capture({ review_id: receipt.review_id, lens: "verifier", status: "fail", summary: "Tests failed" });
  rdd.verify({ review_id: receipt.review_id, status: "pass", evidence: ["tests"] });

  assert.equal(rdd.finalize(receipt.review_id).status, "blocked");
  assert.equal(rdd.gate(receipt.review_id).decision, "fail");
});

test("disabled mode stays unmanaged and never creates approval", () => {
  const { project, file, rdd } = fixture();
  file("plugins/runtime.js");
  rdd.setMode("disabled");

  const receipt = rdd.start({ project_path: project, feature_id: "runtime", files: ["plugins/runtime.js"] });
  assert.equal(receipt.status, "unmanaged");
  assert.notEqual(receipt.status, "approved");
  assert.equal(rdd.finalize(receipt.review_id).status, "unmanaged");
  assert.equal(rdd.gate(receipt.review_id).decision, "skipped");

  rdd.setMode("managed");
  assert.equal(rdd.finalize(receipt.review_id).status, "unmanaged");
  assert.equal(rdd.gate(receipt.review_id).decision, "fail");
});

test("disabled mode does not destroy prior managed approval", () => {
  const { project, file, rdd } = fixture();
  file("docs/readme.md");
  const receipt = rdd.start({ project_path: project, feature_id: "docs", files: ["docs/readme.md"] });
  assert.equal(receipt.status, "approved");

  rdd.setMode("disabled");
  assert.equal(rdd.finalize(receipt.review_id).status, "unmanaged");
  assert.equal(rdd.gate(receipt.review_id).decision, "skipped");

  rdd.setMode("managed");
  assert.equal(rdd.status(receipt.review_id).status, "approved");
  assert.equal(rdd.gate(receipt.review_id).decision, "pass");
});

test("corrupt mode fails closed as managed and reports the anomaly", () => {
  const { store, rdd } = fixture();
  mkdirSync(store, { recursive: true });
  writeFileSync(join(store, "mode.json"), "not json");

  const mode = rdd.getMode();
  assert.equal(mode.mode, "managed");
  assert.match(mode.anomaly, /invalid/i);
});

test("stale candidates cannot finalize or pass a managed gate", () => {
  const { project, file, rdd } = fixture();
  file("commands/example.md", "before");
  const receipt = rdd.start({ project_path: project, feature_id: "001", files: ["commands/example.md"] });
  rdd.capture({ review_id: receipt.review_id, lens: "code-review", status: "pass", summary: "Pass", evidence: ["review"] });
  rdd.verify({ review_id: receipt.review_id, status: "pass", evidence: ["tests"] });
  writeFileSync(join(project, "commands/example.md"), "after");

  assert.equal(rdd.status(receipt.review_id).candidate_fresh, false);
  assert.equal(rdd.status(receipt.review_id).effective_status, "blocked");
  assert.equal(rdd.finalize(receipt.review_id).status, "blocked");
  assert.equal(rdd.gate(receipt.review_id).decision, "fail");
});

test("rejects files outside the project and all candidate symlinks", () => {
  const { root, project, file, rdd } = fixture();
  file("docs/readme.md");
  const outside = join(root, "outside.txt");
  writeFileSync(outside, "secret");

  assert.throws(
    () => rdd.inspectCandidate(project, [outside]),
    (error) => error instanceof OrganicRddError && error.code === "file_outside_project",
  );

  symlinkSync(outside, join(project, "escape.txt"));
  assert.throws(
    () => rdd.inspectCandidate(project, ["escape.txt"]),
    (error) => error instanceof OrganicRddError && error.code === "file_symlink",
  );
});

test("rejects internal symlinks before they can hide risk or be retargeted", () => {
  const { project, file, rdd } = fixture();
  file("docs/safe.md", "safe");
  file("docs/other.md", "other");
  mkdirSync(join(project, "plugins"), { recursive: true });
  symlinkSync("../docs/safe.md", join(project, "plugins/runtime.js"));

  assert.throws(
    () => rdd.start({ project_path: project, feature_id: "runtime", files: ["plugins/runtime.js"] }),
    (error) => error instanceof OrganicRddError && error.code === "file_symlink",
  );
});

test("persists receipts as valid private JSON", () => {
  const { project, store, file, rdd } = fixture();
  file("docs/readme.md");
  const receipt = rdd.start({ project_path: project, feature_id: "docs", files: ["docs/readme.md"] });
  const stored = JSON.parse(readFileSync(join(store, "reviews", `${receipt.review_id}.json`), "utf8"));
  assert.equal(stored.candidate_id, receipt.candidate_id);
  assert.equal(statSync(store).mode & 0o777, 0o700);
  assert.equal(statSync(join(store, "reviews", `${receipt.review_id}.json`)).mode & 0o777, 0o600);
});

test("rejects passing results without concrete evidence", () => {
  const { project, file, rdd } = fixture();
  file("commands/example.md");
  const receipt = rdd.start({ project_path: project, feature_id: "001", files: ["commands/example.md"] });

  assert.throws(
    () => rdd.capture({ review_id: receipt.review_id, lens: "code-review", status: "pass", summary: "Pass" }),
    (error) => error instanceof OrganicRddError && error.code === "evidence_required",
  );
  assert.throws(
    () => rdd.verify({ review_id: receipt.review_id, status: "pass", evidence: [] }),
    (error) => error instanceof OrganicRddError && error.code === "evidence_required",
  );
});

test("a failed lens keeps the receipt blocked until that lens is replaced", () => {
  const { project, file, rdd } = fixture();
  file("AGENTS.md");
  const receipt = rdd.start({ project_path: project, feature_id: "policy", files: ["AGENTS.md"] });
  rdd.capture({ review_id: receipt.review_id, lens: "code-review", status: "fail", summary: "Finding" });
  const updated = rdd.capture({
    review_id: receipt.review_id,
    lens: "verifier",
    status: "pass",
    summary: "Checks pass",
    evidence: ["node --test"],
  });
  assert.equal(updated.status, "blocked");
});

test("a failed verification remains blocked after later lens captures", () => {
  const { project, file, rdd } = fixture();
  file("AGENTS.md");
  const receipt = rdd.start({ project_path: project, feature_id: "policy", files: ["AGENTS.md"] });
  rdd.verify({ review_id: receipt.review_id, status: "fail", evidence: ["tests failed"] });
  const updated = rdd.capture({
    review_id: receipt.review_id,
    lens: "code-review",
    status: "pass",
    summary: "Review passed",
    evidence: ["review report"],
  });

  assert.equal(updated.verify_status, "fail");
  assert.equal(updated.status, "blocked");
});

test("valid JSON with an invalid receipt schema fails closed", () => {
  const { project, store, file, rdd } = fixture();
  file("docs/readme.md");
  const receipt = rdd.start({ project_path: project, feature_id: "docs", files: ["docs/readme.md"] });
  const path = join(store, "reviews", `${receipt.review_id}.json`);
  const tampered = JSON.parse(readFileSync(path, "utf8"));
  tampered.required_lenses = ["code-review"];
  writeFileSync(path, JSON.stringify(tampered));

  assert.throws(
    () => rdd.gate(receipt.review_id),
    (error) => error instanceof OrganicRddError && error.code === "receipt_invalid",
  );
});

test("blank persisted evidence fails closed", () => {
  const { project, store, file, rdd } = fixture();
  file("commands/example.md");
  const receipt = rdd.start({ project_path: project, feature_id: "001", files: ["commands/example.md"] });
  rdd.capture({
    review_id: receipt.review_id,
    lens: "code-review",
    status: "pass",
    summary: "Reviewed",
    evidence: ["review report"],
  });
  rdd.verify({ review_id: receipt.review_id, status: "pass", evidence: ["node --test"] });
  rdd.finalize(receipt.review_id);

  const path = join(store, "reviews", `${receipt.review_id}.json`);
  const tampered = JSON.parse(readFileSync(path, "utf8"));
  tampered.captured_lenses[0].evidence = ["   "];
  writeFileSync(path, JSON.stringify(tampered));
  assert.throws(
    () => rdd.gate(receipt.review_id),
    (error) => error instanceof OrganicRddError && error.code === "receipt_invalid",
  );
});

test("an inter-process receipt lock prevents an unlocked write", () => {
  const { project, store, file, rdd } = fixture();
  file("docs/readme.md");
  const receipt = rdd.start({ project_path: project, feature_id: "docs", files: ["docs/readme.md"] });
  mkdirSync(join(store, "locks", `${receipt.review_id}.lock`), { recursive: true });

  assert.throws(
    () => rdd.gate(receipt.review_id),
    (error) => error instanceof OrganicRddError && error.code === "review_busy",
  );
});

test("a lock owned by a dead process is recovered safely", () => {
  const { project, store, file, rdd } = fixture();
  file("docs/readme.md");
  const receipt = rdd.start({ project_path: project, feature_id: "docs", files: ["docs/readme.md"] });
  const lock = join(store, "locks", `${receipt.review_id}.lock`);
  mkdirSync(lock, { recursive: true });
  writeFileSync(join(lock, "owner.json"), JSON.stringify({ pid: 2_147_483_647, token: "dead" }));

  assert.equal(rdd.gate(receipt.review_id).decision, "pass");
});

test("a reused PID does not preserve another process lock", () => {
  const { project, store, file, rdd } = fixture();
  file("docs/readme.md");
  const receipt = rdd.start({ project_path: project, feature_id: "docs", files: ["docs/readme.md"] });
  const lock = join(store, "locks", `${receipt.review_id}.lock`);
  mkdirSync(lock, { recursive: true });
  writeFileSync(join(lock, "owner.json"), JSON.stringify({
    pid: process.pid,
    process_start: "not-the-current-process",
    token: "reused",
  }));

  assert.equal(rdd.gate(receipt.review_id).decision, "pass");
});

test("runtime code outside known control directories remains Tier 3", () => {
  assert.equal(classifyPaths(["tools/security-gate.js"]).tier, 3);
  assert.equal(classifyPaths(["scripts/model-router.ts"]).tier, 3);
  assert.equal(classifyPaths(["tests/model-router.test.js"]).tier, 2);
});

test("classifies nested OpenCode control files conservatively", () => {
  assert.equal(classifyPaths(["packages/app/AGENTS.md"]).tier, 2);
  assert.equal(classifyPaths([".opencode/agents/reviewer.md"]).tier, 2);
  assert.equal(classifyPaths([".opencode/agent/reviewer.md"]).tier, 2);
  assert.equal(classifyPaths([".opencode/commands/deploy.md"]).tier, 1);
  assert.equal(classifyPaths([".opencode/command/deploy.md"]).tier, 1);
  assert.equal(classifyPaths([".opencode/skills/release/SKILL.md"]).tier, 1);
  assert.equal(classifyPaths([".opencode/prompts/release.md"]).tier, 1);
});

test("classifies common executable source as Tier 3 except tests", () => {
  const runtimeFiles = [
    "src/view.jsx",
    "src/view.tsx",
    "src/server.py",
    "cmd/main.go",
    "src/main.rs",
    "src/Main.java",
    "src/Main.kt",
    "src/task.rb",
    "src/index.php",
    "src/main.c",
    "src/main.cpp",
    "scripts/deploy.sh",
  ];
  for (const path of runtimeFiles) assert.equal(classifyPaths([path]).tier, 3, path);
  assert.equal(classifyPaths(["tests/view.test.tsx"]).tier, 2);
  assert.equal(classifyPaths(["test/server_test.py"]).tier, 2);
});

test("Git metadata marks a complete explicit manifest", () => {
  const { project, file, rdd } = fixture();
  initGit(project);
  file("docs/a.md", "a");
  git(["add", "."], project);
  git(["commit", "-m", "initial"], project);
  file("docs/a.md", "changed");

  const receipt = rdd.start({ project_path: project, feature_id: "docs", files: ["docs/a.md"] });
  assert.equal(receipt.git.available, true);
  assert.deepEqual(receipt.manifest_warnings, []);
  assert.equal(rdd.status(receipt.review_id).manifest_complete, true);
});

test("Git metadata warns and strict gate fails for omitted changed files", () => {
  const { project, file, rdd } = fixture();
  initGit(project);
  file("docs/a.md", "a");
  file("docs/b.md", "b");
  git(["add", "."], project);
  git(["commit", "-m", "initial"], project);
  file("docs/a.md", "changed");
  file("docs/b.md", "changed");

  const receipt = rdd.start({ project_path: project, feature_id: "docs", files: ["docs/a.md"] });
  assert.equal(receipt.status, "approved");
  assert.equal(receipt.manifest_warnings[0].code, "manifest_incomplete");
  assert.deepEqual(receipt.manifest_warnings[0].files, ["docs/b.md"]);
  assert.equal(rdd.status(receipt.review_id).manifest_complete, false);
  assert.equal(rdd.gate(receipt.review_id).decision, "pass");
  const strict = rdd.gate(receipt.review_id, undefined, { strict_manifest: true });
  assert.equal(strict.decision, "fail");
  assert.equal(strict.reason, "manifest_incomplete");
});

test("non-Git projects continue without manifest warnings", () => {
  const { project, file, rdd } = fixture();
  file("docs/a.md", "a");
  const receipt = rdd.start({ project_path: project, feature_id: "docs", files: ["docs/a.md"] });
  assert.equal(receipt.git.available, false);
  assert.deepEqual(receipt.manifest_warnings, []);
  assert.equal(rdd.gate(receipt.review_id, undefined, { strict_manifest: true }).decision, "pass");
});

test("unborn Git repositories still inspect status for strict manifest", () => {
  const { project, file, rdd } = fixture();
  initGit(project);
  file("docs/a.md", "a");
  file("docs/b.md", "b");

  const receipt = rdd.start({ project_path: project, feature_id: "docs", files: ["docs/a.md"] });
  assert.equal(receipt.git.available, true);
  assert.equal(receipt.git.head, null);
  assert.deepEqual(receipt.manifest_warnings[0].files, ["docs/b.md"]);
  assert.equal(rdd.gate(receipt.review_id, undefined, { strict_manifest: true }).decision, "fail");
});

test("renamed files are compared using the destination path", () => {
  const { project, file, rdd } = fixture();
  initGit(project);
  file("docs/old.md", "a");
  git(["add", "."], project);
  git(["commit", "-m", "initial"], project);
  git(["mv", "docs/old.md", "docs/new.md"], project);

  const receipt = rdd.start({ project_path: project, feature_id: "rename", files: ["docs/new.md"] });
  assert.deepEqual(receipt.git.changed_files, ["docs/new.md"]);
  assert.deepEqual(receipt.manifest_warnings, []);
  assert.equal(rdd.gate(receipt.review_id, undefined, { strict_manifest: true }).decision, "pass");
});

test("nested workspace manifests compare workspace-relative paths", () => {
  const { root, rdd } = fixture();
  const repo = join(root, "repo");
  const project = join(repo, "sub");
  mkdirSync(project, { recursive: true });
  initGit(repo);
  writeFileSync(join(project, "a.md"), "a");
  git(["add", "."], repo);
  git(["commit", "-m", "initial"], repo);
  writeFileSync(join(project, "a.md"), "changed");

  const receipt = rdd.start({ project_path: project, feature_id: "nested", files: ["a.md"] });
  assert.deepEqual(receipt.git.changed_files, ["a.md"]);
  assert.deepEqual(receipt.manifest_warnings, []);
});

test("nested workspace strict manifest detects outside-workspace path collisions", () => {
  const { root, rdd } = fixture();
  const repo = join(root, "repo");
  const project = join(repo, "sub");
  mkdirSync(project, { recursive: true });
  initGit(repo);
  writeFileSync(join(repo, "a.md"), "root");
  writeFileSync(join(project, "a.md"), "sub");
  git(["add", "."], repo);
  git(["commit", "-m", "initial"], repo);
  writeFileSync(join(repo, "a.md"), "root changed");
  writeFileSync(join(project, "a.md"), "sub changed");

  const receipt = rdd.start({ project_path: project, feature_id: "nested", files: ["a.md"] });
  assert.deepEqual(receipt.git.changed_files, ["../a.md", "a.md"]);
  assert.deepEqual(receipt.manifest_warnings, [{ code: "manifest_incomplete", files: ["../a.md"] }]);
  assert.equal(rdd.gate(receipt.review_id, project, { strict_manifest: true }).decision, "fail");
});

test("strict manifest reports deletions as unsupported by explicit files", () => {
  const { project, file, rdd } = fixture();
  initGit(project);
  file("docs/a.md", "a");
  file("docs/keep.md", "keep");
  git(["add", "."], project);
  git(["commit", "-m", "initial"], project);
  git(["rm", "docs/a.md"], project);

  const receipt = rdd.start({ project_path: project, feature_id: "delete", files: ["docs/keep.md"] });
  assert.deepEqual(receipt.manifest_warnings, [{ code: "manifest_has_deletions", files: ["docs/a.md"] }]);
  const strict = rdd.gate(receipt.review_id, undefined, { strict_manifest: true });
  assert.equal(strict.decision, "fail");
  assert.equal(strict.reason, "manifest_incomplete");
});

test("strict gate fails closed if a Git receipt can no longer inspect Git", () => {
  const { project, file, rdd } = fixture();
  initGit(project);
  file("docs/a.md", "a");
  git(["add", "."], project);
  git(["commit", "-m", "initial"], project);
  file("docs/a.md", "changed");
  const receipt = rdd.start({ project_path: project, feature_id: "docs", files: ["docs/a.md"] });
  rmSync(join(project, ".git"), { recursive: true, force: true });

  const strict = rdd.gate(receipt.review_id, project, { strict_manifest: true });
  assert.equal(strict.decision, "fail");
  assert.equal(strict.reason, "manifest_incomplete");
  assert.deepEqual(strict.manifest_warnings, [{ code: "git_unavailable", files: [] }]);
});

test("strict gate fails closed when Git is unavailable at receipt creation", () => {
  const { project, file, rdd } = fixture();
  initGit(project);
  file("docs/a.md", "a");
  git(["add", "."], project);
  git(["commit", "-m", "initial"], project);
  file("docs/a.md", "changed");
  const originalPath = process.env.PATH;
  process.env.PATH = "/no-git-here";
  try {
    const receipt = rdd.start({ project_path: project, feature_id: "docs", files: ["docs/a.md"] });
    assert.equal(receipt.git.available, true);
    assert.equal(receipt.git.error, "git_unavailable");
    const strict = rdd.gate(receipt.review_id, project, { strict_manifest: true });
    assert.equal(strict.decision, "fail");
    assert.deepEqual(strict.manifest_warnings, [{ code: "git_unavailable", files: [] }]);
  } finally {
    process.env.PATH = originalPath;
  }
});

test("receipt records policy_snapshot with classifier version", () => {
  const { project, file, rdd } = fixture();
  file("docs/readme.md");
  const receipt = rdd.start({ project_path: project, feature_id: "docs", files: ["docs/readme.md"] });
  assert.equal(receipt.policy_snapshot.classifier_version, "hardening-007");
});

test("receipt without policy_snapshot remains readable", () => {
  const { project, store, file, rdd } = fixture();
  file("docs/readme.md");
  const receipt = rdd.start({ project_path: project, feature_id: "docs", files: ["docs/readme.md"] });
  const path = join(store, "reviews", `${receipt.review_id}.json`);
  const stored = JSON.parse(readFileSync(path, "utf8"));
  delete stored.policy_snapshot;
  writeFileSync(path, JSON.stringify(stored));
  assert.doesNotThrow(() => rdd.status(receipt.review_id));
});

test("receipt with parent_review_id stores lineage", () => {
  const { project, file, rdd } = fixture();
  file("commands/example.md", "original");
  const parent = rdd.start({ project_path: project, feature_id: "parent", files: ["commands/example.md"] });
  writeFileSync(join(project, "commands/example.md"), "changed");
  const child = rdd.start({
    project_path: project, feature_id: "child", files: ["commands/example.md"],
    parent_review_id: parent.review_id,
  });
  assert.equal(child.parent_review_id, parent.review_id);
  assert.equal(child.root_review_id, parent.review_id);
  assert.equal(child.attempt, (parent.attempt || 1) + 1);
});

test("receipt without parent defaults to attempt 1 and self-referential root", () => {
  const { project, file, rdd } = fixture();
  file("docs/a.md");
  const receipt = rdd.start({ project_path: project, feature_id: "docs", files: ["docs/a.md"] });
  assert.equal(receipt.parent_review_id, null);
  assert.equal(receipt.root_review_id, receipt.review_id);
  assert.equal(receipt.attempt, 1);
});

test("parent_review_id referencing unknown receipt is rejected", () => {
  const { project, file, rdd } = fixture();
  file("docs/a.md");
  assert.throws(
    () => rdd.start({ project_path: project, feature_id: "docs", files: ["docs/a.md"], parent_review_id: "r_999_000" }),
    (error) => error instanceof OrganicRddError && error.code === "lineage_invalid",
  );
});

test("parent_review_id from a different project is rejected", () => {
  const { root, project, file, rdd } = fixture();
  const other = join(root, "other");
  mkdirSync(join(other, "docs"), { recursive: true });
  writeFileSync(join(other, "docs/a.md"), "content");
  file("docs/a.md");
  const parent = rdd.start({ project_path: project, feature_id: "parent", files: ["docs/a.md"] });
  assert.throws(
    () => rdd.start({ project_path: other, feature_id: "child", files: ["docs/a.md"], parent_review_id: parent.review_id }),
    (error) => error instanceof OrganicRddError && error.code === "lineage_invalid",
  );
});

test("attempt overrides parent-derived attempt number", () => {
  const { project, file, rdd } = fixture();
  file("commands/a.md");
  const parent = rdd.start({ project_path: project, feature_id: "parent", files: ["commands/a.md"] });
  writeFileSync(join(project, "commands/a.md"), "changed");
  const child = rdd.start({
    project_path: project, feature_id: "child", files: ["commands/a.md"],
    parent_review_id: parent.review_id,
    attempt: 5,
  });
  assert.equal(child.attempt, 5);
});

test("open blocker finding prevents finalization", () => {
  const { project, file, rdd } = fixture();
  file("commands/example.md");
  const receipt = rdd.start({ project_path: project, feature_id: "example", files: ["commands/example.md"] });

  rdd.capture({
    review_id: receipt.review_id,
    lens: "code-review",
    status: "fail",
    summary: "Found issue",
    evidence: ["manual review"],
    findings: [{ kind: "blocker", summary: "Potential security issue", status: "open" }],
  });
  assert.equal(rdd.finalize(receipt.review_id).status, "blocked");
});

test("accepted-risk blocker with rationale allows finalization", () => {
  const { project, file, rdd } = fixture();
  file("commands/example.md");
  const receipt = rdd.start({ project_path: project, feature_id: "example", files: ["commands/example.md"] });

  rdd.capture({
    review_id: receipt.review_id,
    lens: "code-review",
    status: "pass",
    summary: "Reviewed",
    evidence: ["manual review"],
    findings: [{
      kind: "blocker",
      summary: "Legacy interface used intentionally for this release",
      status: "accepted-risk",
    }],
  });
  rdd.verify({ review_id: receipt.review_id, status: "pass", evidence: ["node --test"] });
  assert.equal(rdd.finalize(receipt.review_id).status, "approved");
});

test("findings are normalized to include fingerprint", () => {
  const { project, file, rdd } = fixture();
  file("commands/example.md");
  const receipt = rdd.start({ project_path: project, feature_id: "example", files: ["commands/example.md"] });

  const result = rdd.capture({
    review_id: receipt.review_id,
    lens: "code-review",
    status: "fail",
    summary: "Found issue",
    evidence: ["manual review"],
    findings: [{ kind: "blocker", summary: "Issue detail", path: "src/main.ts", line_start: 10, line_end: 20 }],
  });
  const finding = result.captured_lenses[0].findings[0];
  assert.equal(finding.kind, "blocker");
  assert.equal(finding.status, "open");
  assert.equal(finding.path, "src/main.ts");
  assert.match(finding.fingerprint, /^[a-f0-9]{16}$/);
  assert.equal(finding.finding_id, "f_" + finding.fingerprint);
});

test("accepted-risk without rationale is rejected", () => {
  const { project, file, rdd } = fixture();
  file("commands/example.md");
  const receipt = rdd.start({ project_path: project, feature_id: "example", files: ["commands/example.md"] });
  assert.throws(
    () => rdd.capture({
      review_id: receipt.review_id,
      lens: "code-review",
      status: "fail",
      summary: "Issue",
      evidence: ["review"],
      findings: [{ kind: "blocker", summary: "short", status: "accepted-risk" }],
    }),
    (error) => error instanceof OrganicRddError && error.code === "findings_invalid",
  );
});

test("invalid finding kind is rejected", () => {
  const { project, file, rdd } = fixture();
  file("commands/example.md");
  const receipt = rdd.start({ project_path: project, feature_id: "example", files: ["commands/example.md"] });
  assert.throws(
    () => rdd.capture({
      review_id: receipt.review_id,
      lens: "code-review",
      status: "fail",
      summary: "Issue",
      evidence: ["review"],
      findings: [{ kind: "critical", summary: "Bad kind" }],
    }),
    (error) => error instanceof OrganicRddError && error.code === "findings_invalid",
  );
});

test("open blocker finding with missing path defaults to empty string", () => {
  const { project, file, rdd } = fixture();
  file("commands/example.md");
  const receipt = rdd.start({ project_path: project, feature_id: "example", files: ["commands/example.md"] });
  const result = rdd.capture({
    review_id: receipt.review_id,
    lens: "code-review",
    status: "fail",
    summary: "Issue",
    evidence: ["review"],
    findings: [{ kind: "blocker", summary: "Some issue" }],
  });
  assert.equal(result.captured_lenses[0].findings[0].path, "");
});

test("reviewer_id and execution_id are stored as metadata", () => {
  const { project, file, rdd } = fixture();
  file("commands/example.md");
  const receipt = rdd.start({ project_path: project, feature_id: "example", files: ["commands/example.md"] });
  const result = rdd.capture({
    review_id: receipt.review_id,
    lens: "code-review",
    status: "pass",
    summary: "Reviewed",
    evidence: ["manual review"],
    reviewer_id: "code-reviewer",
    execution_id: "exec-001",
  });
  const lens = result.captured_lenses[0];
  assert.equal(lens.reviewer_id, "code-reviewer");
  assert.equal(lens.execution_id, "exec-001");
});

test("blocking test placeholder for future gate integration", () => {
  const { project, file, rdd } = fixture();
  file("docs/readme.md");
  const receipt = rdd.start({ project_path: project, feature_id: "docs", files: ["docs/readme.md"] });
  assert.equal(receipt.status, "approved");
  assert.equal(rdd.gate(receipt.review_id).decision, "pass");
});
