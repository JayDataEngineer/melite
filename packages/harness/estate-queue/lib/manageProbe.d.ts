import type { ManageCtx } from "./managePlane.js";
/** Sidecar scan: run dirs whose _flow.json reads running|queued.
 *  THE ROOTS UNIFICATION (2026-09-25, the handoff item): the scan
 *  walks the SAME roots manifest as every run-resolving door — own
 *  state root first, then the stateRoots config extras (§23) — so a
 *  live run under the maker's tree guards the restart exactly like
 *  one under the estate's own tree. Before, a maker-lane run was
 *  invisible to the restart guard (status said idle, restart tore
 *  a live render). Conservative as ever: a stale "running" sidecar
 *  refuses the restart (safe).
 *
 *  FAIL-CLOSED (the fallback audit's HIGH-3, 2026-09-28): an
 *  UNREADABLE sidecar or root used to `continue` — the run became
 *  invisible and the guard failed OPEN (restart tore a live render
 *  whose state file hit EACCES/EISDIR/EIO). Absent state (ENOENT,
 *  ENOTDIR) is honestly inactive — nothing exists to protect;
 *  every OTHER read failure is UNKNOWN state and counts as ACTIVE,
 *  named with its errno so the refusal and the status view say
 *  exactly what could not be read. */
export declare function activeRuns(stateRoots: readonly string[]): string[];
/** The stale-claim settle (tts NEW-2, 2026-11-12): retire sidecars
 *  that claim a live word but cannot be live. The caller owns the
 *  liveness judgment (the engine-queue corroboration + the age rule
 *  ride the handler — this sweep only judges DISK state); `eligible`
 *  answers per sidecar, and only eligible rows are rewritten.
 *
 *  The rewrite marks the row "stopped" — the stop door's own word,
 *  inside the settled triple the registry's resync adopts — with a
 *  settle note naming the reason, so the row reads as operator
 *  action, never a completed render. Unparseable rows are SKIPPED
 *  (fail-closed: an unreadable row stays active, exactly like the
 *  census reads it) and named, never silently dropped. */
export interface SettleOutcome {
    readonly settled: string[];
    readonly skipped: string[];
}
export declare function settleStaleClaims(stateRoots: readonly string[], eligible: (name: string, mtimeMs: number) => boolean): SettleOutcome;
/** The manager's live security view (READ ONLY — the manager reads
 *  config.ini once at ComfyUI startup, so a call-time write would be
 *  a lie until restart; provision owns the pin). v3.38 layout:
 *  user/__manager/config.ini (system-user-api ComfyUI), legacy
 *  user/default/ComfyUI-Manager/config.ini otherwise. */
export declare function managerSecurity(repoRoot: string): string;
export declare function engineQueueView(mctx: ManageCtx): Promise<{
    running: number;
    pending: number;
} | null>;
interface EndpointView {
    reachable: boolean;
    url?: string;
    reason?: string;
    comfyui_version?: unknown;
    devices?: Array<{
        name: string;
        vram_total: unknown;
        vram_free: unknown;
    }>;
}
/** The endpoint config's OWN server, probed live (/system_stats).
 *  The 5s fuse is dsh-timeout's deadline — the caller signal and
 *  the timer fuse into one signal with dispose-once cleanup (the
 *  disposal guarantee the timer service seat used to carry). */
export declare function probeEndpoint(mctx: ManageCtx): Promise<EndpointView>;
/** @param lines - journal output lines (already split, non-empty).
 *  @returns how many lines carry an oom-kill marker. */
export declare function countOomLines(lines: readonly string[]): number;
/** The systemd census of the estate's engine unit (the probe seat
 *  beside probeEndpoint — the reachability probe knows the HTTP door,
 *  this knows the unit the engine dies inside). */
export interface EngineUnitCensus {
    /** false names WHY in {@link note} — the read arms answer, they
     *  never invent a verdict over an unanswerable lane (the
     *  provisioning-absence posture, 2026-09-26). */
    known: boolean;
    unit: string;
    /** systemctl show NRestarts — the restart counter the burn watched
     *  climb 1→3→270. */
    restarts?: number;
    /** systemctl show ExecMainStatus — the raw exit status (9 for the
     *  burn's `status=9/KILL`). */
    last_exit_status?: number;
    /** systemctl show ExecMainCode — "killed" | "exited" | ... verbatim. */
    last_exit_code?: string;
    /** systemctl show ExecMainExitTimestamp, verbatim (systemd's own
     *  spelling — never reformatted into a claim). */
    last_exit_at?: string;
    /** systemctl show ExecMainStartTimestamp as ISO 8601 — the unit's
     *  own word for when the engine process started (the status face's
     *  boot time, S1 2026-11-27). Absent when systemd prints an empty
     *  value or `n/a`: the unit is not running, so there is no boot to
     *  state. */
    started_at?: string;
    /** oom-kill lines in the recent journal tail (countOomLines). */
    oom_kills?: number;
    /** "degraded" (restart loop / signal death / oom evidence),
     *  "settled" (answered, no anomaly), "unknown" (could not answer). */
    verdict: "degraded" | "settled" | "unknown";
    note?: string;
}
/** THE USER BUS'S SEAT (S1, 2026-11-27): `systemctl --user` and
 *  `journalctl --user` find the user manager through
 *  XDG_RUNTIME_DIR (or DBUS_SESSION_BUS_ADDRESS); a process with a
 *  scrubbed env answers `Failed to connect to user scope bus` and the
 *  census read `unknown` over a unit that was up. systemd's own rule
 *  seats the user runtime dir at /run/user/<uid>; the census sets it
 *  only where the process carries none. LC_ALL=C and TZ=UTC fix
 *  systemd's timestamp words to the one spelling {@link
 *  systemdStampIso} parses.
 *  @returns the exec env: the process env plus the locale pins and,
 *  when absent, the derived runtime dir and its bus address. */
export declare function censusEnv(): NodeJS.ProcessEnv;
export declare function systemdStampIso(word: string | undefined): string | undefined;
/** @param mctx - the manage context (unit + signal).
 *  @returns the unit census; `known:false` + note when systemd or the
 *  journal cannot answer (BYO lane, bus-less box) — never invented
 *  zeros dressed as data; the note names which of the two happened
 *  and the runtime dir the execs rode. @throws the caller's own
 *  abort (N-S2). */
export declare function engineUnitCensus(mctx: ManageCtx): Promise<EngineUnitCensus>;
export {};
//# sourceMappingURL=manageProbe.d.ts.map
