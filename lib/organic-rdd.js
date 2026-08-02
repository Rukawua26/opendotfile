import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  closeSync,
  chmodSync,
  constants,
  existsSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const SCHEMA_VERSION = 1;
const MODES = new Set(["managed", "disabled"]);
const LENS_STATUSES = new Set(["pass", "fail", "blocked"]);
const VERIFY_STATUSES = new Set(["pass", "fail", "blocked"]);
const REVIEW_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const LENS_ORDER = ["code-review", "verifier", "security-review", "architecture-review"];
const RECEIPT_STATUSES = new Set(["reviewing", "validating", "approved", "blocked", "unmanaged"]);
const STORED_VERIFY_STATUSES = new Set(["pending", "pass", "fail", "blocked", "skipped"]);
const GATE_STATUSES = new Set(["pending", "pass", "fail", "skipped"]);
const MAX_FILES = 200;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FEATURE_LENGTH = 200;
const MAX_SUMMARY_LENGTH = 4000;
const MAX_EVIDENCE_ITEMS = 100;
const MAX_EVIDENCE_LENGTH = 2000;
const LOCK_ATTEMPTS = 50;
const LOCK_WAIT_MS = 10;
const ORPHAN_LOCK_MS = 5_000;
const CLASSIFIER_VERSION = "hardening-007";
const FINDING_KINDS = new Set(["blocker", "advisory"]);
const FINDING_STATUSES = new Set(["open", "resolved", "accepted-risk"]);
const MAX_FINDINGS_PER_LENS = 50;
const MAX_FINDING_SUMMARY_LENGTH = 1000;
const MAX_REVIEWER_ID_LENGTH = 200;
const MAX_EXECUTION_ID_LENGTH = 200;

export class OrganicRddError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "OrganicRddError";
    this.code = code;
    this.details = details;
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizePath(path) {
  return String(path).replaceAll("\\", "/").replace(/^\.\//, "");
}

function unique(values) {
  return [...new Set(values)];
}

function classifyOne(inputPath) {
  const path = normalizePath(inputPath);
  const lower = path.toLowerCase();
  const testCode = /(?:^|\/)(?:tests?|__tests__)(?:\/|$)/.test(lower);

  if (
    /(?:^|\/)agents\.md$/.test(lower)
    || /^(?:package(?:-lock)?\.json|cron-jobs\.json|install\.sh)$/.test(lower)
  ) {
    return { tier: 2, reasons: ["central OpenCode configuration"] };
  }

  const runtimeCode = (!testCode && /\.(?:[cm]?[jt]s|[jt]sx|[cm]ts|py|go|rs|java|kts?|rb|php|c|cc|cpp|cxx|h|hh|hpp|hxx|sh|bash|zsh)$/.test(lower))
    || /^(bin|tools|scripts)\//.test(lower);
  if (runtimeCode) {
    const reasons = [
      "runtime or control-plane code",
      "security-sensitive runtime code",
      "architecture-sensitive control flow",
    ];
    return { tier: 3, reasons };
  }

  if (
    /^(skills|commands|prompts|injects|spec)\//.test(lower)
    || /^\.opencode\/(?:commands?|skills?|prompts?)(?:\/|$)/.test(lower)
  ) {
    return { tier: 1, reasons: ["workflow guidance"] };
  }

  if (
    /^opencode\.jsonc?$/.test(lower)
    || /^(profiles|agents|mcp)\//.test(lower)
    || /^\.opencode\/(?:agents?|mcp)(?:\/|$)/.test(lower)
    || /^\.opencode\//.test(lower)
    || /\.(?:toml|ya?ml)$/.test(lower)
  ) {
    return { tier: 2, reasons: ["central OpenCode configuration"] };
  }

  if (/\.md$/.test(lower) || /^(docs|notes|canvases)\//.test(lower)) {
    return { tier: 0, reasons: ["informational documentation"] };
  }

  return { tier: 2, reasons: ["unclassified operational file"] };
}

export function classifyPaths(paths) {
  if (!Array.isArray(paths) || paths.length === 0) {
    throw new OrganicRddError("files_required", "At least one candidate file is required.");
  }

  const classifications = paths.map(classifyOne);
  const tier = Math.max(...classifications.map((item) => item.tier));
  const reasons = unique(
    classifications.filter((item) => item.tier === tier).flatMap((item) => item.reasons),
  );
  const required = [];

  if (tier >= 1) required.push("code-review");
  if (tier >= 2) required.push("verifier");
  if (tier === 3 && reasons.some((reason) => reason.includes("security-sensitive"))) {
    required.push("security-review");
  }
  if (tier === 3 && reasons.some((reason) => reason.includes("architecture-sensitive"))) {
    required.push("architecture-review");
  }

  return {
    tier,
    reasons,
    required_lenses: LENS_ORDER.filter((lens) => required.includes(lens)),
  };
}

function git(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
}

function parsePorcelainZ(output) {
  const parts = output.split("\0").filter(Boolean);
  const changed = [];
  const untracked = [];
  const deleted = [];
  for (let i = 0; i < parts.length; i += 1) {
    const entry = parts[i];
    const status = entry.slice(0, 2);
    let path = normalizePath(entry.slice(3));
    if (status[0] === "R" || status[0] === "C") {
      i += 1;
    }
    if (!path) continue;
    changed.push(path);
    if (status === "??") untracked.push(path);
    if (status.includes("D")) deleted.push(path);
  }
  return {
    changed_files: unique(changed).sort(),
    untracked_files: unique(untracked).sort(),
    deleted_files: unique(deleted).sort(),
  };
}

function relativizeGitPaths(paths, gitRoot, projectPath) {
  return paths.map((path) => {
    const abs = resolve(gitRoot, path);
    return normalizePath(relative(projectPath, abs));
  }).filter(Boolean).sort();
}

function inspectGit(projectPath) {
  try {
    const rootPath = realpathSync(git(["rev-parse", "--show-toplevel"], projectPath).trim());
    let head = null;
    try {
      head = git(["rev-parse", "--verify", "HEAD"], projectPath).trim();
    } catch {
      head = null;
    }
    let status;
    try {
      status = parsePorcelainZ(git(["-c", "status.relativePaths=false", "status", "--porcelain=v1", "-z", "--untracked-files=all"], projectPath));
    } catch (error) {
      return {
        available: true,
        error: "git_status_failed",
        root: normalizePath(rootPath),
        head,
        changed_files: [],
        untracked_files: [],
        deleted_files: [],
      };
    }
    return {
      available: true,
      root: normalizePath(rootPath),
      head,
      changed_files: relativizeGitPaths(status.changed_files, rootPath, projectPath),
      untracked_files: relativizeGitPaths(status.untracked_files, rootPath, projectPath),
      deleted_files: relativizeGitPaths(status.deleted_files, rootPath, projectPath),
    };
  } catch {
    const root = findGitMarker(projectPath);
    return root
      ? { available: true, error: "git_unavailable", root: normalizePath(root), head: null, changed_files: [], untracked_files: [], deleted_files: [] }
      : { available: false, root: null, head: null, changed_files: [], untracked_files: [], deleted_files: [] };
  }
}

function findGitMarker(projectPath) {
  let current;
  try {
    current = realpathSync(resolve(projectPath));
  } catch {
    return null;
  }
  while (true) {
    if (existsSync(join(current, ".git"))) return current;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function manifestWarnings(candidateFiles, gitState, expectedGit = false) {
  if (!gitState?.available) return expectedGit ? [{ code: "git_unavailable", files: [] }] : [];
  if (gitState.error) return [{ code: gitState.error, files: [] }];
  const included = new Set(candidateFiles.map((file) => normalizePath(file.path)));
  const missing = gitState.changed_files
    .filter((file) => !gitState.deleted_files.includes(file))
    .filter((file) => !included.has(file));
  const warnings = [];
  if (missing.length) warnings.push({ code: "manifest_incomplete", files: missing });
  if (gitState.deleted_files.length) warnings.push({ code: "manifest_has_deletions", files: gitState.deleted_files });
  return warnings;
}

function ensurePrivateDir(path) {
  mkdirSync(path, { recursive: true, mode: 0o700 });
  chmodSync(path, 0o700);
}

function atomicWriteJson(path, value) {
  ensurePrivateDir(dirname(path));
  const temporary = join(dirname(path), `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`);
  try {
    writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
    renameSync(temporary, path);
    chmodSync(path, 0o600);
  } catch (error) {
    if (existsSync(temporary)) unlinkSync(temporary);
    throw error;
  }
}

function parseJsonFile(path, code) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new OrganicRddError(code, `Invalid JSON state at ${path}.`, { cause: error.message });
  }
}

function resolveProject(projectPath) {
  if (!projectPath || typeof projectPath !== "string") {
    throw new OrganicRddError("project_required", "project_path is required.");
  }
  try {
    const project = realpathSync(resolve(projectPath));
    if (!statSync(project).isDirectory()) throw new Error("not a directory");
    return project;
  } catch (error) {
    throw new OrganicRddError("project_invalid", `Project path is not a readable directory: ${projectPath}`, {
      cause: error.message,
    });
  }
}

function pathIsInside(parent, child) {
  const rel = relative(parent, child);
  return rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

function rejectSymlinkComponents(project, lexicalPath, input) {
  const rel = relative(project, lexicalPath);
  if (rel === "" || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new OrganicRddError("file_outside_project", `Candidate file is outside the project: ${input}`);
  }
  let current = project;
  for (const part of rel.split(sep)) {
    current = join(current, part);
    try {
      if (lstatSync(current).isSymbolicLink()) {
        throw new OrganicRddError("file_symlink", `Candidate paths may not contain symbolic links: ${input}`);
      }
    } catch (error) {
      if (error instanceof OrganicRddError) throw error;
      throw new OrganicRddError("file_unreadable", `Candidate file is not readable: ${input}`, {
        cause: error.message,
      });
    }
  }
}

function inspectCandidate(projectPath, files) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new OrganicRddError("files_required", "At least one candidate file is required.");
  }
  if (files.length > MAX_FILES) {
    throw new OrganicRddError("files_limit", `A candidate may contain at most ${MAX_FILES} files.`);
  }

  const project = resolveProject(projectPath);
  const recordsByPath = new Map();

  for (const input of files) {
    if (typeof input !== "string" || input.trim() === "") {
      throw new OrganicRddError("file_invalid", "Candidate file paths must be non-empty strings.");
    }
    const lexicalPath = isAbsolute(input) ? resolve(input) : resolve(project, input);
    rejectSymlinkComponents(project, lexicalPath, input);
    let actualPath;
    try {
      actualPath = realpathSync(lexicalPath);
    } catch (error) {
      throw new OrganicRddError("file_unreadable", `Candidate file is not readable: ${input}`, {
        cause: error.message,
      });
    }
    if (!pathIsInside(project, actualPath)) {
      throw new OrganicRddError("file_outside_project", `Candidate file is outside the project: ${input}`);
    }
    let fd;
    try {
      fd = openSync(lexicalPath, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
      const openedPath = process.platform === "linux"
        ? realpathSync(`/proc/self/fd/${fd}`)
        : actualPath;
      if (!pathIsInside(project, openedPath)) {
        throw new OrganicRddError("file_outside_project", `Candidate file escaped the project: ${input}`);
      }
      const before = fstatSync(fd);
      if (!before.isFile()) {
        throw new OrganicRddError("file_invalid", `Candidate path is not a regular file: ${input}`);
      }
      if (before.size > MAX_FILE_BYTES) {
        throw new OrganicRddError("file_too_large", `Candidate file exceeds ${MAX_FILE_BYTES} bytes: ${input}`);
      }
      const bytes = readFileSync(fd);
      const after = fstatSync(fd);
      if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeMs !== after.mtimeMs) {
        throw new OrganicRddError("file_changed_during_read", `Candidate file changed while being hashed: ${input}`);
      }

      const projectRelative = normalizePath(relative(project, lexicalPath));
      recordsByPath.set(projectRelative, {
        path: projectRelative,
        sha256: sha256(bytes),
      });
    } finally {
      if (fd !== undefined) closeSync(fd);
    }
  }

  const candidate_files = [...recordsByPath.values()].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  return {
    project_path: project,
    candidate_id: sha256(JSON.stringify(candidate_files)),
    candidate_files,
  };
}

function now() {
  return new Date().toISOString();
}

function validateReviewID(reviewID) {
  if (!REVIEW_ID_PATTERN.test(String(reviewID || ""))) {
    throw new OrganicRddError("review_id_invalid", "review_id contains invalid characters.");
  }
}

function normalizeEvidence(evidence) {
  if (evidence === undefined) return [];
  if (!Array.isArray(evidence) || evidence.some((item) => typeof item !== "string")) {
    throw new OrganicRddError("evidence_invalid", "evidence must be an array of strings.");
  }
  if (evidence.length > MAX_EVIDENCE_ITEMS) {
    throw new OrganicRddError("evidence_limit", `evidence may contain at most ${MAX_EVIDENCE_ITEMS} items.`);
  }
  const normalized = evidence.map((item) => item.trim()).filter(Boolean);
  if (normalized.some((item) => item.length > MAX_EVIDENCE_LENGTH)) {
    throw new OrganicRddError("evidence_limit", `Each evidence item must be at most ${MAX_EVIDENCE_LENGTH} characters.`);
  }
  return normalized;
}

function findingFingerprint(lens, path, summary) {
  return sha256([lens, path || "", summary || ""].join("\0")).slice(0, 16);
}

function normalizeFindings(rawFindings, lens) {
  if (rawFindings === undefined) return [];
  if (!Array.isArray(rawFindings)) {
    throw new OrganicRddError("findings_invalid", "findings must be an array.");
  }
  if (rawFindings.length > MAX_FINDINGS_PER_LENS) {
    throw new OrganicRddError("findings_limit", `findings may contain at most ${MAX_FINDINGS_PER_LENS} items per lens.`);
  }
  return rawFindings.map((item) => {
    if (!item || typeof item !== "object") {
      throw new OrganicRddError("findings_invalid", "each finding must be an object.");
    }
    const kind = String(item.kind || "").trim();
    if (!FINDING_KINDS.has(kind)) {
      throw new OrganicRddError("findings_invalid", `finding kind must be blocker or advisory: ${kind}`);
    }
    const status = String(item.status || "open").trim();
    if (!FINDING_STATUSES.has(status)) {
      throw new OrganicRddError("findings_invalid", `finding status must be open, resolved, or accepted-risk: ${status}`);
    }
    const summary = String(item.summary || "").trim();
    if (!summary) {
      throw new OrganicRddError("findings_invalid", "finding summary is required.");
    }
    if (summary.length > MAX_FINDING_SUMMARY_LENGTH) {
      throw new OrganicRddError("findings_invalid", `finding summary must be at most ${MAX_FINDING_SUMMARY_LENGTH} characters.`);
    }
    if (status === "accepted-risk" && summary.length < 10) {
      throw new OrganicRddError("findings_invalid", "accepted-risk findings require a rationale of at least 10 characters.");
    }
    const path = String(item.path || "").trim();
    const lineStart = item.line_start;
    const lineEnd = item.line_end;
    if (lineStart !== undefined && (!Number.isInteger(lineStart) || lineStart < 0)) {
      throw new OrganicRddError("findings_invalid", "line_start must be a non-negative integer.");
    }
    if (lineEnd !== undefined && (!Number.isInteger(lineEnd) || lineEnd < 0)) {
      throw new OrganicRddError("findings_invalid", "line_end must be a non-negative integer.");
    }
    const id = String(item.finding_id || "").trim() || `f_${findingFingerprint(lens, path, summary)}`;
    return {
      finding_id: id,
      fingerprint: findingFingerprint(lens, path, summary),
      kind,
      status,
      path,
      ...(lineStart !== undefined ? { line_start: lineStart } : {}),
      ...(lineEnd !== undefined ? { line_end: lineEnd } : {}),
      summary,
    };
  });
}

function openBlockerFindings(receipt) {
  return receipt.captured_lenses.flatMap((entry) =>
    (entry.findings || []).filter((f) => f.kind === "blocker" && f.status === "open"),
  );
}

function normalizeOptionalId(value, field, limit) {
  if (value === undefined || value === null) return null;
  const id = String(value).trim();
  if (!id) return null;
  if (id.length > limit) {
    throw new OrganicRddError("lens_invalid", `${field} must be at most ${limit} characters.`);
  }
  return id;
}

function policySnapshot() {
  return { classifier_version: CLASSIFIER_VERSION };
}

function sameArray(left, right) {
  return Array.isArray(left) && Array.isArray(right)
    && left.length === right.length
    && left.every((value, index) => value === right[index]);
}

function validStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function validateReceipt(receipt, reviewID) {
  const invalid = (reason) => {
    throw new OrganicRddError("receipt_invalid", `Invalid review receipt ${reviewID}: ${reason}`);
  };
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) invalid("expected an object");
  if (receipt.schema_version !== SCHEMA_VERSION || receipt.review_id !== reviewID) invalid("schema or identity mismatch");
  if (!Number.isInteger(receipt.revision) || receipt.revision < 0) invalid("invalid revision");
  if (receipt.projection !== "explicit-files") invalid("unsupported projection");
  if (typeof receipt.feature_id !== "string" || !receipt.feature_id) invalid("missing feature_id");
  if (typeof receipt.project_path !== "string" || !isAbsolute(receipt.project_path)) invalid("invalid project_path");
  if (typeof receipt.project_name !== "string" || !receipt.project_name) invalid("invalid project_name");
  if (!RECEIPT_STATUSES.has(receipt.status)) invalid("invalid lifecycle status");
  if (!MODES.has(receipt.review_mode)) invalid("invalid review mode");
  if (!Number.isInteger(receipt.tier) || receipt.tier < 0 || receipt.tier > 3) invalid("invalid tier");
  if (!validStringArray(receipt.tier_reasons) || receipt.tier_reasons.length === 0) invalid("invalid tier reasons");
  if (!/^[a-f0-9]{64}$/.test(receipt.candidate_id || "")) invalid("invalid candidate_id");
  if (!Array.isArray(receipt.candidate_files) || receipt.candidate_files.length === 0 || receipt.candidate_files.length > MAX_FILES) {
    invalid("invalid candidate file manifest");
  }

  const paths = new Set();
  for (const file of receipt.candidate_files) {
    if (!file || typeof file !== "object" || typeof file.path !== "string" || !/^[a-f0-9]{64}$/.test(file.sha256 || "")) {
      invalid("invalid candidate file record");
    }
    const normalized = normalizePath(file.path);
    if (normalized !== file.path || isAbsolute(file.path) || file.path === ".." || file.path.startsWith("../") || paths.has(file.path)) {
      invalid("unsafe or duplicate candidate path");
    }
    paths.add(file.path);
  }
  const orderedFiles = [...receipt.candidate_files].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  if (JSON.stringify(orderedFiles) !== JSON.stringify(receipt.candidate_files)) invalid("candidate files are not sorted");
  if (sha256(JSON.stringify(receipt.candidate_files)) !== receipt.candidate_id) invalid("candidate hash mismatch");

  const classification = classifyPaths(receipt.candidate_files.map((file) => file.path));
  if (classification.tier !== receipt.tier
    || !sameArray(classification.reasons, receipt.tier_reasons)
    || !sameArray(classification.required_lenses, receipt.required_lenses)) {
    invalid("classification mismatch");
  }

  if (!Array.isArray(receipt.captured_lenses)) invalid("invalid captured lenses");
  const captured = new Set();
  for (const result of receipt.captured_lenses) {
    if (!result || !receipt.required_lenses.includes(result.lens) || captured.has(result.lens) || !LENS_STATUSES.has(result.status)) {
      invalid("invalid captured lens");
    }
    if (typeof result.summary !== "string" || !validStringArray(result.evidence) || typeof result.captured_at !== "string") {
      invalid("invalid captured lens evidence");
    }
    if (result.summary.length > MAX_SUMMARY_LENGTH
      || result.evidence.length > MAX_EVIDENCE_ITEMS
      || result.evidence.some((item) => !item.trim() || item.length > MAX_EVIDENCE_LENGTH)) {
      invalid("captured lens evidence exceeds limits or is blank");
    }
    if (result.status === "pass" && (!result.summary.trim() || result.evidence.length === 0)) {
      invalid("passing lens lacks evidence");
    }
    if (result.reviewer_id !== undefined && result.reviewer_id !== null) {
      if (typeof result.reviewer_id !== "string" || result.reviewer_id.length > MAX_REVIEWER_ID_LENGTH) {
        invalid("invalid reviewer_id");
      }
    }
    if (result.execution_id !== undefined && result.execution_id !== null) {
      if (typeof result.execution_id !== "string" || result.execution_id.length > MAX_EXECUTION_ID_LENGTH) {
        invalid("invalid execution_id");
      }
    }
    if (result.findings !== undefined && result.findings !== null) {
      if (!Array.isArray(result.findings)) invalid("invalid findings");
      for (const finding of result.findings) {
        if (!finding || typeof finding !== "object") invalid("invalid finding");
        if (!FINDING_KINDS.has(finding.kind)) invalid("invalid finding kind");
        if (!FINDING_STATUSES.has(finding.status)) invalid("invalid finding status");
        if (typeof finding.summary !== "string" || !finding.summary.trim()) invalid("invalid finding summary");
        if (finding.kind === "blocker" && finding.status === "accepted-risk" && finding.summary.trim().length < 10) {
          invalid("accepted-risk blocker requires rationale");
        }
      }
    }
    captured.add(result.lens);
  }

  if (receipt.parent_review_id !== undefined && receipt.parent_review_id !== null) {
    if (typeof receipt.parent_review_id !== "string" || !REVIEW_ID_PATTERN.test(receipt.parent_review_id)) {
      invalid("invalid parent_review_id");
    }
  }
  if (receipt.root_review_id !== undefined && receipt.root_review_id !== null) {
    if (typeof receipt.root_review_id !== "string" || !REVIEW_ID_PATTERN.test(receipt.root_review_id)) {
      invalid("invalid root_review_id");
    }
  }
  if (receipt.attempt !== undefined) {
    if (!Number.isInteger(receipt.attempt) || receipt.attempt < 1) invalid("invalid attempt");
  }
  if (receipt.policy_snapshot !== undefined && receipt.policy_snapshot !== null) {
    if (!receipt.policy_snapshot || typeof receipt.policy_snapshot !== "object") invalid("invalid policy_snapshot");
    if (typeof receipt.policy_snapshot.classifier_version !== "string" || !receipt.policy_snapshot.classifier_version) {
      invalid("invalid policy_snapshot classifier_version");
    }
  }

  if (!STORED_VERIFY_STATUSES.has(receipt.verify_status) || !validStringArray(receipt.verify_evidence)) {
    invalid("invalid verification state");
  }
  if (receipt.verify_evidence.length > MAX_EVIDENCE_ITEMS
    || receipt.verify_evidence.some((item) => !item.trim() || item.length > MAX_EVIDENCE_LENGTH)) {
    invalid("verification evidence exceeds limits or is blank");
  }
  if (receipt.verify_status === "pass" && receipt.verify_evidence.length === 0) invalid("passing verification lacks evidence");
  if (!GATE_STATUSES.has(receipt.gate_status)) invalid("invalid gate state");
  if (receipt.git !== undefined) {
    if (!receipt.git || typeof receipt.git !== "object" || typeof receipt.git.available !== "boolean") invalid("invalid git state");
    if (!validStringArray(receipt.git.changed_files)
      || !validStringArray(receipt.git.untracked_files)
      || !validStringArray(receipt.git.deleted_files || [])) invalid("invalid git file state");
  }
  if (receipt.manifest_warnings !== undefined) {
    if (!Array.isArray(receipt.manifest_warnings)) invalid("invalid manifest warnings");
    for (const warning of receipt.manifest_warnings) {
      if (!warning || typeof warning.code !== "string" || !validStringArray(warning.files)) invalid("invalid manifest warning");
    }
  }
  if (typeof receipt.created_at !== "string" || typeof receipt.updated_at !== "string") invalid("invalid timestamps");

  if (receipt.status === "approved") {
    const allLensesPass = receipt.required_lenses.every((lens) => {
      const result = receipt.captured_lenses.find((entry) => entry.lens === lens);
      return result?.status === "pass";
    });
    const verified = receipt.tier === 0 ? receipt.verify_status === "skipped" : receipt.verify_status === "pass";
    const hasOpenBlockers = (receipt.captured_lenses || []).flatMap((entry) => entry.findings || [])
      .some((f) => f.kind === "blocker" && f.status === "open");
    if (receipt.review_mode !== "managed" || !allLensesPass || !verified || hasOpenBlockers) invalid("inconsistent approval");
  }
  return receipt;
}

export function createOrganicRdd({ storeDir } = {}) {
  const root = resolve(storeDir || join(process.env.HOME || "/tmp", ".local/share/opencode/plugins-data/organic-rdd"));
  const reviewsDir = join(root, "reviews");
  const locksDir = join(root, "locks");
  const modePath = join(root, "mode.json");

  function prepareStore() {
    ensurePrivateDir(root);
    ensurePrivateDir(reviewsDir);
    ensurePrivateDir(locksDir);
  }

  function waitForLock() {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, LOCK_WAIT_MS);
  }

  function processIsAlive(pid) {
    if (!Number.isInteger(pid) || pid <= 0) return false;
    try {
      process.kill(pid, 0);
      return true;
    } catch (error) {
      return error.code === "EPERM";
    }
  }

  function processIdentity(pid) {
    if (process.platform !== "linux") return null;
    try {
      const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
      const fields = stat.slice(stat.lastIndexOf(")") + 2).trim().split(/\s+/);
      return fields[19] || null;
    } catch {
      return null;
    }
  }

  function removeAbandonedLock(lockPath) {
    try {
      const owner = JSON.parse(readFileSync(join(lockPath, "owner.json"), "utf8"));
      if (processIsAlive(owner.pid)) {
        const identity = processIdentity(owner.pid);
        if (!owner.process_start || !identity || owner.process_start === identity) return false;
      }
    } catch (error) {
      if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
      try {
        if (Date.now() - statSync(lockPath).mtimeMs <= ORPHAN_LOCK_MS) return false;
      } catch (statError) {
        if (statError.code === "ENOENT") return true;
        throw statError;
      }
    }
    const stalePath = `${lockPath}.stale.${randomUUID()}`;
    try {
      renameSync(lockPath, stalePath);
      rmSync(stalePath, { recursive: true, force: true });
      return true;
    } catch (error) {
      if (error.code === "ENOENT") return false;
      throw error;
    }
  }

  function withReceiptLock(reviewID, action) {
    prepareStore();
    const lockPath = join(locksDir, `${reviewID}.lock`);
    const ownerToken = randomUUID();
    let acquired = false;
    for (let attempt = 0; attempt < LOCK_ATTEMPTS; attempt += 1) {
      try {
        mkdirSync(lockPath, { mode: 0o700 });
        writeFileSync(join(lockPath, "owner.json"), JSON.stringify({
          pid: process.pid,
          process_start: processIdentity(process.pid),
          token: ownerToken,
        }), { mode: 0o600 });
        acquired = true;
        break;
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
        if (removeAbandonedLock(lockPath)) continue;
        waitForLock();
      }
    }
    if (!acquired) {
      throw new OrganicRddError("review_busy", "Receipt is being updated by another process; retry.");
    }
    try {
      return action();
    } finally {
      try {
        const owner = JSON.parse(readFileSync(join(lockPath, "owner.json"), "utf8"));
        if (owner.token === ownerToken) rmSync(lockPath, { recursive: true, force: true });
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
  }

  function receiptPath(reviewID) {
    validateReviewID(reviewID);
    return join(reviewsDir, `${reviewID}.json`);
  }

  function getMode() {
    prepareStore();
    if (!existsSync(modePath)) return { mode: "managed", source: "default" };
    try {
      const state = JSON.parse(readFileSync(modePath, "utf8"));
      if (state.schema_version !== SCHEMA_VERSION || !MODES.has(state.mode) || typeof state.updated_at !== "string") {
        throw new Error("unsupported mode schema");
      }
      return { mode: state.mode, source: modePath, updated_at: state.updated_at };
    } catch (error) {
      return {
        mode: "managed",
        source: modePath,
        anomaly: `Invalid review mode state; failed closed as managed: ${error.message}`,
      };
    }
  }

  function setMode(mode) {
    if (!MODES.has(mode)) {
      throw new OrganicRddError("mode_invalid", "mode must be managed or disabled.");
    }
    const state = { schema_version: SCHEMA_VERSION, mode, updated_at: now() };
    atomicWriteJson(modePath, state);
    return state;
  }

  function loadReceipt(reviewID) {
    const path = receiptPath(reviewID);
    if (!existsSync(path)) {
      throw new OrganicRddError("review_not_found", `Review receipt not found: ${reviewID}`);
    }
    const receipt = parseJsonFile(path, "receipt_invalid");
    return validateReceipt(receipt, reviewID);
  }

  function saveReceipt(receipt, { create = false } = {}) {
    return withReceiptLock(receipt.review_id, () => {
      const path = receiptPath(receipt.review_id);
      if (existsSync(path)) {
        if (create) throw new OrganicRddError("review_conflict", "Review ID already exists.");
        const current = validateReceipt(parseJsonFile(path, "receipt_invalid"), receipt.review_id);
        if (current.revision !== receipt.revision) {
          throw new OrganicRddError("review_conflict", "Receipt changed concurrently; reload and retry.", {
            expected_revision: receipt.revision,
            current_revision: current.revision,
          });
        }
      } else if (!create) {
        throw new OrganicRddError("review_not_found", `Review receipt not found: ${receipt.review_id}`);
      }
      receipt.revision += 1;
      receipt.updated_at = now();
      validateReceipt(receipt, receipt.review_id);
      atomicWriteJson(path, receipt);
      return receipt;
    });
  }

  function freshness(receipt) {
    try {
      const current = inspectCandidate(
        receipt.project_path,
        receipt.candidate_files.map((file) => file.path),
      );
      return {
        candidate_fresh: current.candidate_id === receipt.candidate_id,
        current_candidate_id: current.candidate_id,
      };
    } catch (error) {
      return {
        candidate_fresh: false,
        current_candidate_id: null,
        freshness_error: error instanceof OrganicRddError ? error.message : String(error),
      };
    }
  }

  function missingLenses(receipt) {
    return receipt.required_lenses.filter((lens) => {
      const result = receipt.captured_lenses.find((entry) => entry.lens === lens);
      return !result || result.status !== "pass";
    });
  }

  function failedLenses(receipt) {
    return receipt.captured_lenses
      .filter((entry) => entry.status !== "pass")
      .map((entry) => entry.lens);
  }

  function receiptReady(receipt) {
    return missingLenses(receipt).length === 0
      && failedLenses(receipt).length === 0
      && (receipt.tier === 0 ? receipt.verify_status === "skipped" : receipt.verify_status === "pass");
  }

  function assertReceiptProject(receipt, projectPath) {
    if (!projectPath) return;
    const project = resolveProject(projectPath);
    if (project !== receipt.project_path) {
      throw new OrganicRddError("project_mismatch", "Review receipt belongs to a different project workspace.");
    }
  }

  function resolveLineage({ parent_review_id, attempt }, project) {
    if (parent_review_id === undefined || parent_review_id === null) {
      return { parent_review_id: null, attempt: Math.max(1, Number(attempt) || 1) };
    }
    if (typeof parent_review_id !== "string" || !REVIEW_ID_PATTERN.test(parent_review_id)) {
      throw new OrganicRddError("lineage_invalid", "parent_review_id contains invalid characters.");
    }
    const parentPath = receiptPath(parent_review_id);
    if (!existsSync(parentPath)) {
      throw new OrganicRddError("lineage_invalid", `parent review not found: ${parent_review_id}`);
    }
    const parent = validateReceipt(parseJsonFile(parentPath, "receipt_invalid"), parent_review_id);
    if (parent.project_path !== project) {
      throw new OrganicRddError("lineage_invalid", "parent review belongs to a different project.");
    }
    const resolvedAttempt = Number.isInteger(Number(attempt)) && Number(attempt) > 0
      ? Number(attempt)
      : (parent.attempt || 1) + 1;
    return {
      parent_review_id: parent_review_id,
      root_review_id: parent.root_review_id || parent.review_id,
      attempt: resolvedAttempt,
    };
  }

  function start({ project_path, feature_id, files, parent_review_id, attempt }) {
    if (!feature_id || typeof feature_id !== "string" || feature_id.trim().length > MAX_FEATURE_LENGTH) {
      throw new OrganicRddError("feature_required", "feature_id is required.");
    }
    prepareStore();
    const candidate = inspectCandidate(project_path, files);
    const classification = classifyPaths(candidate.candidate_files.map((file) => file.path));
    const gitState = inspectGit(candidate.project_path);
    const warnings = manifestWarnings(candidate.candidate_files, gitState);
    const mode = getMode();
    const timestamp = now();
    const lineage = resolveLineage({ parent_review_id, attempt }, candidate.project_path);
    const reviewID = `r_${Date.now()}_${randomUUID()}`;
    const receipt = {
      schema_version: SCHEMA_VERSION,
      revision: 0,
      review_id: reviewID,
      projection: "explicit-files",
      feature_id: feature_id.trim(),
      project_path: candidate.project_path,
      project_name: basename(candidate.project_path),
      status: mode.mode === "disabled" ? "unmanaged" : classification.tier === 0 ? "approved" : "reviewing",
      review_mode: mode.mode,
      tier: classification.tier,
      tier_reasons: classification.reasons,
      candidate_id: candidate.candidate_id,
      candidate_files: candidate.candidate_files,
      required_lenses: classification.required_lenses,
      captured_lenses: [],
      verify_status: classification.tier === 0 ? "skipped" : "pending",
      verify_evidence: [],
      git: gitState,
      manifest_warnings: warnings,
      gate_status: "pending",
      created_at: timestamp,
      updated_at: timestamp,
      parent_review_id: lineage.parent_review_id,
      root_review_id: lineage.root_review_id || reviewID,
      attempt: lineage.attempt,
      policy_snapshot: policySnapshot(),
    };
    if (mode.anomaly) receipt.mode_anomaly = mode.anomaly;
    return saveReceipt(receipt, { create: true });
  }

  function status(reviewID, projectPath) {
    const receipt = loadReceipt(reviewID);
    assertReceiptProject(receipt, projectPath);
    const currentMode = getMode().mode;
    const candidateState = freshness(receipt);
    const currentGit = inspectGit(receipt.project_path);
    const currentManifestWarnings = manifestWarnings(receipt.candidate_files, currentGit, receipt.git?.available);
    const gateReady = currentMode === "managed"
      && receipt.review_mode === "managed"
      && candidateState.candidate_fresh
      && receipt.status === "approved"
      && receiptReady(receipt);
    return {
      ...receipt,
      ...candidateState,
      missing_lenses: missingLenses(receipt),
      failed_lenses: failedLenses(receipt),
      current_git: currentGit,
      current_manifest_warnings: currentManifestWarnings,
      manifest_complete: currentManifestWarnings.length === 0,
      current_mode: currentMode,
      gate_ready: gateReady,
      effective_status: currentMode === "disabled"
        ? "unmanaged"
        : candidateState.candidate_fresh ? receipt.status : "blocked",
    };
  }

  function assertFresh(receipt) {
    const state = freshness(receipt);
    if (!state.candidate_fresh) {
      receipt.status = "blocked";
      receipt.gate_status = "fail";
      saveReceipt(receipt);
      throw new OrganicRddError("candidate_stale", "Candidate bytes changed; start a new review.", state);
    }
  }

  function capture({ review_id, lens, status: lensStatus, summary = "", evidence, project_path, findings, reviewer_id, execution_id }) {
    const receipt = loadReceipt(review_id);
    assertReceiptProject(receipt, project_path);
    if (getMode().mode === "disabled") {
      return { ...receipt, status: "unmanaged", effective_status: "unmanaged" };
    }
    if (receipt.review_mode === "disabled") {
      return receipt;
    }
    assertFresh(receipt);
    if (!receipt.required_lenses.includes(lens)) {
      throw new OrganicRddError("lens_not_required", `Lens is not required for this receipt: ${lens}`);
    }
    if (!LENS_STATUSES.has(lensStatus)) {
      throw new OrganicRddError("lens_status_invalid", "Lens status must be pass, fail, or blocked.");
    }

    const normalizedSummary = String(summary || "").trim();
    if (normalizedSummary.length > MAX_SUMMARY_LENGTH) {
      throw new OrganicRddError("summary_limit", `summary must be at most ${MAX_SUMMARY_LENGTH} characters.`);
    }
    const normalizedEvidence = normalizeEvidence(evidence);
    if (lensStatus === "pass" && (!normalizedSummary || normalizedEvidence.length === 0)) {
      throw new OrganicRddError("evidence_required", "Passing review results require a summary and evidence.");
    }
    const normalizedFindings = normalizeFindings(findings, lens);
    const normalizedReviewerId = normalizeOptionalId(reviewer_id, "reviewer_id", MAX_REVIEWER_ID_LENGTH);
    const normalizedExecutionId = normalizeOptionalId(execution_id, "execution_id", MAX_EXECUTION_ID_LENGTH);

    const result = {
      lens,
      status: lensStatus,
      summary: normalizedSummary,
      evidence: normalizedEvidence,
      captured_at: now(),
      ...(normalizedFindings.length ? { findings: normalizedFindings } : {}),
      ...(normalizedReviewerId !== null ? { reviewer_id: normalizedReviewerId } : {}),
      ...(normalizedExecutionId !== null ? { execution_id: normalizedExecutionId } : {}),
    };
    const existing = receipt.captured_lenses.findIndex((entry) => entry.lens === lens);
    if (existing === -1) receipt.captured_lenses.push(result);
    else receipt.captured_lenses[existing] = result;

    receipt.status = failedLenses(receipt).length > 0 || openBlockerFindings(receipt).length > 0 || new Set(["fail", "blocked"]).has(receipt.verify_status)
      ? "blocked"
      : missingLenses(receipt).length === 0 ? "validating" : "reviewing";
    receipt.gate_status = "pending";
    return saveReceipt(receipt);
  }

  function verify({ review_id, status: verifyStatus, evidence, project_path }) {
    const receipt = loadReceipt(review_id);
    assertReceiptProject(receipt, project_path);
    if (getMode().mode === "disabled") {
      return { ...receipt, status: "unmanaged", effective_status: "unmanaged" };
    }
    if (receipt.review_mode === "disabled") {
      return receipt;
    }
    assertFresh(receipt);
    if (!VERIFY_STATUSES.has(verifyStatus)) {
      throw new OrganicRddError("verify_status_invalid", "Verification status must be pass, fail, or blocked.");
    }
    const normalizedEvidence = normalizeEvidence(evidence);
    if (verifyStatus === "pass" && normalizedEvidence.length === 0) {
      throw new OrganicRddError("evidence_required", "Passing verification requires evidence.");
    }
    receipt.verify_status = verifyStatus;
    receipt.verify_evidence = normalizedEvidence;
    receipt.status = verifyStatus !== "pass" || failedLenses(receipt).length > 0
      ? "blocked"
      : missingLenses(receipt).length === 0 ? "validating" : "reviewing";
    receipt.gate_status = "pending";
    return saveReceipt(receipt);
  }

  function finalize(reviewID, projectPath) {
    const receipt = loadReceipt(reviewID);
    assertReceiptProject(receipt, projectPath);
    const mode = getMode();
    if (mode.mode === "disabled") {
      return { ...receipt, status: "unmanaged", gate_status: "skipped", effective_status: "unmanaged" };
    }
    if (receipt.review_mode === "disabled") {
      receipt.status = "unmanaged";
      receipt.gate_status = "skipped";
      return saveReceipt(receipt);
    }

    const state = freshness(receipt);
    const missing = missingLenses(receipt);
    const failed = failedLenses(receipt);
    const openBlockers = openBlockerFindings(receipt);
    const verificationReady = receipt.tier === 0 ? receipt.verify_status === "skipped" : receipt.verify_status === "pass";
    if (state.candidate_fresh && receiptReady(receipt) && openBlockers.length === 0) {
      receipt.status = "approved";
      receipt.gate_status = "pending";
      delete receipt.block_reasons;
    } else {
      receipt.status = "blocked";
      receipt.gate_status = "fail";
      receipt.block_reasons = [
        ...(!state.candidate_fresh ? ["candidate_stale"] : []),
        ...(missing.length ? [`missing_lenses:${missing.join(",")}`] : []),
        ...(failed.length ? [`failed_lenses:${failed.join(",")}`] : []),
        ...(!verificationReady ? [`verification_${receipt.verify_status}`] : []),
        ...(openBlockers.length ? [`open_blocker_findings:${openBlockers.length}`] : []),
      ];
    }
    return saveReceipt(receipt);
  }

  function gate(reviewID, projectPath, options = {}) {
    const receipt = loadReceipt(reviewID);
    assertReceiptProject(receipt, projectPath);
    const mode = getMode();
    if (mode.mode === "disabled") {
      return { decision: "skipped", status: "unmanaged", review_id: reviewID, reason: "review_mode_disabled" };
    }
    if (receipt.review_mode === "disabled") {
      receipt.gate_status = "fail";
      saveReceipt(receipt);
      return {
        decision: "fail",
        status: "unmanaged",
        review_id: reviewID,
        reason: "receipt_created_unmanaged",
        next_action: "Start a new review while review mode is managed.",
      };
    }

    const state = freshness(receipt);
    const currentManifestWarnings = manifestWarnings(receipt.candidate_files, inspectGit(receipt.project_path), receipt.git?.available);
    const manifestStrictFailure = Boolean(options.strict_manifest) && currentManifestWarnings.length > 0;
    const pass = state.candidate_fresh && !manifestStrictFailure && receipt.status === "approved" && receiptReady(receipt);
    receipt.gate_status = pass ? "pass" : "fail";
    if (!state.candidate_fresh) receipt.status = "blocked";
    saveReceipt(receipt);
    return {
      decision: pass ? "pass" : "fail",
      status: receipt.status,
      review_id: reviewID,
      reason: !state.candidate_fresh
        ? "candidate_stale"
        : manifestStrictFailure ? "manifest_incomplete" : pass ? "receipt_approved" : "receipt_not_approved",
      ...(currentManifestWarnings.length ? { manifest_warnings: currentManifestWarnings } : {}),
      ...(state.candidate_fresh ? {} : { next_action: "Start a new review for the current candidate bytes." }),
    };
  }

  return {
    getMode,
    setMode,
    inspectCandidate,
    start,
    status,
    capture,
    verify,
    finalize,
    gate,
  };
}
