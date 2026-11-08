/** Lock file name under STATE_ROOT (acquire_lock 4416). */
export declare const LOCK_NAME: string;
/** Worker poll cadence (worker 1354: asyncio.sleep(0.05)). */
/** Registry bound (MAX_SETTLED_RUNS 2187: settled completed/failed
 *  rows past 500 leave; the sidecar stays SSOT). */
export declare const MAX_SETTLED_RUNS: number;
/** Stage retries range (flow spec: retries 0..5). */
export declare const RETRIES_MAX: number;
/** The stderr line main() prints before exit(1).
 *  NOTE the em-dash — byte-identical. */
export declare function refuseStartLine(note: string): string;
/** State root — config.stateRoot (an absolute tree) else
 *  <repoRoot>/data/runs. The MELITE_STATE_ROOT env seam retired
 *  (J12, 2026-10-19): roots are named in config, never read from
 *  the process env. */
export declare function resolveStateRoot(config: Readonly<{
    repoRoot?: string;
    stateRoot?: string;
}>): string;
/** Run-dir root — TEST_OUT_ROOT on test:true else OUT_ROOT (L3). */
export declare function outRootFor(stateRoot: string, testFlag: boolean): string;
/** Append-only journal path (LEDGER_PATH 2180: OUT_ROOT/_ledger). */
export declare function ledgerPathFor(stateRoot: string): string;
/** Lock path (acquire_lock 4416: STATE_ROOT/gateway.lock). */
export declare function lockPathFor(stateRoot: string): string;
export interface LockResult {
    readonly ok: boolean;
    readonly note: string;
}
/** Signal-0 probe (_pid_alive 4469-4479: ESRCH-dead false, EPERM
 *  still ALIVE — the whole point of the guard). */
export declare function isPidAlive(pid: number): boolean;
/** R2 single-writer: O_CREAT|O_EXCL acquire; on
 *  collision the holder pid decides — alive refuses loud (the
 *  caller exits before any boot side effect), dead-or-garbage
 *  steals (unlink + re-acquire, ledgered server.lock_stolen). */
export declare function acquireLock(stateRoot: string, pid?: number, nowS?: number): LockResult;
/** PID-CHECKED release (release_lock 4450-4468): a boot that never
 *  owned the lock frees only its OWN, never the live holder's (the
 *  watcher-storm lesson — a blind unlink let each retry steal +
 *  boot-sweep LIVE runs). */
export declare function releaseLock(stateRoot: string, pid?: number): boolean;
/** Pre-boot gate (main 4474-4480): acquire BEFORE any boot side
 *  effect — resurrection, sweep, worker, listen. A second writer
 *  exits here, loud, having touched nothing (but the steal ledger
 *  row, when it stole from the dead). */
export declare function bootGate(stateRoot: string, pid?: number): LockResult;
/** Journal data writer: canonical JSON, UTF-8. */
export declare function dumpsLedgerData(data: Record<string, unknown>): string;
/** Append-only activity journal: one JSON object per line,
 *  close-per-line (durable), mkdir-parents, NEVER throws.
 *  Line shape: {ts, event, data} — compact envelope. */
export declare function appendLedger(stateRoot: string, event: string, data?: Record<string, unknown> | null, nowS?: number): void;
/** Atomic indent-2 JSON write — the atomicity is
 *  `writeFileAtomic`'s (symlink-safe exclusive-create temp, mode
 *  carried through the rename, parent directories created, temp
 *  removed on failure); this adds only the JSON encoding the call
 *  sites share. */
export declare function writeJsonAtomic(filePath: string, obj: unknown): Promise<void>;
//# sourceMappingURL=queueLock.d.ts.map