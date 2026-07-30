import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, join, dirname, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { tool } from '@opencode-ai/plugin';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const HOME = process.env.HOME || process.env.USERPROFILE || '/tmp';
const DATA_DIR = join(HOME, '.local/share/opencode/plugins-data');
const MEMORY_JSON = join(DATA_DIR, 'memory.json');
const MEMORY_DB = join(DATA_DIR, 'memory.db');
const MAX_CONTEXT = 8;
const DEDUPE_WINDOW_DAYS = 7;
const NUDGE_COOLDOWN_SECS = 900; // 15 min
const NUDGE_MIN_SESSION_SECS = 300; // 5 min

const CATEGORY_BONUS = {
  decision: 5,
  error: 4,
  learning: 4,
  config: 2,
  preference: 1,
};

const FAMILY_KEYS = {
  architecture: 'architecture',
  design: 'architecture',
  adr: 'architecture',
  bug: 'bug',
  bugfix: 'bug',
  regression: 'bug',
  panic: 'bug',
  error: 'bug',
  decision: 'decision',
  choice: 'decision',
  pattern: 'pattern',
  convention: 'pattern',
  naming: 'pattern',
  config: 'config',
  configuration: 'config',
  environment: 'config',
  setup: 'config',
  discovery: 'discovery',
  finding: 'discovery',
  learning: 'learning',
  note: 'learning',
};

const MEMORY_PROTOCOL = `
## MEMORY PROTOCOL
- Guarda solo hechos de alto valor (decisiones, errores, aprendizajes, configs, preferencias) con memory_signal; usa topic_key para actualizar temas recurrentes.
- Antes de repetir trabajo previo, busca con memory_search_v2 o memory_context.
- Cierra sesiones significativas con memory_summarize_session.
- Usa memory_current_project al iniciar para confirmar el proyecto antes de guardar.
- Si no sabes la clave, usa memory_suggest_topic_key antes de memory_signal.
- Si memory_signal devuelve candidates + judgment_required, usa memory_judge para marcar la relacion.
- Responde corto y directo, sin relleno (modo cavernicola).
`;

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function openDB() {
  ensureDataDir();
  const db = new Database(MEMORY_DB);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS engram (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      importance INTEGER NOT NULL DEFAULT 3,
      project TEXT NOT NULL DEFAULT 'global',
      content TEXT NOT NULL,
      context TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      topic_key TEXT NOT NULL DEFAULT '',
      created TEXT NOT NULL,
      accessed TEXT NOT NULL
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS engram_fts USING fts5(
      id UNINDEXED,
      category,
      project,
      content,
      context,
      tags
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      project TEXT NOT NULL DEFAULT 'global',
      summary TEXT NOT NULL DEFAULT '',
      engram_count INTEGER NOT NULL DEFAULT 0,
      started TEXT NOT NULL,
      ended TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project);
    CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started);
    CREATE INDEX IF NOT EXISTS idx_engram_project ON engram(project);
  `);
  migrateV2Schema(db);
  migrateV3Schema(db);
  migrateJsonEngrams(db);
  migrateLegacyMemory(db);
  return db;
}

function migrateV2Schema(db) {
  try {
    db.exec("ALTER TABLE engram ADD COLUMN topic_key TEXT NOT NULL DEFAULT ''");
  } catch {}
  try {
    db.exec("CREATE INDEX IF NOT EXISTS idx_engram_topic ON engram(project, topic_key)");
  } catch {}
  try {
    db.exec("CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, project TEXT NOT NULL DEFAULT 'global', summary TEXT NOT NULL DEFAULT '', engram_count INTEGER NOT NULL DEFAULT 0, started TEXT NOT NULL, ended TEXT)");
  } catch {}
  try {
    db.exec("CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project)");
  } catch {}
  try {
    db.exec("CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started)");
  } catch {}
  try {
    db.exec("CREATE INDEX IF NOT EXISTS idx_engram_project ON engram(project)");
  } catch {}
}

function migrateV3Schema(db) {
  const alters = [
    "ALTER TABLE engram ADD COLUMN scope TEXT NOT NULL DEFAULT 'project'",
    "ALTER TABLE engram ADD COLUMN deleted_at TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE engram ADD COLUMN normalized_hash TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE engram ADD COLUMN duplicate_count INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE engram ADD COLUMN last_seen_at TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE engram ADD COLUMN review_after TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE engram ADD COLUMN revision_count INTEGER NOT NULL DEFAULT 1",
  ];
  for (const a of alters) {
    try { db.exec(a); } catch {}
  }
  try {
    db.exec("CREATE INDEX IF NOT EXISTS idx_engram_scope ON engram(project, scope)");
  } catch {}
  try {
    db.exec("CREATE INDEX IF NOT EXISTS idx_engram_deleted ON engram(deleted_at)");
  } catch {}
  try {
    db.exec("CREATE INDEX IF NOT EXISTS idx_engram_hash ON engram(normalized_hash)");
  } catch {}
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS memory_relations (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      relation TEXT NOT NULL,
      reason TEXT NOT NULL DEFAULT '',
      confidence REAL NOT NULL DEFAULT 0,
      judgment_status TEXT NOT NULL DEFAULT 'judged',
      project TEXT NOT NULL DEFAULT 'global',
      created TEXT NOT NULL
    )`);
  } catch {}
  try {
    db.exec("CREATE INDEX IF NOT EXISTS idx_relations_source ON memory_relations(source_id)");
  } catch {}
  try {
    db.exec("CREATE INDEX IF NOT EXISTS idx_relations_target ON memory_relations(target_id)");
  } catch {}
  try {
    db.exec("CREATE INDEX IF NOT EXISTS idx_engram_review ON engram(review_after)");
  } catch {}
}

function migrateJsonEngrams(db) {
  try {
    db.exec('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    const migrated = db.prepare("SELECT value FROM meta WHERE key = 'json_migrated'");
    if (migrated.get()) return;
  } catch {
    return;
  }

  if (!existsSync(MEMORY_JSON)) {
    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('json_migrated', ?)").run(new Date().toISOString());
    return;
  }

  try {
    const parsed = JSON.parse(readFileSync(MEMORY_JSON, 'utf-8'));
    const engrams = Array.isArray(parsed.engram) ? parsed.engram : [];
    const insert = db.prepare(`
      INSERT OR IGNORE INTO engram (id, category, importance, project, content, context, tags, topic_key, created, accessed, scope)
      VALUES (@id, @category, @importance, @project, @content, @context, @tags, '', @created, @accessed, 'project')
    `);
    const insertFts = db.prepare(`
      INSERT OR REPLACE INTO engram_fts (id, category, project, content, context, tags)
      VALUES (@id, @category, @project, @content, @context, @tagsText)
    `);
    const tx = db.transaction((items) => {
      for (const item of items) {
        const entry = normalizeEntry({ ...item, topic_key: '' });
        insert.run(entry);
        insertFts.run({ ...entry, tagsText: tagsToText(entry.tags) });
      }
      db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('json_migrated', ?)").run(new Date().toISOString());
    });
    tx(engrams);
  } catch {
    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('json_migrated', ?)").run(new Date().toISOString());
  }
}

function migrateLegacyMemory(db) {
  db.exec('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  const migrated = db.prepare("SELECT value FROM meta WHERE key = 'legacy_memory_migrated'");
  if (migrated.get()) return;

  if (!existsSync(MEMORY_JSON)) {
    db.prepare("INSERT INTO meta (key, value) VALUES ('legacy_memory_migrated', ?)").run(new Date().toISOString());
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(MEMORY_JSON, 'utf-8'));
  } catch {
    return;
  }

  const legacyEntries = [
    ...(Array.isArray(parsed.user) ? parsed.user.map((entry) => ({ entry, target: 'user' })) : []),
    ...(Array.isArray(parsed.memory) ? parsed.memory.map((entry) => ({ entry, target: 'memory' })) : []),
  ];
  const insert = db.prepare(`
    INSERT OR IGNORE INTO engram (id, category, importance, project, content, context, tags, topic_key, created, accessed, scope)
    VALUES (@id, @category, @importance, @project, @content, @context, @tags, @topic_key, @created, @accessed, 'global')
  `);
  const insertFts = db.prepare(`
    INSERT INTO engram_fts (id, category, project, content, context, tags)
    VALUES (@id, @category, @project, @content, @context, @tagsText)
  `);
  const tx = db.transaction((items) => {
    for (const { entry: legacy, target } of items) {
      if (!legacy || !legacy.content) continue;
      const entry = normalizeEntry({
        ...legacy,
        category: target === 'user' ? 'preference' : 'config',
        importance: target === 'user' ? 4 : 3,
        project: 'global',
        context: 'Migrated from memory.js',
        tags: ['legacy-memory', target],
        topic_key: `legacy:${target}:${legacy.id || legacy.content.slice(0, 60)}`,
      });
      const result = insert.run(entry);
      if (result.changes > 0) {
        insertFts.run({ ...entry, tagsText: tagsToText(entry.tags) });
      }
    }
    db.prepare("INSERT INTO meta (key, value) VALUES ('legacy_memory_migrated', ?)").run(new Date().toISOString());
  });
  tx(legacyEntries);
}

function normalizeEntry(input) {
  const now = new Date().toISOString();
  const tags = Array.isArray(input.tags) ? input.tags : parseTags(input.tags);
  return {
    id: String(input.id || genId()),
    category: validCategory(input.category),
    importance: clampImportance(input.importance),
    project: String(input.project || 'global').slice(0, 80),
    content: String(input.content || '').slice(0, 800),
    context: String(input.context || '').slice(0, 300),
    tags: JSON.stringify(tags.map((tag) => String(tag).slice(0, 40)).slice(0, 12)),
    topic_key: String(input.topic_key || '').slice(0, 120),
    scope: validScope(input.scope),
    created: String(input.created || now),
    accessed: String(input.accessed || now),
    deleted_at: String(input.deleted_at || ''),
    normalized_hash: String(input.normalized_hash || ''),
    duplicate_count: Number(input.duplicate_count || 0),
    last_seen_at: String(input.last_seen_at || now),
    review_after: String(input.review_after || ''),
    revision_count: Number(input.revision_count || 1),
  };
}

function validCategory(category) {
  return Object.prototype.hasOwnProperty.call(CATEGORY_BONUS, category) ? category : 'learning';
}

function validScope(scope) {
  return ['project', 'personal', 'global'].includes(scope) ? scope : 'project';
}

function clampImportance(importance) {
  return Math.max(1, Math.min(5, Number(importance) || 3));
}

function parseTags(tags) {
  if (Array.isArray(tags)) return tags;
  try {
    return JSON.parse(tags || '[]');
  } catch {
    return [];
  }
}

function tagsToText(tagsJson) {
  return parseTags(tagsJson).join(' ');
}

function genId() {
  return `e${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function normalizeHash(project, scope, category, title, content) {
  const norm = String(content || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const base = `${project}|${scope}|${category}|${String(title || '').toLowerCase()}|${norm}`;
  return createHash('sha1').update(base).digest('hex');
}

function stripPrivate(str) {
  if (!str) return '';
  return str.replace(/<private>[\s\S]*?<\/private>/gi, '[REDACTED]').trim();
}

function ageBonus(created) {
  const createdMs = new Date(created).getTime();
  if (!Number.isFinite(createdMs)) return 0;
  const days = (Date.now() - createdMs) / 86400000;
  if (days <= 7) return 5;
  if (days <= 30) return 3;
  return 1;
}

function lexicalScore(entry, query, project) {
  const words = normalizeWords(query);
  const text = [entry.content, entry.context, entry.category, entry.project, tagsToText(entry.tags)].join(' ').toLowerCase();
  let score = CATEGORY_BONUS[entry.category] || 0;
  score += clampImportance(entry.importance) * 2;
  score += ageBonus(entry.created);
  for (const word of words) {
    if (text.includes(word)) score += 2;
    if (tagsToText(entry.tags).toLowerCase().split(/\s+/).includes(word)) score += 3;
  }
  if (project && String(entry.project).toLowerCase() === String(project).toLowerCase()) score += 2;
  return score;
}

function normalizeWords(text) {
  return String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9_-]+/i)
    .filter((word) => word.length > 2)
    .slice(0, 12);
}

function ftsQuery(query) {
  const words = normalizeWords(query).map((word) => word.replace(/"/g, ''));
  if (words.length === 0) return '';
  return words.map((word) => `"${word}"`).join(' OR ');
}

function rowsToEntries(rows) {
  return rows.map((row) => ({ ...row, tags: row.tags || '[]' }));
}

function formatEngram(entry, score) {
  const tags = parseTags(entry.tags);
  const suffix = tags.length ? ` tags=${tags.join(',')}` : '';
  const conflictNote = entry.conflict_note ? ` | ${entry.conflict_note}` : '';
  return `[${entry.category} i${entry.importance} score=${score}] ${entry.project || 'global'}/${entry.scope || 'project'} :: ${entry.content}${suffix}${conflictNote}`;
}

function formatEngramDetail(entry) {
  const tags = parseTags(entry.tags);
  const lines = [
    `ID: ${entry.id}`,
    `Project: ${entry.project}`,
    `Scope: ${entry.scope}`,
    `Category: ${entry.category}`,
    `Importance: ${entry.importance}`,
    `Content: ${entry.content}`,
    `Context: ${entry.context}`,
    `Tags: ${tags.join(', ') || '(none)'}`,
    `Topic key: ${entry.topic_key || '(none)'}`,
    `Revision count: ${entry.revision_count}`,
    `Duplicate count: ${entry.duplicate_count}`,
    `Review after: ${entry.review_after || '(none)'}`,
    `Created: ${entry.created}`,
    `Accessed: ${entry.accessed}`,
  ];
  return lines.join('\n');
}

function insertEngram(db, input) {
  const entry = normalizeEntry(input);
  db.prepare(`
    INSERT INTO engram (id, category, importance, project, content, context, tags, topic_key, created, accessed, scope, deleted_at, normalized_hash, duplicate_count, last_seen_at, review_after, revision_count)
    VALUES (@id, @category, @importance, @project, @content, @context, @tags, @topic_key, @created, @accessed, @scope, @deleted_at, @normalized_hash, @duplicate_count, @last_seen_at, @review_after, @revision_count)
  `).run(entry);
  db.prepare(`
    INSERT INTO engram_fts (id, category, project, content, context, tags)
    VALUES (@id, @category, @project, @content, @context, @tagsText)
  `).run({ ...entry, tagsText: tagsToText(entry.tags) });
  return entry;
}

function findDuplicate(db, hash) {
  const row = db.prepare(
    `SELECT id, revision_count, duplicate_count, last_seen_at FROM engram
     WHERE normalized_hash = ? AND deleted_at = ''`
  ).get(hash);
  return row || null;
}

function bumpDuplicate(db, id, hash) {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE engram SET duplicate_count = duplicate_count + 1, last_seen_at = ?, accessed = ? WHERE id = ?`
  ).run(now, now, id);
}

function upsertEngram(db, input) {
  const entry = normalizeEntry(input);

  if (entry.topic_key) {
    const existing = db.prepare(
      'SELECT id FROM engram WHERE project = ? AND scope = ? AND topic_key = ? AND deleted_at = \'\' LIMIT 1'
    ).get(entry.project, entry.scope, entry.topic_key);

    if (existing) {
      entry.id = existing.id;
      entry.revision_count = (db.prepare('SELECT revision_count FROM engram WHERE id = ?').get(existing.id)?.revision_count || 1) + 1;
      db.prepare(`
        UPDATE engram SET category=?, importance=?, content=?, context=?, tags=?, accessed=?, revision_count=?, review_after=?
        WHERE id = ?
      `).run(entry.category, entry.importance, entry.content, entry.context, entry.tags, entry.accessed, entry.revision_count, entry.review_after, entry.id);
      db.prepare(`
        UPDATE engram_fts SET category=?, project=?, content=?, context=?, tags=?
        WHERE id = ?
      `).run(entry.category, entry.project, entry.content, entry.context, tagsToText(entry.tags), entry.id);
      return { ...entry, updated: true };
    }
  }

  if (entry.normalized_hash) {
    const dup = findDuplicate(db, entry.normalized_hash);
    if (dup) {
      bumpDuplicate(db, dup.id, entry.normalized_hash);
      return { ...entry, id: dup.id, updated: true, deduplicated: true };
    }
  }

  return { ...insertEngram(db, entry), updated: false };
}

function updateAccessed(db, ids) {
  if (ids.length === 0) return;
  const stmt = db.prepare('UPDATE engram SET accessed = ? WHERE id = ?');
  const now = new Date().toISOString();
  const tx = db.transaction((items) => {
    for (const id of items) stmt.run(now, id);
  });
  tx(ids);
}

function findConflictCandidates(db, project, title, content, excludeId) {
  const words = normalizeWords(`${title} ${content}`).filter((w) => w.length > 3).slice(0, 6);
  if (words.length === 0) return [];
  const match = words.map((w) => `"${w}"`).join(' OR ');
  const rows = db.prepare(`
    SELECT e.id, e.content
    FROM engram_fts f
    JOIN engram e ON e.id = f.id
    WHERE engram_fts MATCH ? AND e.project = ? AND e.deleted_at = ''
    LIMIT 20
  `).all(match, project);
  const seen = new Set([excludeId]);
  const out = [];
  for (const r of rowsToEntries(rows)) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push({ id: r.id, title: (r.content || '').slice(0, 80) });
    if (out.length >= 3) break;
  }
  return out;
}

function relationAnnotations(db, id) {
  const rows = db.prepare(
    `SELECT relation, target_id FROM memory_relations WHERE source_id = ? AND judgment_status = 'judged'`
  ).all(id);
  const parts = [];
  for (const r of rows) {
    if (r.relation === 'conflicts_with' || r.relation === 'supersedes') {
      const t = db.prepare('SELECT content FROM engram WHERE id = ?').get(r.target_id);
      parts.push(`${r.relation}: #${r.target_id} (${(t?.content || '').slice(0, 50)})`);
    }
  }
  return parts.join(' | ');
}

function ensureSession(db, project) {
  const open = db.prepare(
    "SELECT id FROM sessions WHERE project = ? AND ended IS NULL LIMIT 1"
  ).get(project);
  if (open) {
    const count = db.prepare(
      'SELECT COUNT(*) as c FROM engram WHERE project = ? AND created >= (SELECT started FROM sessions WHERE id = ?)'
    ).get(project, open.id);
    if (count) {
      db.prepare('UPDATE sessions SET engram_count = ? WHERE id = ?').run(count.c, open.id);
    }
    return open.id;
  }

  const id = `s${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO sessions (id, project, engram_count, started) VALUES (?, ?, 0, ?)'
  ).run(id, project, now);
  return id;
}

function closeSession(db, project, summary) {
  const now = new Date().toISOString();
  const count = db.prepare(
    'SELECT COUNT(*) as c FROM engram WHERE project = ?'
  ).get(project);
  const result = db.prepare(
    "UPDATE sessions SET ended = ?, summary = ?, engram_count = ? WHERE project = ? AND ended IS NULL ORDER BY started DESC LIMIT 1"
  ).run(now, summary.slice(0, 2000), count ? count.c : 0, project);
  return result.changes > 0;
}

function getLastSessionSummary(db, project) {
  const row = db.prepare(
    "SELECT summary, engram_count FROM sessions WHERE project = ? AND ended IS NOT NULL AND summary != '' ORDER BY ended DESC LIMIT 1"
  ).get(project);
  return row || null;
}

// ─── Project detection (M1) ──────────────────────────────────────────────────

function detectProject(directory) {
  if (!directory || directory === HOME) {
    return { project: 'global', source: 'home', availableProjects: null };
  }

  // Case 0: nearest .engram/config.json
  const cfg = readEngramConfig(directory);
  if (cfg) return { project: cfg, source: 'config', availableProjects: null };

  // Case 1: git remote origin
  try {
    const url = execSync('git -C ' + shellEscape(directory) + ' remote get-url origin', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    if (url) {
      const name = url.replace(/\.git$/, '').split(/[/:]/).pop();
      if (name) {
        const root = gitRoot(directory);
        return { project: name, source: 'git_remote', availableProjects: null, path: root };
      }
    }
  } catch {}

  // Case 2: inside a git repo
  const root = gitRoot(directory);
  if (root) return { project: basename(root), source: 'git_root', availableProjects: null, path: root };

  // Cases 3 & 4: child repos
  const children = scanChildRepos(directory);
  if (children.length === 1) {
    return { project: basename(children[0]), source: 'git_child', availableProjects: null, path: children[0] };
  }
  if (children.length > 1) {
    return { project: '', source: 'ambiguous', availableProjects: children.map((c) => basename(c)), path: directory };
  }

  // Case 5: fallback
  return { project: basename(directory), source: 'dir_basename', availableProjects: null };
}

function shellEscape(p) {
  return p.includes(' ') ? `"${p}"` : p;
}

function gitRoot(directory) {
  try {
    return execSync('git -C ' + shellEscape(directory) + ' rev-parse --show-toplevel', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || null;
  } catch {
    return null;
  }
}

function readEngramConfig(directory) {
  let dir = directory;
  const seen = new Set();
  while (dir && !seen.has(dir)) {
    seen.add(dir);
    const candidate = join(dir, '.engram', 'config.json');
    if (existsSync(candidate)) {
      try {
        const parsed = JSON.parse(readFileSync(candidate, 'utf-8'));
        if (parsed && typeof parsed.project_name === 'string' && parsed.project_name.trim()) {
          return parsed.project_name.trim();
        }
      } catch {}
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

const NOISE_DIRS = new Set(['node_modules', 'vendor', '.venv', '__pycache__', 'target', 'dist', 'build', '.idea', '.vscode']);

function scanChildRepos(directory) {
  let entries;
  try {
    entries = require('node:fs').readdirSync(directory, { withFileTypes: true });
  } catch {
    return [];
  }
  const repos = [];
  for (const e of entries) {
    if (!e.isDirectory() || e.name.startsWith('.') || NOISE_DIRS.has(e.name)) continue;
    const full = join(directory, e.name);
    if (existsSync(join(full, '.git'))) repos.push(full);
    if (repos.length > 1) break;
  }
  return repos;
}

// ─── Topic key suggestion (M6) ───────────────────────────────────────────────

function suggestTopicKey(type, title) {
  const t = String(type || '').toLowerCase();
  const family = FAMILY_KEYS[t] || 'learning';
  const words = String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !['the', 'and', 'for', 'with', 'from', 'into', 'fixed', 'added', 'use', 'used', 'implement', 'implementation'].includes(w))
    .slice(0, 3);
  const desc = words.join('-') || 'item';
  return `${family}/${desc}`.slice(0, 120);
}

// ─── Nudge tracking (M4) ─────────────────────────────────────────────────────

const lastNudgeTime = new Map();

function shouldNudge(db, project, sessionID) {
  if (!sessionID) return false;
  if (lastNudgeTime.has(sessionID)) {
    const last = lastNudgeTime.get(sessionID);
    if (Date.now() / 1000 - last < NUDGE_COOLDOWN_SECS) return false;
  }
  const sessionRow = db.prepare('SELECT started FROM sessions WHERE id = ?').get(sessionID);
  if (sessionRow && sessionRow.started) {
    const start = new Date(sessionRow.started).getTime();
    if (Number.isFinite(start) && (Date.now() - start) / 1000 < NUDGE_MIN_SESSION_SECS) return false;
  }
  const lastObs = db.prepare(
    `SELECT created FROM engram WHERE project = ? AND deleted_at = '' ORDER BY created DESC LIMIT 1`
  ).get(project);
  if (!lastObs || !lastObs.created) return false;
  const lastSecs = new Date(lastObs.created).getTime() / 1000;
  if (!Number.isFinite(lastSecs)) return false;
  if (Date.now() / 1000 - lastSecs < NUDGE_COOLDOWN_SECS) return false;
  return true;
}

function markNudged(sessionID) {
  if (sessionID) lastNudgeTime.set(sessionID, Math.floor(Date.now() / 1000));
}

// ─── Plugin export ───────────────────────────────────────────────────────────

export const memoryV2Plugin = async ({ directory = HOME, worktree = directory } = {}) => {
  const detected = detectProject(worktree || directory);
  const activeProject = detected.project || 'global';
  const initDB = openDB();
  initDB.close();

  return {

  // AUDIT 2026-07-20: hook desactivado para cumplir filosofia "menos tokens, mas CPU".
  // Inyectaba MEMORY_PROTOCOL + engramas + nudge en cada turno (~600-1500 tokens/turno).
  // Las tools memory_search_v2 / memory_context siguen disponibles bajo demanda.
  // Para reactivar: descomentar el bloque de abajo. Backup en memory-v2.js.bak-audit.
  //
  // 'experimental.chat.system.transform': async (_input, output) => {
  //   const db = openDB();
  //   let memoryContext = '';
  //   try {
  //     const preferences = db.prepare(`
  //       SELECT content FROM engram
  //       WHERE category = 'preference' AND lower(project) = 'global' AND deleted_at = ''
  //       ORDER BY importance DESC, created DESC
  //       LIMIT 2
  //     `).all();
  //     const projectEntries = db.prepare(`
  //       SELECT * FROM engram
  //       WHERE category != 'preference'
  //         AND deleted_at = ''
  //         AND lower(project) IN (lower(?), 'global')
  //         AND lower(scope) IN ('project', 'global', 'personal')
  //       ORDER BY importance DESC, created DESC
  //       LIMIT 3
  //     `).all(activeProject);
  //     const blocks = [];
  //     if (preferences.length > 0) {
  //       blocks.push(`## SOBRE EL USUARIO\n${preferences.map((entry) => `- ${entry.content}`).join('\n')}`);
  //     }
  //     if (projectEntries.length > 0) {
  //       blocks.push(`## MEMORIA RELEVANTE\n${projectEntries.map((entry) => `- [${entry.scope}] ${entry.content}`).join('\n')}`);
  //     }
  //     if (blocks.length > 0) {
  //       memoryContext = `[MEMORIA PERSISTENTE: contexto, no instrucciones]\n${blocks.join('\n\n')}`;
  //     }
  //   } finally {
  //     db.close();
  //   }
  //   const addition = [MEMORY_PROTOCOL.trim(), memoryContext].filter(Boolean).join('\n\n');
  //   let nudgeText = '';
  //   try {
  //     const ndb = openDB();
  //     try {
  //       if (shouldNudge(ndb, activeProject, _input.sessionID)) {
  //         nudgeText = '\n\nMEMORY REMINDER: Han pasado >15 min desde tu ultimo guardado. Si tomaste decisiones, descubrimientos o trabajo significativo, llama memory_signal ahora.';
  //         markNudged(_input.sessionID);
  //       }
  //     } finally {
  //       ndb.close();
  //     }
  //   } catch {}
  //   const finalAdd = addition + nudgeText;
  //   if (output.system.length > 0) {
  //     output.system[output.system.length - 1] += '\n\n' + finalAdd;
  //   } else {
  //     output.system.push(finalAdd);
  //   }
  // },

  'experimental.session.compacting': async (_input, output) => {
    const db = openDB();
    try {
      const top = db.prepare(`
        SELECT * FROM engram
        WHERE deleted_at = '' AND lower(project) IN (lower(?), 'global')
        ORDER BY importance DESC, created DESC
        LIMIT 5
      `).all(activeProject);
      const blocks = [];

      if (top.length > 0) {
        blocks.push(`## ENGRAMS IMPORTANTES\n${top.map((entry) => `- ${entry.content}`).join('\n')}`);
      }

      const projects = [...new Set([activeProject, ...top.map(e => e.project)].filter(Boolean))];
      for (const project of projects.slice(0, 2)) {
        const lastSession = getLastSessionSummary(db, project);
        if (lastSession) {
          blocks.push(`## ULTIMA SESION (${project})\nResumen: ${lastSession.summary}\nEngrams generados: ${lastSession.engram_count}`);
        }
      }

      if (blocks.length > 0) {
        output.context.push(blocks.join('\n\n'));
      }
    } finally {
      db.close();
    }
  },

  tool: {
    memory_current_project: tool({
      description: 'Detectar el proyecto actual y su fuente de deteccion (git, .engram/config.json, etc.). Llamar al iniciar.',
      args: {},
      async execute() {
        return JSON.stringify({
          project: detected.project || 'global',
          source: detected.source,
          availableProjects: detected.availableProjects || null,
          path: detected.path || (worktree || directory),
        });
      },
    }),

    memory_signal: tool({
      description: 'Guardar una senal de alto valor: decision, error, learning, config o preference. Dedupe + upsert por topic_key.',
      args: {
        category: tool.schema.enum(['decision', 'error', 'learning', 'config', 'preference']).describe('Tipo.'),
        importance: tool.schema.number().optional().default(3).describe('1-5.'),
        project: tool.schema.string().optional().default('').describe('Proyecto; vacio usa el detectado.'),
        scope: tool.schema.enum(['project', 'personal', 'global']).optional().default('project').describe('Alcance.'),
        content: tool.schema.string().describe('Hecho concreto, max 800 chars.'),
        context: tool.schema.string().optional().default('').describe('Fuente/archivo.'),
        tags: tool.schema.array(tool.schema.string()).optional().default([]).describe('Tags.'),
        topic_key: tool.schema.string().optional().default('').describe('Clave family/desc para upsert.'),
        review_cycle_days: tool.schema.number().optional().describe('Dias hasta revision (review_after).'),
      },
      async execute(args, ctx) {
        const db = openDB();
        try {
          const project = (args.project || '').trim() || activeProject;
          if (detected.source === 'ambiguous' && !args.project) {
            return JSON.stringify({ error: 'ambiguous_project', availableProjects: detected.availableProjects, message: 'Proyecto ambiguo; pasa project explicito.' });
          }
          ensureSession(db, project);
          const cleanContent = stripPrivate(args.content);
          const cleanContext = stripPrivate(args.context || '');
          const hash = normalizeHash(project, validScope(args.scope), args.category, cleanContent, cleanContent);
          let reviewAfter = '';
          if (args.review_cycle_days && Number(args.review_cycle_days) > 0) {
            reviewAfter = new Date(Date.now() + Number(args.review_cycle_days) * 86400000).toISOString();
          }
          const result = upsertEngram(db, {
            category: args.category,
            importance: args.importance,
            project,
            scope: args.scope,
            content: cleanContent,
            context: cleanContext,
            tags: args.tags,
            topic_key: args.topic_key,
            normalized_hash: hash,
            review_after: reviewAfter,
          });
          const verb = result.deduplicated ? 'Duplicado' : (result.updated ? 'Actualizado' : 'Guardado');
          let candidates = [];
          if (!result.deduplicated) {
            candidates = findConflictCandidates(db, project, cleanContent, cleanContent, result.id);
          }
          const judgmentRequired = candidates.length > 0;
          ctx.metadata({ title: `engram ${result.deduplicated ? '=':(result.updated ? '~' : '+')}1 ${result.category}` });
          return JSON.stringify({
            status: verb,
            id: result.id,
            project,
            scope: result.scope,
            revision_count: result.revision_count,
            duplicate_count: result.duplicate_count,
            candidates,
            judgment_required: judgmentRequired,
          });
        } finally {
          db.close();
        }
      },
    }),

    memory_search_v2: tool({
      description: 'Buscar engramas con SQLite FTS5, scoring, proyecto y tags.',
      args: {
        q: tool.schema.string().describe('Consulta.'),
        project: tool.schema.string().optional().default('').describe('Proyecto preferido.'),
        limit: tool.schema.number().optional().default(10).describe('Max.'),
      },
      async execute(args) {
        const db = openDB();
        try {
          const limit = Math.max(1, Math.min(20, Number(args.limit) || 10));
          const match = ftsQuery(args.q);
          let rows;
          if (match) {
            rows = db.prepare(`
              SELECT e.* FROM engram_fts f
              JOIN engram e ON e.id = f.id
              WHERE engram_fts MATCH ? AND e.deleted_at = ''
              LIMIT 80
            `).all(match);
          } else {
            rows = db.prepare("SELECT * FROM engram WHERE deleted_at = '' ORDER BY importance DESC, created DESC LIMIT 80").all();
          }
          const results = rowsToEntries(rows)
            .map((entry) => {
              const annotations = relationAnnotations(db, entry.id);
              return { entry: { ...entry, conflict_note: annotations }, score: lexicalScore(entry, args.q, args.project) };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
          updateAccessed(db, results.map((item) => item.entry.id));
          if (results.length === 0) return 'No se encontraron engramas relevantes.';
          return results.map((item) => formatEngram(item.entry, item.score)).join('\n\n');
        } finally {
          db.close();
        }
      },
    }),

    memory_context: tool({
      description: 'Obtener las senales mas importantes para un proyecto antes de trabajar.',
      args: {
        project: tool.schema.string().describe('Proyecto.'),
        limit: tool.schema.number().optional().default(MAX_CONTEXT).describe('Max.'),
      },
      async execute(args) {
        const db = openDB();
        try {
          ensureSession(db, args.project);
          const limit = Math.max(1, Math.min(20, Number(args.limit) || MAX_CONTEXT));
          const rows = db.prepare("SELECT * FROM engram WHERE lower(project) = lower(?) AND deleted_at = '' ORDER BY importance DESC, created DESC LIMIT ?").all(args.project, limit);
          const results = rowsToEntries(rows).map((entry) => ({ entry, score: lexicalScore(entry, args.project, args.project) }));
          updateAccessed(db, results.map((item) => item.entry.id));

          const lastSession = getLastSessionSummary(db, args.project);
          const parts = [];
          if (results.length > 0) {
            parts.push(results.map((item) => formatEngram(item.entry, item.score)).join('\n\n'));
          }
          if (lastSession) {
            parts.push(`\n## ULTIMA SESION\nResumen: ${lastSession.summary}\nEngrams: ${lastSession.engram_count}`);
          }
          if (parts.length === 0) return `No hay engramas para ${args.project}.`;
          return parts.join('\n\n');
        } finally {
          db.close();
        }
      },
    }),

    memory_timeline: tool({
      description: 'Ver historial de engramas por proyecto, opcionalmente filtrado por fecha.',
      args: {
        project: tool.schema.string().describe('Proyecto.'),
        date_from: tool.schema.string().optional().default('').describe('ISO inicio.'),
        date_to: tool.schema.string().optional().default('').describe('ISO fin.'),
        limit: tool.schema.number().optional().default(20).describe('Max.'),
      },
      async execute(args) {
        const db = openDB();
        try {
          const project = args.project;
          const limit = Math.max(1, Math.min(100, Number(args.limit) || 20));
          let sql = "SELECT * FROM engram WHERE lower(project) = lower(?) AND deleted_at = ''";
          const params = [project.toLowerCase()];

          if (args.date_from) {
            sql += ' AND created >= ?';
            params.push(args.date_from);
          }
          if (args.date_to) {
            sql += ' AND created <= ?';
            params.push(args.date_to);
          }

          sql += ' ORDER BY created DESC LIMIT ?';
          params.push(limit);

          const rows = db.prepare(sql).all(...params);
          const entries = rowsToEntries(rows);
          if (entries.length === 0) return `No hay engramas para ${project}${args.date_from || args.date_to ? ' en el rango indicado' : ''}.`;
          return entries.map((entry) => {
            const tags = parseTags(entry.tags);
            return `${entry.created.slice(0, 10)} [${entry.category} i${entry.importance}] ${entry.content}${tags.length ? ` (${tags.join(',')})` : ''}`;
          }).join('\n');
        } finally {
          db.close();
        }
      },
    }),

    memory_get: tool({
      description: 'Ver detalle completo de un engrama por ID.',
      args: {
        id: tool.schema.string().describe('ID del engrama.'),
      },
      async execute(args) {
        const db = openDB();
        try {
          const row = db.prepare("SELECT * FROM engram WHERE id = ? AND deleted_at = ''").get(args.id);
          if (!row) return `No se encontro engrama con id: ${args.id}`;
          updateAccessed(db, [args.id]);
          return formatEngramDetail(rowsToEntries([row])[0]);
        } finally {
          db.close();
        }
      },
    }),

    memory_update: tool({
      description: 'Actualizar un engrama existente por ID.',
      args: {
        id: tool.schema.string().describe('ID a actualizar.'),
        content: tool.schema.string().optional().describe('Nuevo contenido.'),
        importance: tool.schema.number().optional().describe('1-5.'),
        category: tool.schema.enum(['decision', 'error', 'learning', 'config', 'preference']).optional().describe('Nueva categoria.'),
        tags: tool.schema.array(tool.schema.string()).optional().describe('Nuevos tags.'),
        context: tool.schema.string().optional().describe('Nuevo contexto.'),
        scope: tool.schema.enum(['project', 'personal', 'global']).optional().describe('Nuevo scope.'),
        review_cycle_days: tool.schema.number().optional().describe('Nuevos dias de revision.'),
      },
      async execute(args) {
        const db = openDB();
        try {
          const existing = db.prepare('SELECT * FROM engram WHERE id = ? AND deleted_at = \'\'').get(args.id);
          if (!existing) return `No se encontro engrama con id: ${args.id}`;

          const updates = [];
          const ftsUpdates = [];
          const params = [];
          const ftsParams = [];

          if (args.content !== undefined) {
            const val = stripPrivate(String(args.content)).slice(0, 800);
            updates.push('content = ?');
            ftsUpdates.push('content = ?');
            params.push(val);
            ftsParams.push(val);
          }
          if (args.importance !== undefined) {
            const val = clampImportance(args.importance);
            updates.push('importance = ?');
            params.push(val);
          }
          if (args.category !== undefined) {
            const val = validCategory(args.category);
            updates.push('category = ?');
            ftsUpdates.push('category = ?');
            params.push(val);
            ftsParams.push(val);
          }
          if (args.tags !== undefined) {
            const val = JSON.stringify(args.tags.map(t => String(t).slice(0, 40)).slice(0, 12));
            updates.push('tags = ?');
            params.push(val);
            ftsUpdates.push('tags = ?');
            ftsParams.push(tagsToText(val));
          }
          if (args.context !== undefined) {
            const val = stripPrivate(String(args.context)).slice(0, 300);
            updates.push('context = ?');
            ftsUpdates.push('context = ?');
            params.push(val);
            ftsParams.push(val);
          }
          if (args.scope !== undefined) {
            const val = validScope(args.scope);
            updates.push('scope = ?');
            params.push(val);
          }
          if (args.review_cycle_days !== undefined) {
            const val = Number(args.review_cycle_days) > 0
              ? new Date(Date.now() + Number(args.review_cycle_days) * 86400000).toISOString()
              : '';
            updates.push('review_after = ?');
            params.push(val);
          }

          if (updates.length === 0) return 'No se proporcionaron campos para actualizar.';

          const now = new Date().toISOString();
          updates.push('accessed = ?');
          params.push(now);

          params.push(args.id);
          db.prepare(`UPDATE engram SET ${updates.join(', ')} WHERE id = ?`).run(...params);

          if (ftsUpdates.length > 0) {
            ftsParams.push(args.id);
            try {
              db.prepare(`UPDATE engram_fts SET ${ftsUpdates.join(', ')} WHERE id = ?`).run(...ftsParams);
            } catch {}
          }

          return `Actualizado engrama ${args.id}.`;
        } finally {
          db.close();
        }
      },
    }),

    memory_delete: tool({
      description: 'Eliminar un engrama. Soft-delete por defecto; hard borra la fila.',
      args: {
        id: tool.schema.string().describe('ID a eliminar.'),
        hard: tool.schema.boolean().optional().default(false).describe('Borrado permanente.'),
      },
      async execute(args) {
        const db = openDB();
        try {
          const existing = db.prepare('SELECT id FROM engram WHERE id = ?').get(args.id);
          if (!existing) return `No se encontro engrama con id: ${args.id}`;
          if (args.hard) {
            db.prepare('DELETE FROM engram_fts WHERE id = ?').run(args.id);
            db.prepare('DELETE FROM engram WHERE id = ?').run(args.id);
            db.prepare("DELETE FROM memory_relations WHERE source_id = ? OR target_id = ?").run(args.id, args.id);
            return `Borrado permanente: ${args.id}.`;
          }
          const now = new Date().toISOString();
          db.prepare("UPDATE engram SET deleted_at = ? WHERE id = ?").run(now, args.id);
          return `Soft-delete: ${args.id} (ignorado en busquedas).`;
        } finally {
          db.close();
        }
      },
    }),

    memory_review: tool({
      description: 'Listar engramas cuya revision venció (review_after) o marcar revisado.',
      args: {
        action: tool.schema.enum(['list', 'mark_reviewed']).describe('Accion.'),
        project: tool.schema.string().optional().default('').describe('Proyecto.'),
        observation_id: tool.schema.string().optional().default('').describe('ID para mark_reviewed.'),
        limit: tool.schema.number().optional().default(10).describe('Max.'),
      },
      async execute(args) {
        const db = openDB();
        try {
          if (args.action === 'mark_reviewed') {
            if (!args.observation_id) return 'observation_id requerido para mark_reviewed.';
            db.prepare("UPDATE engram SET review_after = '' WHERE id = ?").run(args.observation_id);
            return `Marcado revisado: ${args.observation_id}.`;
          }
          const project = (args.project || '').trim() || activeProject;
          const now = new Date().toISOString();
          const limit = Math.max(1, Math.min(50, Number(args.limit) || 10));
          const rows = db.prepare(
            "SELECT * FROM engram WHERE deleted_at = '' AND review_after != '' AND review_after <= ? AND lower(project) = lower(?) ORDER BY review_after ASC LIMIT ?"
          ).all(now, project, limit);
          const entries = rowsToEntries(rows);
          if (entries.length === 0) return `No hay engramas pendientes de revision en ${project}.`;
          return entries.map((e) => `${e.review_after.slice(0, 10)} [${e.category}] ${e.content}`).join('\n');
        } finally {
          db.close();
        }
      },
    }),

    memory_judge: tool({
      description: 'Registrar veredicto de relacion entre dos engramas (conflicto/supersede/etc).',
      args: {
        source_id: tool.schema.string().describe('Engrama origen.'),
        target_id: tool.schema.string().describe('Engrama destino.'),
        relation: tool.schema.enum(['related', 'compatible', 'scoped', 'conflicts_with', 'supersedes', 'not_conflict']).describe('Relacion.'),
        reason: tool.schema.string().optional().default('').describe('Razon.'),
        confidence: tool.schema.number().optional().default(0.8).describe('0-1.'),
      },
      async execute(args) {
        const db = openDB();
        try {
          if (args.relation === 'not_conflict') {
            return 'Veredicto not_conflict: no-op, no persistido.';
          }
          const id = `r${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
          db.prepare(`
            INSERT INTO memory_relations (id, source_id, target_id, relation, reason, confidence, judgment_status, project, created)
            VALUES (?, ?, ?, ?, ?, ?, 'judged', ?, ?)
          `).run(id, args.source_id, args.target_id, args.relation, (args.reason || '').slice(0, 300), clampConfidence(args.confidence), activeProject, new Date().toISOString());
          return `Relacion registrada: ${args.relation} (${args.source_id} -> ${args.target_id}).`;
        } finally {
          db.close();
        }
      },
    }),

    memory_suggest_topic_key: tool({
      description: 'Sugerir clave kebab-case de 2 niveles (family/desc) antes de memory_signal.',
      args: {
        type: tool.schema.string().describe('Categoria/tipo.'),
        title: tool.schema.string().describe('Titulo o descripcion corta.'),
      },
      async execute(args) {
        return suggestTopicKey(args.type, args.title);
      },
    }),

    memory_summarize_session: tool({
      description: 'Cerrar la sesion actual con un resumen de lo trabajado.',
      args: {
        project: tool.schema.string().describe('Proyecto de la sesion.'),
        summary: tool.schema.string().describe('Resumen conciso.'),
      },
      async execute(args) {
        const db = openDB();
        try {
          const closed = closeSession(db, args.project, args.summary);
          if (closed) {
            return `Sesion cerrada para ${args.project}. Resumen guardado.`;
          }
          return `No habia sesion abierta para ${args.project}. Se ha creado una nueva sesion con el resumen.`;
        } finally {
          db.close();
        }
      },
    }),
  },
  };
};

function clampConfidence(c) {
  const n = Number(c);
  if (!Number.isFinite(n)) return 0.8;
  return Math.max(0, Math.min(1, n));
}

export default memoryV2Plugin;
