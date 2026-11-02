import { useSyncExternalStore } from "react";

// Opt-in field evidence, held only in memory. One latest result per finite
// operation bounds the report even when autosave keeps failing. No song data
// or error messages (which can quote saved content) enter the report.
export type StorageStep =
  | "probe-write" | "probe-remove" | "probe-indexeddb"
  | "list-projects" | "load-project" | "save-recordings" | "save-project";

const enabled = new URLSearchParams(window.location.search).has("storagecheck");
const results = new Map<StorageStep, { current: string; firstFailure?: string }>();
const listeners = new Set<() => void>();
let snapshot = "Waiting for TAP TO START.";

export function recordStorageResult(step: StorageStep, error?: unknown): void {
  if (!enabled) return;
  const causes: string[] = [];
  let cause = error;
  for (let depth = 0; cause && depth < 4; depth++) {
    if (!(cause instanceof Error)) {
      causes.push(typeof cause);
      break;
    }
    const code = "code" in cause ? String(cause.code) : "";
    causes.push(`${cause.name}${code ? ` (${code})` : ""}`);
    cause = cause.cause;
  }
  const current = error === undefined ? "OK" : `FAILED: ${causes.join(" → ") || "unknown"}`;
  const firstFailure = results.get(step)?.firstFailure ?? (error === undefined ? undefined : current);
  results.set(step, { current, ...(firstFailure ? { firstFailure } : {}) });
  snapshot = [...results].map(([operation, result]) =>
    `${operation}: ${result.current}${result.firstFailure && result.firstFailure !== result.current ? `; earlier ${result.firstFailure}` : ""}`,
  ).join("\n");
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export function StorageDiagnosticReport() {
  const report = useSyncExternalStore(subscribe, () => snapshot);
  if (!enabled) return null;
  return (
    <details id="storage-diagnostics" open>
      <summary>Storage report</summary>
      <p>Tap START, then make one edit. Send a screenshot of this report.</p>
      <pre>{location.origin}{"\n"}{navigator.userAgent}{"\n"}
        {[...document.scripts].filter((script) => script.type === "module").map((script) => script.src).join("\n")}
        {"\n"}{report}
      </pre>
    </details>
  );
}
