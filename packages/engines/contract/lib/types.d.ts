/** A JSON value as the runs plane already carries it (the
 * stage-row params/outputs element type — EngineJson's structural
 * twin, declared here so the contract depends on no engine
 * package). */
export type EngineParamValue = null | boolean | number | string | EngineParamValue[] | {
    [key: string]: EngineParamValue;
};
/** One stage of a run, engine-agnostic: the door-validated id, the
 * stage's declared outputs, and the stage's raw params. Graph
 * surgery (ComfyUI's spliceWorkflow) belongs to the owning
 * engine's executor — never to the consumer. */
export interface EngineStageRow {
    readonly stageId: string;
    /** The stage's owning card id when the run was card-commissioned
     *  (VOICES ONLY: the wiring wall names the composer of the graph
     *  it judges — 'card <id> built node ...'. Absent for flow /
     *  engine-only stages, where the wall names the stage id; the
     *  audit's F-2, 2026-10-11: the adapter used to pass the stageId
     *  as a card name for EVERY run, so a refusal named a card that
     *  never composed the graph.) */
    readonly card?: string;
    readonly outputs: Readonly<Record<string, EngineParamValue>>;
    readonly params: Readonly<Record<string, EngineParamValue>>;
}
/** One stage's outcome: the harvested outputs plus the run-dir
 * relative artifact paths the engine wrote (the collect arm — the
 * runs tree is the estate's artifact law, viewable by melite_view). */
export interface EngineStageOutcome {
    readonly stageId: string;
    readonly outputs: Readonly<Record<string, EngineParamValue>>;
    readonly artifacts: readonly string[];
}
/** A whole submit's outcome. `engineRef` is the engine's own
 * handle for the submitted work (ComfyUI's promptId) — opaque to
 * the consumer, carried for the ledger. */
export interface EngineRunOutcome {
    readonly stages: readonly EngineStageOutcome[];
    readonly engineRef?: string;
    /** THE REPLAY VERDICT (D11): true when the executor's seated tap
     *  folded zero engine events before settlement — the engine served
     *  memo'd outputs without executing. Optional so existing
     *  executors stay assignable (absent = unknown, never clean). */
    readonly replaySuspect?: boolean;
}
/** The run-path's signals into the executor: the stop flag (the
 * user's stop press) and the progress tap (stage activity /
 * progress folds — the same callback shape the ComfyUI progress
 * webhooks ride today). */
export interface EngineRunOptions {
    shouldStop(): boolean;
    report(updates: Record<string, unknown>): void;
    /** §23 cross-roots manifest extras (J12: config-named by the
     *  queue seat — the trees a chained-input estate URL may
     *  resolve under beyond the run's own output root; optional so
     *  existing executors stay assignable). */
    readonly stateRoots?: readonly string[];
}
/** The control arm: execute stages of one run. The ComfyUI
 * executor keeps the MERGED single-graph law internally (rows
 * splice + merge into ONE prompt); an MCP executor executes
 * per-stage wire commands. `inputNames` is the run's stage-input
 * wiring (stage-local name -> upstream artifact ref), identical in
 * shape to the merged path's. `initials` is the run's request
 * initials — the flow's declared initial values the start body
 * carried, gate-validated at the door — the values a stage's
 * `$spell` params resolve against at merge; an engine whose param
 * dialect has no `$spells` ignores it. Optional so existing
 * shorter-signature executors stay assignable (absent = no
 * initials to resolve). */
export interface EngineExecutor {
    executeStages(rows: readonly EngineStageRow[], runDir: string, inputNames: Readonly<Record<string, Readonly<Record<string, string>>>>, options: EngineRunOptions, initials?: Readonly<Record<string, EngineParamValue>>): Promise<EngineRunOutcome>;
}
/** One registered engine: the executor plus an optional
 * reachability probe (the supervisor face — ComfyUI's
 * /system_stats probe; an MCP engine's cheap tool health call).
 * Connection lifecycle is NOT here: the MCP client plugin owns
 * connect/reconnect (the DSH pattern), ComfyUI's supervisor owns
 * its own — the probe only reports. */
export interface EngineRecord {
    readonly executor: EngineExecutor;
    readonly probe?: () => Promise<void>;
}
//# sourceMappingURL=types.d.ts.map
