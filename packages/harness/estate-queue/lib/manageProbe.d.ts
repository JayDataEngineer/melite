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
export {};
//# sourceMappingURL=manageProbe.d.ts.map