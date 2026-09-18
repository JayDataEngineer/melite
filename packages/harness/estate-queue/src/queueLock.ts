// queueLock.ts — state/journal roots + the single-writer lock + journal/atomic writers (split from queue.ts 2026-09-18;
// pure move, zero logic changes — the queue.ts barrel re-exports
// every symbol, so the public surface is byte-identical).
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.
import {
  appendFileSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
  writeSync,
  closeSync,
} from "node:fs";
import { join } from "node:path";
// ── constants (cites inline) ──────────────────────────────────

/** Lock file name under STATE_ROOT (acquire_lock 4416). */
export const LOCK_NAME: string = "gateway.lock";

/** Worker poll cadence (worker 1354: asyncio.sleep(0.05)). */

/** Registry bound (MAX_SETTLED_RUNS 2187: settled completed/failed
 *  rows past 500 leave; the sidecar stays SSOT). */
export const MAX_SETTLED_RUNS: number = 500;

/** Stage retries range (flow spec: retries 0..5). */
export const RETRIES_MAX: number = 5;

/** The stderr line main() prints before exit(1).
 *  NOTE the em-dash — byte-identical. */
export function refuseStartLine(note: string): string {
  return (
    "[gateway] REFUSING TO START: " + note + " — one writer per state root"
  );
}

// ── roots (STATE_ROOT/OUT_ROOT/TEST_OUT_ROOT) ───

/** State root — MELITE_STATE_ROOT else <repo>/data/runs. */
export function resolveStateRoot(repoRoot: string): string {
  const override: string = process.env["MELITE_STATE_ROOT"] ?? "";
  if (override !== "") return override;
  return join(repoRoot, "data", "runs");
}

/** Run-dir root — TEST_OUT_ROOT on test:true else OUT_ROOT (L3). */
export function outRootFor(stateRoot: string, testFlag: boolean): string {
  return join(stateRoot, testFlag ? "test-output" : "output");
}

/** Append-only journal path (LEDGER_PATH 2180: OUT_ROOT/_ledger). */
export function ledgerPathFor(stateRoot: string): string {
  return join(stateRoot, "output", "_ledger.jsonl");
}

/** Lock path (acquire_lock 4416: STATE_ROOT/gateway.lock). */
export function lockPathFor(stateRoot: string): string {
  return join(stateRoot, LOCK_NAME);
}

// ── single-writer lock ──────────────────────────────────────────

export interface LockResult {
  readonly ok: boolean;
  readonly note: string;
}

/** Signal-0 probe (_pid_alive 4469-4479: ESRCH-dead false, EPERM
 *  still ALIVE — the whole point of the guard). */
export function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (exc: unknown) {
    // (process.kill throws SystemErrors — always objects with .code.)
    const code: string = String((exc as { code?: unknown }).code);
    /* v8 ignore next -- signal-0 probing a foreign-owned pid refuses
       EPERM (alive): untestable in this fiber (no foreign pids here),
       kept as the guard's contract (2026-09-12) */
    if (code === "EPERM" || code === "EACCES") return true;
    return false;
  }
}

function writePidFile(lockPath: string, pid: number): boolean {
  let fd: number = -1;
  try {
    fd = openSync(lockPath, "wx", 0o644);
  } catch {
    return false;
  }
  try {
    writeSync(fd, String(pid));
  /* v8 ignore start -- a fresh lock-file write never fails in practice
     (disk-full class, unfaultable here): the abort never fires (2026-09-12) */
  } catch {
    try {
      closeSync(fd);
    } catch {
      /* gone */
    }
    return false;
  /* v8 ignore stop */
  }
  try {
    closeSync(fd);
  } catch {
    /* closed */
  }
  return true;
}

/** R2 single-writer: O_CREAT|O_EXCL acquire; on
 *  collision the holder pid decides — alive refuses loud (the
 *  caller exits before any boot side effect), dead-or-garbage
 *  steals (unlink + re-acquire, ledgered server.lock_stolen). */
export function acquireLock(
  stateRoot: string,
  pid: number = process.pid,
  nowS: number = Math.floor(Date.now() / 1000),
): LockResult {
  const lockPath: string = lockPathFor(stateRoot);
  mkdirSync(stateRoot, { recursive: true });
  if (writePidFile(lockPath, pid)) return { ok: true, note: "acquired" };
  let holder: string = "";
  try {
    holder = readFileSync(lockPath, "utf8").trim();
  } catch {
    holder = "";
  }
  let hpid: number = -1;
  const parsed: number = Number(holder);
  if (holder !== "" && Number.isInteger(parsed)) hpid = parsed;
  if (hpid > 0 && isPidAlive(hpid)) {
    return { ok: false, note: "gateway.lock held by live pid " + hpid };
  }
  try {
    unlinkSync(lockPath);
  } catch {
    /* already gone */
  }
  appendLedger(stateRoot, "server.lock_stolen", { stale_pid: hpid }, nowS);
  if (writePidFile(lockPath, pid)) {
    return { ok: true, note: "stolen from dead pid " + hpid };
  }
  return { ok: false, note: "lock steal failed: " + lockPath };
}

/** PID-CHECKED release (release_lock 4450-4468): a boot that never
 *  owned the lock frees only its OWN, never the live holder's (the
 *  watcher-storm lesson — a blind unlink let each retry steal +
 *  boot-sweep LIVE runs). */
export function releaseLock(
  stateRoot: string,
  pid: number = process.pid,
): boolean {
  const lockPath: string = lockPathFor(stateRoot);
  let holder: string = "";
  try {
    holder = readFileSync(lockPath, "utf8").trim();
  } catch {
    return false;
  }
  if (holder !== String(pid)) return false;
  try {
    unlinkSync(lockPath);
  } catch {
    return false;
  }
  return true;
}

/** Pre-boot gate (main 4474-4480): acquire BEFORE any boot side
 *  effect — resurrection, sweep, worker, listen. A second writer
 *  exits here, loud, having touched nothing (but the steal ledger
 *  row, when it stole from the dead). */
export function bootGate(
  stateRoot: string,
  pid: number = process.pid,
): LockResult {
  return acquireLock(stateRoot, pid);
}

// ── journal + atomic write ────────────────

/** Journal data writer: canonical JSON, UTF-8. */
export function dumpsLedgerData(data: Record<string, unknown>): string {
  // (data is a record — JSON.stringify never yields undefined here.)
  return JSON.stringify(data);
}

/** Append-only activity journal: one JSON object per line,
 *  close-per-line (durable), mkdir-parents, NEVER throws.
 *  Line shape: {ts, event, data} — compact envelope. */
export function appendLedger(
  stateRoot: string,
  event: string,
  data: Record<string, unknown> | null = null,
  nowS: number = Math.floor(Date.now() / 1000),
): void {
  try {
    const outRoot: string = join(stateRoot, "output");
    mkdirSync(outRoot, { recursive: true });
    appendFileSync(
      join(outRoot, "_ledger.jsonl"),
      '{"ts":' +
        nowS +
        ',"event":' +
        JSON.stringify(event) +
        ',"data":' +
        dumpsLedgerData(data ?? {}) +
        "}\n",
      "utf8",
    );
  } catch {
    /* the journal must never take the queue down */
  }
}

/** Atomic write: tmp + rename, indent-2 JSON. */
export function atomicWriteJson(filePath: string, obj: unknown): void {
  const text: string = JSON.stringify(obj, null, 2) ?? "null";
  writeFileSync(filePath + ".tmp", text, "utf8");
  renameSync(filePath + ".tmp", filePath);
}
