import { describe, it, beforeEach, afterEach } from "node:test";
import { strict as assert } from "node:assert";
import { MemoryAdapter } from "../src/adapter.js";
import { chmodSync, existsSync, rmSync, mkdirSync, statSync } from "node:fs";
import { dirname } from "node:path";

const TEST_DB = "/tmp/test-memory-adapter/memory.db";

describe("MemoryAdapter", () => {
  let adapter;

  beforeEach(() => {
    const dir = dirname(TEST_DB);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    adapter = new MemoryAdapter(TEST_DB);
    adapter.init();
  });

  afterEach(() => {
    adapter.close();
    if (existsSync(dirname(TEST_DB))) {
      rmSync(dirname(TEST_DB), { recursive: true, force: true });
    }
  });

  describe("saveDecision", () => {
    it("should create the database with user-only permissions", () => {
      if (process.platform === "win32") return;
      assert.strictEqual(statSync(TEST_DB).mode & 0o777, 0o600);
    });

    it("should not change permissions of a caller-provided directory", () => {
      if (process.platform === "win32") return;
      const customDir = "/tmp/test-memory-custom-dir";
      rmSync(customDir, { recursive: true, force: true });
      mkdirSync(customDir, { mode: 0o770 });
      chmodSync(customDir, 0o770);
      const customAdapter = new MemoryAdapter(`${customDir}/memory.db`).init();
      customAdapter.close();

      assert.strictEqual(statSync(customDir).mode & 0o777, 0o770);
      rmSync(customDir, { recursive: true, force: true });
    });

    it("should save a decision and return an id", () => {
      const result = adapter.saveDecision({
        project: "test-project",
        projectPath: "/tmp/test",
        category: "architecture",
        title: "Use SQLite for memory",
        content: "We chose SQLite because it's embedded and fast.",
        rationale: "No external server needed",
        tags: "db,sqlite,memory",
      });
      assert.ok(result.id);
      assert.strictEqual(result.saved, true);
    });

    it("should retrieve saved decisions via search", () => {
      adapter.saveDecision({
        project: "test-project",
        projectPath: "/tmp/test",
        title: "Use Redis for cache",
        content: "Redis is fast for caching",
        tags: "cache,redis",
      });

      const results = adapter.searchMemory({
        project: "test-project",
        projectPath: "/tmp/test",
        query: "redis",
      });

      assert.ok(results.decisions.length > 0);
      assert.strictEqual(results.decisions[0].title, "Use Redis for cache");
    });

    it("should reject the same project name with a different path", () => {
      adapter.saveDecision({
        project: "isolated-project",
        projectPath: "/tmp/project-a",
        title: "Path A",
        content: "Bound to project A",
      });

      assert.throws(() => adapter.saveDecision({
        project: "isolated-project",
        projectPath: "/tmp/project-b",
        title: "Path B",
        content: "Must not cross projects",
      }), /path mismatch/);
    });
  });

  describe("saveBugFix", () => {
    it("should save a bug fix with lesson learned", () => {
      const result = adapter.saveBugFix({
        project: "test-project",
        projectPath: "/tmp/test",
        title: "Memory leak in event listener",
        description: "Event listeners were not being cleaned up",
        rootCause: "Missing cleanup in useEffect return",
        fix: "Added cleanup function in useEffect",
        lesson: "Always return cleanup from useEffect",
        tags: "react,hooks,memory-leak",
      });
      assert.ok(result.id);
    });

    it("should find bug fixes via search", () => {
      adapter.saveBugFix({
        project: "test-project",
        projectPath: "/tmp/test",
        title: "Off by one in loop",
        description: "Loop started at 1 instead of 0",
        fix: "Changed i=1 to i=0",
        tags: "loop,bug",
      });

      const results = adapter.searchMemory({
        project: "test-project",
        projectPath: "/tmp/test",
        query: "loop",
        category: "bugs",
      });

      assert.ok(results.bugs.length > 0);
      assert.strictEqual(results.bugs[0].title, "Off by one in loop");
    });
  });

  describe("saveArchitecture", () => {
    it("should save architectural component info", () => {
      const result = adapter.saveArchitecture({
        project: "test-project",
        projectPath: "/tmp/test",
        component: "MemoryAdapter",
        description: "SQLite-based adapter for persistent memory across sessions",
        rationale: "Local-first, no external dependencies",
        tags: "core,memory",
      });
      assert.ok(result.id);
    });
  });

  describe("savePreference", () => {
    it("should save and update a preference", () => {
      adapter.savePreference({
        project: "test-project",
        projectPath: "/tmp/test",
        key: "linting",
        value: "eslint",
      });

      adapter.savePreference({
        project: "test-project",
        projectPath: "/tmp/test",
        key: "linting",
        value: "biome",
      });

      const context = adapter.getContext({
        project: "test-project",
        projectPath: "/tmp/test",
      });

      const pref = context.preferences.find((p) => p.key === "linting");
      assert.ok(pref);
      assert.strictEqual(pref.value, "biome");
    });
  });

  describe("saveSessionAction", () => {
    it("should log a session action", () => {
      const result = adapter.saveSessionAction({
        project: "test-project",
        projectPath: "/tmp/test",
        sessionId: "abc-123",
        action: "created_file",
        detail: "Created src/index.js",
        result: "success",
        filesTouched: "src/index.js",
      });
      assert.ok(result.id);
    });
  });

  describe("getContext", () => {
    it("should return recent decisions, bugs, architecture, and preferences", () => {
      adapter.saveDecision({
        project: "test-project",
        projectPath: "/tmp/test",
        title: "Decision 1",
        content: "First decision",
      });

      adapter.saveBugFix({
        project: "test-project",
        projectPath: "/tmp/test",
        title: "Bug 1",
        description: "A bug",
        fix: "Fixed it",
      });

      const context = adapter.getContext({
        project: "test-project",
        projectPath: "/tmp/test",
      });

      assert.ok(context.recentDecisions.length > 0);
      assert.ok(context.recentBugs.length > 0);
    });
  });

  describe("getHistory", () => {
    it("should return session history ordered by date", () => {
      adapter.saveSessionAction({
        project: "test-project",
        projectPath: "/tmp/test",
        action: "task_start",
        detail: "Started implementing feature X",
      });

      const history = adapter.getHistory({
        project: "test-project",
        projectPath: "/tmp/test",
      });

      assert.ok(history.length > 0);
      assert.strictEqual(history[0].action, "task_start");
    });
  });

  describe("exportProject", () => {
    it("should export all data for a project", () => {
      adapter.saveDecision({
        project: "test-project",
        projectPath: "/tmp/test",
        title: "Export test",
        content: "Testing export",
      });

      const exported = adapter.exportProject({
        project: "test-project",
        projectPath: "/tmp/test",
      });

      assert.ok(exported.project);
      assert.ok(exported.decisions.length > 0);
      assert.ok(Array.isArray(exported.bugFixes));
      assert.ok(Array.isArray(exported.architecture));
    });

    it("should exclude private decisions unless explicitly requested", () => {
      adapter.saveDecision({
        project: "test-project",
        projectPath: "/tmp/test",
        title: "Public decision",
        content: "Safe to share",
      });
      adapter.saveDecision({
        project: "test-project",
        projectPath: "/tmp/test",
        title: "Private decision",
        content: "Do not share",
        isPrivate: true,
      });

      const safeExport = adapter.exportProject({ project: "test-project", projectPath: "/tmp/test" });
      const fullExport = adapter.exportProject({
        project: "test-project",
        projectPath: "/tmp/test",
        includePrivate: true,
      });

      assert.deepStrictEqual(safeExport.decisions.map((decision) => decision.title), ["Public decision"]);
      assert.strictEqual(fullExport.decisions.length, 2);
    });

    it("should exclude operational records unless explicitly requested", () => {
      adapter.saveBugFix({
        project: "test-project",
        projectPath: "/tmp/test",
        title: "Sensitive operational detail",
        description: "Internal path",
        fix: "Local fix",
      });

      const safeExport = adapter.exportProject({ project: "test-project", projectPath: "/tmp/test" });
      const operationalExport = adapter.exportProject({
        project: "test-project",
        projectPath: "/tmp/test",
        includeOperational: true,
      });

      assert.strictEqual(safeExport.bugFixes.length, 0);
      assert.strictEqual(operationalExport.bugFixes.length, 1);
    });

    it("should import into a different project without reusing global row ids", () => {
      adapter.saveDecision({
        project: "source-project",
        projectPath: "/tmp/source",
        title: "Source decision",
        content: "Portable memory",
      });
      adapter.saveDecision({
        project: "existing-project",
        projectPath: "/tmp/existing",
        title: "Existing decision",
        content: "Keeps its id",
      });

      const exported = adapter.exportProject({ project: "source-project", projectPath: "/tmp/source" });
      exported.project.name = "imported-project";
      exported.project.path = "/tmp/imported";
      adapter.importProject(exported);

      const imported = adapter.getContext({ project: "imported-project", projectPath: "/tmp/imported" });
      assert.strictEqual(imported.recentDecisions[0].title, "Source decision");
    });

    it("should reject malformed imports before replacing existing memory", () => {
      adapter.saveDecision({
        project: "protected-project",
        projectPath: "/tmp/protected",
        title: "Original decision",
        content: "Must survive a failed import",
      });
      const malformed = adapter.exportProject({
        project: "protected-project",
        projectPath: "/tmp/protected",
        includeOperational: true,
      });
      malformed.decisions.push({ title: "Incomplete decision" });

      assert.throws(() => adapter.importProject(malformed), /decisions.content/);
      const context = adapter.getContext({ project: "protected-project", projectPath: "/tmp/protected" });
      assert.deepStrictEqual(context.recentDecisions.map((item) => item.title), ["Original decision"]);
    });
  });

  describe("searchMemory", () => {
    it("should search across all categories when no category specified", () => {
      adapter.saveDecision({
        project: "test-project",
        projectPath: "/tmp/test",
        title: "Use PostgreSQL",
        content: "Database choice",
        tags: "db",
      });

      adapter.saveBugFix({
        project: "test-project",
        projectPath: "/tmp/test",
        title: "Connection timeout",
        description: "DB connection timeout",
        fix: "Added pool config",
        tags: "db",
      });

      const results = adapter.searchMemory({
        project: "test-project",
        projectPath: "/tmp/test",
        query: "db",
      });

      assert.ok(results.decisions.length > 0);
      assert.ok(results.bugs.length > 0);
    });

    it("should never expose private decisions through search or context", () => {
      adapter.saveDecision({
        project: "test-project",
        projectPath: "/tmp/test",
        title: "Private token rotation",
        content: "private-marker",
        isPrivate: true,
      });

      const results = adapter.searchMemory({
        project: "test-project",
        projectPath: "/tmp/test",
        query: "private-marker",
        semantic: false,
      });
      const context = adapter.getContext({ project: "test-project", projectPath: "/tmp/test" });

      assert.strictEqual(results.decisions.length, 0);
      assert.strictEqual(context.recentDecisions.length, 0);
    });
  });
});
