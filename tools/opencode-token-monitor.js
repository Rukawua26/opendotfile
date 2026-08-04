#!/usr/bin/env node
/**
 * opencode-token-monitor.js
 *
 * Medición automática de la Feature 010 (Fase H).
 * Ejecuta el agregador de métricas sobre una ventana de 3 días y registra un
 * snapshot append-only en un archivo persistente
 * (~/.local/share/opencode/plugins-data/metrics-followup-010.log).
 *
 * No lanza OpenCode ni modelos: solo lee el JSONL de métricas. Registrado en
 * cron-jobs.json para ejecutarse diariamente.
 */
import { existsSync, mkdirSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const HOME = process.env.HOME || "/tmp";
const METRICS_TOOL = join(HOME, ".config/opencode/tools/opencode-metrics.js");
const DATA_DIR = join(HOME, ".local/share/opencode/plugins-data");
const LOG_FILE = join(DATA_DIR, "metrics-followup-010.log");

function fmt(n) {
  if (typeof n !== "number") return "n/a";
  return new Intl.NumberFormat("es-ES").format(n);
}

function runMetrics(days) {
  const res = spawnSync(process.execPath, [METRICS_TOOL, String(days), "--stdout"], {
    encoding: "utf8",
    env: { ...process.env },
  });
  if (res.status !== 0 || !res.stdout.trim()) return null;
  try {
    return JSON.parse(res.stdout);
  } catch {
    return null;
  }
}

function main() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  const s = runMetrics(3);
  const ts = new Date().toISOString();
  if (!s) {
    appendFileSync(LOG_FILE, `${ts} | NO_DATA | no se encontraron metricas registradas\n`);
    console.log("[token-monitor] Sin datos todavía.");
    return 0;
  }
  const cacheHit = s.input_tokens > 0
    ? ((s.cache_read_tokens / (s.input_tokens + s.cache_read_tokens)) * 100).toFixed(1)
    : "0.0";
  const line = `${ts} | input=${fmt(s.input_tokens)} output=${fmt(s.output_tokens)} cache_read=${fmt(s.cache_read_tokens)} cache_hit=${cacheHit}% | v2=${s.v2_records} legacy=${s.legacy_records} dup_reads=${s.duplicate_reads} loops=${s.loop_messages} failures=${s.failures || 0}`;
  appendFileSync(LOG_FILE, `${line}\n`);
  console.log(`[token-monitor] ${line}`);
  return 0;
}

process.exit(main());
