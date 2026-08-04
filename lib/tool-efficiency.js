const MAX_READ_HISTORY = 200;

export function readSignature(input = {}) {
  const args = input?.args || {};
  const path = String(args.path || args.filePath || args.file_path || "").trim();
  const offset = args.offset ?? "";
  const limit = args.limit ?? "";
  return `${path}\u0000${offset}\u0000${limit}`;
}

export function createReadHistory() {
  return {
    reads: new Map(),
    warned: new Map(),
  };
}

export function noteRead(history, signature) {
  const count = (history.reads.get(signature) || 0) + 1;
  history.reads.set(signature, count);
  if (history.reads.size > MAX_READ_HISTORY) {
    const oldest = history.reads.keys().next().value;
    if (oldest !== undefined) {
      history.reads.delete(oldest);
      history.warned.delete(oldest);
    }
  }
  return count;
}

export function readWarning(history, signature, count) {
  if (count === 2 && history.warned.get(signature) !== 2) {
    history.warned.set(signature, 2);
    return {
      trigger: "duplicate_read",
      warning: `[GUARDRAIL: Ya leiste "${signature}" en esta sesion. Si el archivo no cambio, no lo vuelvas a leer.]`,
    };
  }
  if (count >= 3 && history.warned.get(signature) !== 3) {
    history.warned.set(signature, 3);
    return {
      trigger: "repeated_read",
      warning: `[GUARDRAIL: Tercera lectura del mismo rango "${signature}". Considera resumir o delegar a explore.]`,
    };
  }
  return null;
}

export function clearReads(history) {
  history.reads.clear();
  history.warned.clear();
}