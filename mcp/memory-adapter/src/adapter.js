import { DatabaseSync } from "node:sqlite";
import { chmodSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(__dirname, "schema.sql");

const DEFAULT_DB_PATH = join(
  process.env.HOME || process.env.USERPROFILE || "/tmp",
  ".local/share/opencode/memory-adapter/memory.db"
);

let ollamaAvailable = null;

function checkOllama() {
  if (ollamaAvailable !== null) return ollamaAvailable;
  try {
    execFileSync("ollama", ["list"], { stdio: "pipe", timeout: 2000 });
    ollamaAvailable = true;
    return true;
  } catch {
    ollamaAvailable = false;
    return false;
  }
}

function embedQuery(query) {
  if (!checkOllama()) return null;
  try {
    const result = execFileSync("ollama", ["embed", "nomic-embed-text", query], {
      encoding: "utf-8",
      timeout: 10000,
    });
    const parsed = JSON.parse(result);
    return parsed?.embedding || parsed?.embeddings?.[0] || null;
  } catch {
    return null;
  }
}

function cosineSimilarity(left, right) {
  if (!left?.length || left.length !== right?.length) return -1;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index++) {
    dot += left[index] * right[index];
    leftNorm += left[index] ** 2;
    rightNorm += right[index] ** 2;
  }
  return leftNorm && rightNorm ? dot / Math.sqrt(leftNorm * rightNorm) : -1;
}

function rankByEmbedding(rows, queryEmbedding, limit) {
  return rows
    .map(({ embedding, ...row }) => {
      try {
        return { ...row, score: cosineSimilarity(queryEmbedding, JSON.parse(embedding)) };
      } catch {
        return { ...row, score: -1 };
      }
    })
    .filter((row) => row.score >= 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

function validateImportData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Import data must be an object");
  if (!data.project || typeof data.project.name !== "string" || !data.project.name.trim()) {
    throw new Error("Import project.name is required");
  }
  const arrays = ["decisions", "bugFixes", "architecture", "preferences", "history"];
  for (const key of arrays) {
    if (data[key] !== undefined && !Array.isArray(data[key])) throw new Error(`${key} must be an array`);
    if (data[key]?.length > 10000) throw new Error(`${key} exceeds 10000 records`);
    for (const item of data[key] || []) {
      if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error(`${key} contains an invalid record`);
    }
  }

  const requiredStrings = {
    decisions: ["title", "content"],
    bugFixes: ["title", "description", "fix"],
    architecture: ["component", "description"],
    preferences: ["key", "value"],
    history: ["action"],
  };
  for (const [collection, fields] of Object.entries(requiredStrings)) {
    for (const item of data[collection] || []) {
      for (const field of fields) {
        if (typeof item[field] !== "string" || !item[field].trim()) {
          throw new Error(`${collection}.${field} must be a non-empty string`);
        }
      }
    }
  }
}

export class MemoryAdapter {
  constructor(dbPath = DEFAULT_DB_PATH) {
    this.dbPath = dbPath;
    this.db = null;
    this.useEmbeddings = checkOllama();
  }

  init() {
    const dir = dirname(this.dbPath);
    const createdDirectory = !existsSync(dir);
    if (createdDirectory) mkdirSync(dir, { recursive: true, mode: 0o700 });
    if (createdDirectory && process.platform !== "win32") chmodSync(dir, 0o700);

    this.db = new DatabaseSync(this.dbPath);
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA foreign_keys = ON;");
    if (process.platform !== "win32") {
      for (const file of [this.dbPath, `${this.dbPath}-wal`, `${this.dbPath}-shm`]) {
        if (existsSync(file)) chmodSync(file, 0o600);
      }
    }

    const schema = readFileSync(SCHEMA_PATH, "utf-8");
    this.db.exec(schema);

    return this;
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  getOrCreateProject(name, path) {
    const normalizedPath = resolve(path || ".");
    const existing = this.db.prepare("SELECT id, path FROM projects WHERE name = ?").get(name);
    if (existing) {
      if (resolve(existing.path || ".") !== normalizedPath) throw new Error(`Project path mismatch for ${name}`);
      return existing.id;
    }

    const result = this.db.prepare("INSERT INTO projects (name, path) VALUES (?, ?)").run(name, normalizedPath);
    return result.lastInsertRowid;
  }

  findProject(name, path) {
    const existing = this.db.prepare("SELECT id, path FROM projects WHERE name = ?").get(name);
    if (!existing || resolve(existing.path || ".") !== resolve(path || ".")) return null;
    return existing.id;
  }

  saveDecision({ project, projectPath, category = "general", title, content, rationale, tags, isPrivate = false }) {
    const projectId = this.getOrCreateProject(project, projectPath);
    const result = this.db.prepare(
      `INSERT INTO decisions (project_id, category, title, content, rationale, tags, is_private)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(projectId, category, title, content, rationale || null, tags || null, isPrivate ? 1 : 0);

    if (this.useEmbeddings) {
      const embedding = embedQuery(title + " " + (rationale || ""));
      if (embedding) {
        this.db.prepare("INSERT INTO decision_embeddings (decision_id, embedding) VALUES (?, ?)")
          .run(result.lastInsertRowid, JSON.stringify(embedding));
      }
    }

    return { id: result.lastInsertRowid, saved: true };
  }

  saveBugFix({ project, projectPath, title, description, rootCause, fix, lesson, tags }) {
    const projectId = this.getOrCreateProject(project, projectPath);
    const result = this.db.prepare(
      `INSERT INTO bug_fixes (project_id, title, description, root_cause, fix, lesson, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(projectId, title, description, rootCause || null, fix, lesson || null, tags || null);

    if (this.useEmbeddings) {
      const embedding = embedQuery(title + " " + (description || "") + " " + (fix || ""));
      if (embedding) {
        this.db.prepare("INSERT INTO bug_embedding_cache (bug_id, embedding) VALUES (?, ?)")
          .run(result.lastInsertRowid, JSON.stringify(embedding));
      }
    }

    return { id: result.lastInsertRowid, saved: true };
  }

  saveArchitecture({ project, projectPath, component, description, rationale, tags }) {
    const projectId = this.getOrCreateProject(project, projectPath);
    const result = this.db.prepare(
      `INSERT INTO architecture (project_id, component, description, rationale, tags)
       VALUES (?, ?, ?, ?, ?)`
    ).run(projectId, component, description, rationale || null, tags || null);
    return { id: result.lastInsertRowid, saved: true };
  }

  savePreference({ project, projectPath, key, value }) {
    const projectId = project ? this.getOrCreateProject(project, projectPath) : null;
    this.db.prepare("DELETE FROM preferences WHERE project_id IS ? AND key = ?").run(projectId, key);
    const result = this.db.prepare("INSERT INTO preferences (project_id, key, value) VALUES (?, ?, ?)")
      .run(projectId, key, value);
    return { id: result.lastInsertRowid, saved: true };
  }

  saveSessionAction({ project, projectPath, sessionId, action, detail, result, filesTouched }) {
    const projectId = project ? this.getOrCreateProject(project, projectPath) : null;
    const res = this.db.prepare(
      `INSERT INTO session_history (project_id, session_id, action, detail, result, files_touched)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(projectId, sessionId || null, action, detail || null, result || null, filesTouched || null);
    return { id: res.lastInsertRowid, saved: true };
  }

  searchMemory({ project, projectPath, query, category, limit = 10, semantic = true }) {
    const projectId = project ? this.findProject(project, projectPath) : null;
    const results = {};
    const likeQuery = `%${query || ""}%`;

    if (!projectId) {
      if (!category || category === "decisions") results.decisions = [];
      if (!category || category === "bugs") results.bugs = [];
      if (!category || category === "architecture") results.architecture = [];
      return results;
    }

    const queryEmbedding = semantic && this.useEmbeddings && query ? embedQuery(query) : null;

    if (!category || category === "decisions") {
      if (queryEmbedding) {
        const rows = this.db.prepare(
            `SELECT d.id, d.category, d.title, d.content, d.rationale, d.tags, d.created_at,
                     de.embedding
             FROM decisions d
             JOIN decision_embeddings de ON d.id = de.decision_id
             WHERE d.project_id = ? AND d.is_private = 0`
          ).all(projectId);
        results.decisions = rankByEmbedding(rows, queryEmbedding, limit);
      } else {
        results.decisions = this.db.prepare(
          `SELECT id, category, title, content, rationale, tags, created_at
           FROM decisions WHERE project_id = ? AND is_private = 0 AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)
           ORDER BY created_at DESC LIMIT ?`
        ).all(projectId, likeQuery, likeQuery, likeQuery, limit);
      }
    }

    if (!category || category === "bugs") {
      if (queryEmbedding) {
        const rows = this.db.prepare(
            `SELECT b.id, b.title, b.description, b.root_cause, b.fix, b.lesson, b.tags, b.created_at,
                     be.embedding
             FROM bug_fixes b
             JOIN bug_embedding_cache be ON b.id = be.bug_id
             WHERE b.project_id = ?`
          ).all(projectId);
        results.bugs = rankByEmbedding(rows, queryEmbedding, limit);
      } else {
        results.bugs = this.db.prepare(
          `SELECT id, title, description, root_cause, fix, lesson, tags, created_at
           FROM bug_fixes WHERE project_id = ? AND (title LIKE ? OR description LIKE ? OR tags LIKE ?)
           ORDER BY created_at DESC LIMIT ?`
        ).all(projectId, likeQuery, likeQuery, likeQuery, limit);
      }
    }

    if (!category || category === "architecture") {
      results.architecture = this.db.prepare(
        `SELECT id, component, description, rationale, tags, created_at
         FROM architecture WHERE project_id = ? AND (component LIKE ? OR description LIKE ? OR tags LIKE ?)
         ORDER BY created_at DESC LIMIT ?`
      ).all(projectId, likeQuery, likeQuery, likeQuery, limit);
    }

    return results;
  }

  getContext({ project, projectPath, limit = 5 }) {
    const projectId = this.findProject(project, projectPath);
    const context = {};

    if (!projectId) {
      return { recentDecisions: [], recentBugs: [], architecture: [], preferences: [], ollamaAvailable: this.useEmbeddings };
    }

    context.recentDecisions = this.db.prepare(
      "SELECT id, category, title, content, created_at FROM decisions WHERE project_id = ? AND is_private = 0 ORDER BY created_at DESC LIMIT ?"
    ).all(projectId, limit);

    context.recentBugs = this.db.prepare(
      "SELECT id, title, fix, lesson, created_at FROM bug_fixes WHERE project_id = ? ORDER BY created_at DESC LIMIT ?"
    ).all(projectId, limit);

    context.architecture = this.db.prepare(
      "SELECT id, component, description, created_at FROM architecture WHERE project_id = ? ORDER BY created_at DESC LIMIT ?"
    ).all(projectId, limit);

    context.preferences = this.db.prepare(
      "SELECT key, value FROM preferences WHERE project_id = ?"
    ).all(projectId);

    context.ollamaAvailable = this.useEmbeddings;

    return context;
  }

  getHistory({ project, projectPath, limit = 20 }) {
    const projectId = this.findProject(project, projectPath);
    if (!projectId) return [];
    return this.db.prepare(
      "SELECT id, session_id, action, detail, result, files_touched, created_at FROM session_history WHERE project_id = ? ORDER BY created_at DESC LIMIT ?"
    ).all(projectId, limit);
  }

  exportProject({ project, projectPath, includePrivate = false, includeOperational = false }) {
    const projectId = this.findProject(project, projectPath);
    if (!projectId) {
      return {
        project: { name: project, path: resolve(projectPath || ".") },
        decisions: [],
        bugFixes: [],
        architecture: [],
        preferences: [],
        history: [],
        ollamaAvailable: this.useEmbeddings,
      };
    }
    return {
      project: this.db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId),
      decisions: includePrivate
        ? this.db.prepare("SELECT * FROM decisions WHERE project_id = ?").all(projectId)
        : this.db.prepare("SELECT * FROM decisions WHERE project_id = ? AND is_private = 0").all(projectId),
      bugFixes: includeOperational
        ? this.db.prepare("SELECT * FROM bug_fixes WHERE project_id = ?").all(projectId)
        : [],
      architecture: includeOperational
        ? this.db.prepare("SELECT * FROM architecture WHERE project_id = ?").all(projectId)
        : [],
      preferences: includeOperational
        ? this.db.prepare("SELECT * FROM preferences WHERE project_id = ?").all(projectId)
        : [],
      history: includeOperational
        ? this.db.prepare("SELECT * FROM session_history WHERE project_id = ?").all(projectId)
        : [],
      ollamaAvailable: this.useEmbeddings,
    };
  }

  importProject(data) {
    validateImportData(data);
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const projectId = this.getOrCreateProject(data.project.name, data.project.path || ".");
      const clearTables = [
        "DELETE FROM decisions WHERE project_id = ?",
        "DELETE FROM bug_fixes WHERE project_id = ?",
        "DELETE FROM architecture WHERE project_id = ?",
        "DELETE FROM preferences WHERE project_id = ?",
        "DELETE FROM session_history WHERE project_id = ?",
      ];
      for (const sql of clearTables) this.db.prepare(sql).run(projectId);

      if (data.decisions) {
      for (const d of data.decisions) {
        this.db.prepare(
          "INSERT INTO decisions (project_id, category, title, content, rationale, tags, is_private, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(projectId, d.category, d.title, d.content, d.rationale, d.tags, d.is_private, d.created_at);
      }
      }
      if (data.bugFixes) {
      for (const b of data.bugFixes) {
        this.db.prepare(
          "INSERT INTO bug_fixes (project_id, title, description, root_cause, fix, lesson, tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(projectId, b.title, b.description, b.root_cause, b.fix, b.lesson, b.tags, b.created_at);
      }
      }
      if (data.architecture) {
      for (const a of data.architecture) {
        this.db.prepare(
          "INSERT INTO architecture (project_id, component, description, rationale, tags, created_at) VALUES (?, ?, ?, ?, ?, ?)"
        ).run(projectId, a.component, a.description, a.rationale, a.tags, a.created_at);
      }
      }
      if (data.preferences) {
      for (const p of data.preferences) {
        this.db.prepare("INSERT INTO preferences (project_id, key, value, created_at) VALUES (?, ?, ?, ?)")
          .run(projectId, p.key, p.value, p.created_at);
      }
      }
      if (data.history) {
      for (const h of data.history) {
        this.db.prepare(
          "INSERT INTO session_history (project_id, session_id, action, detail, result, files_touched, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).run(projectId, h.session_id, h.action, h.detail, h.result, h.files_touched, h.created_at);
      }
      }

      this.db.exec("COMMIT");
      return { imported: true, projectId };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  async exportToObsidian({ project, projectPath, outputDir, includeBugs = false }) {
    const projectId = this.findProject(project, projectPath);
    if (!projectId) return { decisions: 0, bugs: 0, outputDir: outputDir || join(process.cwd(), "docs", "decisions") };
    const decisions = this.db.prepare("SELECT * FROM decisions WHERE project_id = ? AND is_private = 0").all(projectId);
    const bugs = includeBugs
      ? this.db.prepare("SELECT * FROM bug_fixes WHERE project_id = ?").all(projectId)
      : [];

    const fs = await import("node:fs");
    const nodePath = await import("node:path");

    const outDir = outputDir || nodePath.join(process.cwd(), "docs", "decisions");
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    for (const d of decisions) {
      const fileName = d.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".md";
      const content = `---
title: "${d.title}"
category: "${d.category}"
tags: [${d.tags || ""}]
created_at: "${d.created_at}"
---

# ${d.title}

${d.content}

## Rationale

${d.rationale || "N/A"}

## Related Decisions

[[Decisiones Anteriores]]
`;
      fs.writeFileSync(nodePath.join(outDir, fileName), content, { mode: 0o600 });
    }

    for (const b of bugs) {
      const fileName = "bug-" + b.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".md";
      const content = `---
title: "${b.title}"
tags: [${b.tags || ""}]
created_at: "${b.created_at}"
---

# ${b.title}

## Description

${b.description}

## Root Cause

${b.root_cause || "N/A"}

## Fix

${b.fix}

## Lesson

${b.lesson || "N/A"}
`;
      fs.writeFileSync(nodePath.join(outDir, fileName), content, { mode: 0o600 });
    }

    return { decisions: decisions.length, bugs: bugs.length, outputDir: outDir };
  }
}
