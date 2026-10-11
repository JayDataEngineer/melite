import type { EngineJson } from "@melite/comfyui-cordis";
import type { GraphRow } from "./queue.js";
import type { RunId } from "./queueCore.js";
/** Stage statuses — the run worker's vocabulary (inherited from the retired oracle). */
export type RunStatus = "queued" | "running" | "completed" | "failed" | "stopped" | "stopping";
/** The run-status vocabulary as a runtime set — the type's twin, for
 *  durable-boundary reads that judge an on-disk row's status (the
 *  type alone cannot answer "is this sidecar's status one of
 *  ours"). */
export declare const RUN_STATUSES: ReadonlySet<string>;
/** One stage row — key order mirrors submit's literal. */
export interface RunStageRow {
    id: string;
    name: string;
    index: number;
    status: string;
    /** The stage's engine id ('comfyui' | 'mcp:<server>', stroke 53) —
     *  stamped at registration from the compiled stage; the worker
     *  dispatches by it. Legacy rows (pre-seam sidecars) carry none,
     *  which reads as 'comfyui' (the only engine that ever was). */
    engine?: string;
    outputs: Record<string, EngineJson>;
    expected: Record<string, EngineJson>;
    [key: string]: EngineJson | string | number | undefined;
}
/** One registry run. Extends the queue's minimal row so the SAME
 *  object rides QueueCore's FIFO (one object, one voice — the
 *  door's RunsService held one map; the queue's core is that map
 *  now). */
export interface RunRecord {
    runId: RunId;
    status: RunStatus;
    stages: RunStageRow[];
    skippedStages: string[];
    artifacts: string[];
    error: string;
    draftId: string;
    dir: string;
    testFlag: boolean;
    stopFlag: boolean;
    params: Record<string, EngineJson>[];
    outputNodes: Record<string, EngineJson>[];
    /** The run's request initials: the start body's values for the
     *  flow's declared initial validators, gate-validated at the door
     *  and threaded to the engine merge so `$spell` params resolve.
     *  Empty for runs whose flow declares no initials and for a
     *  failed resurrect's floor row. */
    initials: Record<string, EngineJson>;
    /** The FILE-kind subset of initials' keys (photo | glb — the
     *  kinds whose values must exist on disk), stamped beside
     *  initials so the claim-time re-probe knows which entries to
     *  re-judge without re-deriving kinds (the stageFams ledger
     *  law: the row carries the judgment's input, not a new
     *  lookup). Absent = nothing to re-probe (no file initials, a
     *  card run, or a floor row). */
    initialFileKeys?: string[];
    /** The settle persist (R3 mirror): registration stamps these so
     *  settle can rewrite the sidecar + ledger row. createdAt is
     *  epoch seconds. */
    createdAt: number;
    pipeline: string;
    graphRows: GraphRow[];
    /** Per-stage input names (the rim): stage-input -> "stage.output"
     *  / "__initial__.name". Stamped at registration. */
    inputNames?: Record<string, Record<string, string>>;
    /** The card door's id (stamped at registration; inline runs leave
     *  it absent — never a guessed card). */
    cardId?: string;
    /** THE PRESS MEMORY'S ROW MIRROR (audit S-S7, 2026-10-22): the
     *  idempotency key this run was pressed with. The process map caps
     *  at 64; a queued run outliving the window still answers its own
     *  replay through THIS stamp — no second mint beside the live
     *  original. Absent on runs pressed without a key. */
    pressKey?: string;
    /** THE CARD SNAPSHOT (stroke 45): the exact card + body that ran
     *  ({card, params}) — the wand restores from this, never from the
     *  living bench. Stamped at registration, carried through settle
     *  (the settle rewrite must not wipe it). */
    cardSnapshot?: unknown;
    /** THE BENCH SNAPSHOT (stroke 45d): the full workflow as it stood
     *  at Run press ({stages, intent}) — same carry law as the card
     *  snapshot. */
    benchSnapshot?: unknown;
    /** F-6(b) ADMISSION WARNINGS (stamped post-registration by the
     *  start door — the film lane's VRAM-pressure warn): served on
     *  run_status rows, never a refusal. Absent means none. */
    warnings?: string[];
    /** THE REPLAY VERDICT (D11, 2026-10-11): stamped at settle when the
     *  executor's seated tap folded zero engine events before
     *  settlement — the engine served memo'd outputs without
     *  executing, so the artifacts may predate the request. Served on
     *  run_status rows; absent means the tap voiced execution (or the
     *  executor never witnessed — unknown, never clean). */
    replaySuspect?: boolean;
    /** The card arm's family (audit 2026-10-22): the pump's
     *  claim-time presence re-probe re-runs the lane gate on it —
     *  weights can leave between press and claim. */
    fam?: string;
    /** The flow arm's {stageId: fam} ledger (the claim-time presence
     *  re-probe reads it beside fam). */
    stageFams?: Record<string, string>;
    /** THE EXPORT NAME (023's self-critique #4/#6, 2026-09-24): the
     *  voice_name a design/export lane minted — the run-dir preview
     *  flac carries the REAL design sample (since 2026-09-24), and the deliverable .qvoice
     *  (collision-numbered under the voices root) rides no artifact
     *  list. Stamped at settle from the stage params; served on
     *  run_status rows so the receipt names the mint. Absent on
     *  non-export runs. */
    exportName?: string;
    /** THE EXPORT-PATH STAMP (roadmap OWED 2026-09-24 — the export
     *  FULL PATH, transcript-026 #4): the engine's own harvest carries
     *  the minted .qvoice ABSOLUTE path on the stage's
     *  result_outputs.qvoice_path (the node reports it in the history
     *  ui; the file lives engine-side in the voices root, so it rides
     *  NO artifact list). The receipt names the exact
     *  collision-numbered file — the maker feeds it to load lanes with
     *  zero voices-dir listing. Verbatim from the engine; the harness
     *  never hardcodes the voices root. */
    exportPath?: string;
    /** THE VARIANT (commission 033's self-critique #5, 2026-09-24):
     *  the lane the run rode (voicedesign vs customvoice on one
     *  family) — stamped at registration AND settle from the
     *  submitted bodies (variantOfBodies: run.params first, the card
     *  snapshot's exact submitted body as fallback), served on
     *  run_status rows and both ledger rows so a design run and a
     *  performing run on the same pipeline read apart. Absent on
     *  variant-less runs. */
    variant?: string;
    /** THE LOUDNESS STAMP (roadmap OWED 2026-09-26 — the compact-row
     *  chip): the engine's meter reading lifted off the stage
     *  result_outputs.loudness at settle (BS.1770-4 integrated +
     *  true peak, minted by MeliteLoudness into the history ui,
     *  harvested by the engine seat). Served on run_status rows so
     *  the terminal line carries the meter's number without a
     *  sidecar read. Absent on unmetered runs. */
    loudness?: {
        loudness_lufs: number;
        peak_db: number;
    };
    /** THE VOICE-FRESHNESS STAMP (the loudness sibling, 2026-09-26):
     *  which .qvoice won and whether that mint predates the run
     *  (MeliteQVoiceCopy's ui receipt, harvested with the meter's own
     *  collector law) — the single-tenant voice-name law's only
     *  signal, served instead of thrown away. Absent on voiceless
     *  runs. */
    voiceFreshness?: {
        reused_existing: boolean;
        voice_file: string;
    };
    /** THE COMPOSE ECHO (the one-press/one-engine law, 2026-09-23):
     *  what the ENGINE actually received at start — the seam values
     *  of the composed calls + the bench revision the compose read.
     *  The read-side receipt: "what did ComfyUI get" is answered by
     *  the run record itself, not by inference. Non-film runs (no
     *  calls) stamp nothing. */
    composeEcho?: {
        seam: string;
        calls: number;
        benchRev: number | null;
    };
    /** THE SOURCE ECHO (the source-echo law, 2026-09-23): the FILES
     *  the run was created from — every /melite-media/runs/ URL in
     *  the compiled stage params resolved to disk at registration
     *  (first-root-wins across the manifest, the media server's own
     *  walk). The write-side receipt: "what created this run" is
     *  answered by the record itself, never by inference. Runs with
     *  no media sources stamp nothing. */
    sourceEcho?: {
        refs: Array<{
            url: string;
            file: string;
        }>;
    };
}
/** The engine's path relative to the run dir (runRel, door-verbatim). */
export declare function runRel(run: RunRecord, art: string): string;
/** "<Type>: <msg>" — the worker's terminal error text. */
export declare function errText(err: unknown): string;
/** The settle persist (the R3 durable-queue mirror of registration,
 *  door-verbatim): the terminal status rewrites the run's
 *  _flow.json sidecar (the restart authority) and appends the
 *  terminal ledger row. Best-effort by law — a persist failure
 *  never unmakes the run's truth in memory. */
export declare function settlePersist(run: RunRecord, stateRoot: string): Promise<void>;
/** The claim persist (the commission wedge landing, 2026-10-03):
 *  the pump rewrites the run's _flow.json the moment it CLAIMS the
 *  row. Registration writes 'queued', settle writes terminal, and a
 *  process death between the two left the sidecar saying 'queued'
 *  forever — the next boot REPLAYED a run that had already claimed
 *  (duplicate GPU spend) and a claimed-but-wedged row was
 *  indistinguishable on disk from a never-claimed one. The claim
 *  write closes the window: 'running' on disk means the process
 *  owned the claim, and the boot sweep (queueSweep.ts) owns its
 *  retirement. Best-effort by law, same as settlePersist — the
 *  in-memory row is the truth; a persist failure never blocks the
 *  claim. No ledger row: the ledger carries dispositions, and a
 *  claim is not one.
 * @param run the just-claimed row (tryDequeue already set status
 *  'running' in memory).
 * @returns when the write completed or self-swallowed its fault. */
export declare function claimPersist(run: RunRecord): Promise<void>;
/** The synthesized log tail (door-verbatim port: the retired
 *  oracle's status voice, synthesized from the live row). */
export declare function runLogTail(obj: {
    status?: unknown;
    queue_position?: unknown;
    error?: unknown;
    stages?: unknown;
    artifacts?: unknown;
}): string;
//# sourceMappingURL=runsTypes.d.ts.map
