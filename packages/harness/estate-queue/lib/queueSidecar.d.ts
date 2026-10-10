export interface GraphRow {
    readonly id: string;
    readonly type: string;
    readonly input_from: readonly string[];
    readonly input_names: Record<string, unknown>;
    readonly outputs: Record<string, unknown>;
    readonly params: Record<string, unknown>;
}
export interface SidecarStage {
    readonly id: string;
    readonly name: string;
    readonly index: number;
    readonly status: string;
    readonly engine?: string;
    readonly url?: string;
    readonly gallery?: Array<{
        name: string;
    }>;
    readonly result_outputs?: Record<string, unknown>;
    readonly error?: string;
    readonly merged?: boolean;
    readonly outputs: Record<string, unknown>;
    readonly expected: Record<string, unknown>;
}
export declare function sidecarStageOf(stage: {
    readonly id: string;
    readonly name: string;
    readonly index: number;
    readonly status: string;
    readonly engine?: string;
    readonly outputs?: Record<string, unknown>;
    readonly expected?: Record<string, unknown>;
    readonly [key: string]: unknown;
}): SidecarStage;
/** THE VARIANT LIFT (commission 033's self-critique #5, 2026-09-24):
 *  the first non-empty `variant` string across the submitted bodies —
 *  the LANE the run rode (voicedesign vs customvoice on the same
 *  family). The 033 ledger read pipeline `qwen3-tts-voicedesign` on
 *  BOTH a design run and a performing CustomVoice run — an analyst
 *  reading the ledger alone could not tell them apart (only
 *  `sources: 1` hinted). Compiled stage params are engine-shaped
 *  (the compose may consume card keys — the exportName stamp's
 *  024 lesson), so callers pass run.params FIRST and the exact
 *  submitted body (card snapshot / request body) as the fallback,
 *  same order as the export-name stamp. */
export declare function variantOfBodies(bodies: unknown[]): string | undefined;
/** The sidecar document: KEY ORDER as (run_id, status, error,
 *  stages, skipped_stages, artifacts, created_at, test, draft_id,
 *  pipeline, graph). error rides the JSON error capped at 20000 chars when
 *  set (a JSON-quoted string — the writer quirk, mirrored, never
 *  "fixed"), else "". */
export declare function sidecarDoc(args: {
    runId: string;
    status: string;
    error: string;
    stages: SidecarStage[];
    skippedStages: string[];
    artifacts: string[];
    createdAt: number;
    testFlag: boolean;
    draftId: string;
    pipeline: string;
    graph: GraphRow[];
    /** THE SNAPSHOT KEYS (strokes 45/45d, carried stroke 48): the exact
     *  card + bench that ran. Absent when unstamped (inline runs)
     *  the pinned prefix above never shifts. */
    cardSnapshot?: unknown;
    benchSnapshot?: unknown;
    /** F-6(b) ADMISSION WARNINGS (the film lane's VRAM-pressure
     *  warn): the status row spells it `warnings` too — one spelling
     *  on disk and on the wire. Absent when none were stamped. */
    warnings?: string[];
    /** THE COMPOSE ECHO (the one-press/one-engine law, 2026-09-23):
     *  what the engine actually received at start — the seam values
     *  of the composed calls + the bench revision the compose read.
     *  Absent on non-film runs (no calls). The status row spells it
     *  `compose_echo` too. */
    composeEcho?: {
        seam: string;
        calls: number;
        benchRev: number | null;
    };
    /** THE SOURCE ECHO (the source-echo law, 2026-09-23): the files
     *  the run was created from, resolved at registration. The
     *  status row spells it `source_echo` too. Absent on sourceless
     *  runs. */
    sourceEcho?: {
        refs: Array<{
            url: string;
            file: string;
        }>;
    };
    /** THE EXPORT NAME (023's self-critique #4/#6): the voice_name
     *  the design/export lane minted. The status row spells it
     *  `export_name` too. Absent on non-export runs. */
    exportName?: string;
    /** THE EXPORT PATH (roadmap OWED 2026-09-24 — the export FULL
     *  PATH): the engine-reported minted .qvoice absolute path
     *  (stage result_outputs.qvoice_path → qvoicePathsOf). The status
     *  row spells it `export_path`. Absent when nothing minted. */
    exportPath?: string;
    /** THE VARIANT (commission 033's self-critique #5, 2026-09-24):
     *  the lane the run rode (e.g. voicedesign vs customvoice) — the
     *  status row spells it `variant` too. Absent on variant-less
     *  runs (the lift found no non-empty variant string). */
    variant?: string;
    /** THE LOUDNESS + FRESHNESS STAMPS (2026-09-26): the meter's
     *  reading and the voice-mint receipt — one spelling on disk and
     *  on the wire (`loudness`, `voice_freshness`). */
    loudness?: {
        loudness_lufs: number;
        peak_db: number;
    };
    voiceFreshness?: {
        reused_existing: boolean;
        voice_file: string;
    };
}): Record<string, unknown>;
/** The door name the run started with (_pipeline_of 2111-2119:
 *  exactly one of flow | flow_inline | model — the sidecar's
 *  `pipeline` and the queued ledger row share this one truth). */
export declare function pipelineOf(request: {
    flow?: unknown;
    model?: unknown;
    flow_inline?: unknown;
}): string;
/**
 * THE SIDECAR PARSE — the contract's READ half (2026-10-10, the
 * bypass audit's HIGH-5: the sidecar had a writer contract and no
 * reader contract, so six readers JSON.parsed and `as`-cast it, and a
 * hand-edited `_flow.json` with a stage that has no id, or a
 * `pipeline` of nonsense, loaded silently — `stages.find(s => s.id ===
 * …)` simply missed, and the run routed by a value nothing validated).
 *
 * This is the ONE parse. It returns null for a doc that does not
 * answer the shape, and every reader treats null as unreadable (the
 * quarantine arm the boot sweep already has) rather than casting its
 * way forward.
 */
export declare function parseSidecar(raw: unknown): {
    stages: Array<Record<string, unknown>>;
    pipeline: string;
    request: Record<string, unknown>;
} | null;
//# sourceMappingURL=queueSidecar.d.ts.map