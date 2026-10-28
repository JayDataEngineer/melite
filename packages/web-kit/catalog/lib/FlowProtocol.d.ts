import type { RunStageWire, RunStatusWire } from "./wireTypes.js";
import type { StageResult } from "@melite/contracts";
/**
 * Extract the backend's error message from a non-2xx body for surfacing.
 *
 * Our backend always answers errors as `{"error": "..."}` — the string
 * carries REAL newlines once parsed (the wire JSON escapes them), which is
 * exactly what a multi-line flow doc parse error / validation report
 * looks like in the drilldown modal. When the body isn't JSON, or has no
 * string `error` field (proxy error page, unexpected shape), the raw text
 * is returned unchanged.
 *
 * 2026-08-10: the error path used to `slice(0, 200)` the body, which cut
 * "Validation failed: N violation(s)" reports mid-sentence — the full
 * error is now surfaced unmodified (user: "full errors in the modals").
 */
export declare function describeErrorBody(text: string): string;
/** One wire stage — the RunStageWire CONTRACT CORE in ./wireTypes.ts (id/name/index/status, REQUIRED — declared there, never hand-written). */
/** Plus the view extras the runner tolerates beyond the core and the poll consumes (url / gallery / named_urls / progress / activity). */
/** The core is inherited from the wire type; the extras are documented view fields — a stage from the wire always carries the core, by contract. */
/** A type-alias intersection (NOT an interface): the wire components are intersection aliases, which interfaces cannot extend (TS2499). */
export type FlowRunStage = RunStageWire & {
    url?: string;
    gallery?: Array<{
        url: string;
        name?: string;
    }>;
    /** name → wireable URL for EVERY artifact the brick produced (Phase 5,
     *  named outputs). Populated by the backend from BrickResult.artifacts;
     *  absent on legacy runs → collectNamedArtifacts returns {}. */
    named_urls?: Record<string, string>;
    /** Live KSampler step progress — {value, max, node} while this brick is
     *  sampling (status === "running"), null/absent otherwise. Surfaced from
     *  ComfyUI's WebSocket by the backend's step-progress sink (2026-08-08).
     *  Drives the per-card progress bar built into the cards. */
    progress?: {
        value: number;
        max: number;
        node?: string;
    } | null;
    /** Live WS activity (2026-08-10) — one line per consumed ComfyUI frame:
     *  {phase: "queued"|"loading"|"executing"|"sampling"|"output"|"done"|
     *  "waiting"|"error", node, node_class, message, ...} while this brick
     *  is running, null/absent otherwise. Model loads, sampling, previews,
     *  and failure messages — the protocol sink's envelope mapped to the
     *  card's activity line. */
    activity?: {
        phase: string;
        node?: string;
        node_class?: string;
        message?: string;
        [k: string]: unknown;
    } | null;
};
/** The status channel's contract core comes from the backend schema
 *  (RunStatusWire: run_id, the 7-value run-level
 *  status, stages) — generated, never hand-written. The view layer
 *  consumes a few documented extras the runner tolerates beyond the core:
 *  the run-level `error` detail, and the richer stage view.
 *
 *  DO NOT switch this back to Omit<RunStatusWire, "stages">: the generated
 *  component is an intersection WITH an index signature ([key: string]:
 *  unknown), so Omit's mapped type degenerates every property to unknown
 *  (keyof includes `string`). Pick with literal keys avoids the poison —
 *  indexed access on the intersection still resolves status to the 7-union. */
export type FlowRunStatus = Pick<RunStatusWire, "run_id" | "status"> & {
    stages?: Array<FlowRunStage>;
    /** Run-level failure detail — emitted by the runner on failed runs;
     *  not part of the contract core (declared here as a view extra). */
    error?: string;
    /** The run's console tail — served when the status door is asked
     *  ?include_log=true (2026-09-06, the studio console drilldown):
     *  run status + queue position, one line per stage (name: status,
     *  live progress/activity), stage errors verbatim, artifact
     *  basenames. Synthesized from real runner/sidecar state — never a
     *  fabricated log. */
    log_tail?: string;
    [k: string]: unknown;
};
/** The minimal artifact-carrying shape the collectors read. Satisfied by
 *  FlowRunStage AND by the editor's loose run-protocol rows (whose
 *  url/gallery/named_urls are `unknown`) once narrowed through
 *  asArtifactSource — the collectors take the SOURCE, callers stop
 *  double-casting their rows into the strict wire type. */
export type ArtifactSource = {
    url?: string;
    gallery?: Array<{
        url: string;
        name?: string;
    }>;
    named_urls?: Record<string, string>;
};
/** Collect every artifact URL from a run status (stage.url + gallery).
 *  The FLAT list — preserves the legacy wire-by-position behavior (the
 *  primary output is always [0]). Use collectNamedArtifacts when the wire
 *  needs to address a specific named output (mask, detection, …). */
export declare function collectStageUrls(stages?: Array<ArtifactSource>): string[];
/** Revived/stashed docs are untrusted (written by any client or session):
 *  artifacts + assetUrls must be STRING-only, or every consumer crashes
 *  (u.endsWith on undefined — motion card 2026-08-10). Filter instead of
 *  casting verbatim; callers still hard-error on structural doc junk.
 *  Missing numeric fields default so downstream guards (assetUrls.length)
 *  behave — never a null result while the result object is present. */
export declare function sanitizeRevivedResult(raw: unknown): StageResult | null;
/** Collect named artifacts from a run status → {name: URL}. The NAMED map
 *  — lets a downstream slot wire a SPECIFIC output (mask → input_mask)
 *  rather than only the primary (assetUrls[0]). Falls back to {} when the
 *  backend didn't send named_urls (legacy runs / single-output bricks). */
export declare function collectNamedArtifacts(stages?: Array<ArtifactSource>): Record<string, string>;
/**
 * Poll a flow run until terminal. Throws on error/timeout/abort.
 *
 * Terminal statuses: "completed"/"done" → success; "error"/"failed" →
 * throws with the run-level error message.
 *
 * `onTick(status)` fires after every successful poll — used by the store
 * to hydrate live KSampler step progress onto the running card BEFORE the
 * run goes terminal (so the per-card progress bar animates during the
 * run, 2026-08-08). Not fired on the terminal tick (the final status is
 * the return value).
 */
export declare function pollFlowRun(runId: string, signal?: AbortSignal, opts?: {
    maxWaitMs?: number;
    intervalMs?: number;
    onTick?: (status: FlowRunStatus) => void;
}): Promise<FlowRunStatus>;
export type CompiledGenerationResult = {
    kind: "started";
    runId: string;
    status: FlowRunStatus;
    urls: string[];
};
/**
 * Start a compiled generation and poll it to completion.
 *
 * POSTs {model, ...params} to /v1/flows/start — the canonical run-start
 * door, flat shape (raw fetch — no retry, a retry would duplicate GPU
 * work), then polls /status. CARD BIRTH LAW (operator order
 * 2026-09-06): the card is composed FIRST (POST /v1/flows/drafts —
 * ensureDraftId, ./cardBirth) and the minted draft_id rides the
 * envelope to validate + start; the door 4xxes a start without one. Returns:
 *   - started: run completed — urls are the artifact URLs
 *
 * D3 (2026-08-06): every catalog form compiles to a family
 * (_FORM_CONFIGS), so the "uncompilable" 400 fallback to
 * POST /v1/run (base64) is dead — an uncompilable form now throws here.
 *
 * Throws on any other failure (HTTP error, malformed response, run error).
 */
/** The required-empty resolver seam: (model, body) → required field
 * names visible under the body's current values, or null when unknown.
 * Pushed by the app layer (lib/specContractStore registers at import) —
 * the package never imports app code (no cycle), the app owns the specs. */
export type RequiredEmptyResolver = (model: string, values: Record<string, unknown>) => readonly string[] | null;
/** Register (or clear) the required-empty resolver. */
export declare function setRequiredEmptyResolver(fn: RequiredEmptyResolver | null): void;
/**
 * HARD VALIDATION: no silent parameter drops in the generate request body.
 *
 * JSON.stringify silently drops `undefined` values — `{a: 1, b: undefined}`
 * serializes to `{"a":1}` with ZERO error. This is the TypeScript version
 * of the Python `**kwargs` absorb pattern: a field that was set in the form
 * state, survived into the body object, but vanishes on the wire with no
 * error, no warning. The backend receives defaults and the user sees
 * degraded output they can't diagnose.
 *
 * This function is called before EVERY GPU-starting fetch (generate,
 * startChain — the run doors) —
 * it is the universal gate. It catches:
 *   - `undefined` values (silently dropped by JSON.stringify)
 *   - `NaN` / `Infinity` (serialized as `null` — a value mutation)
 *   - `function` / `symbol` / `bigint` values (dropped or thrown by JSON)
 *   - empty string for known-critical fields (prompt, model)
 *
 * SILENT PARAMETER DROPS ARE COMPLETELY UNACCEPTABLE ANYWHERE EVER.
 *
 * @param body the request body about to be JSON.stringify'd and POST'd
 * @throws Error listing every field that would be silently dropped or mutated
 */
export declare function assertNoParamDrops(body: Record<string, unknown>): void;
export declare function runCompiledGeneration(body: Record<string, unknown>, signal?: AbortSignal, opts?: {
    intervalMs?: number;
    /** Fires with the run_id immediately after the start response (before the
     * first status poll) — lets callers correlate the run (e.g. cancel). */
    onStart?: (runId: string) => void;
    onTick?: (status: FlowRunStatus) => void;
}): Promise<CompiledGenerationResult>;
//# sourceMappingURL=FlowProtocol.d.ts.map
