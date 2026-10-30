import type { DraftId } from "@melite/contracts/benchStage";
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
    /** THE DRAFT ROW this stage ran for (the bench identity seam,
     *  2026-10-22, extended to the sidecar 2026-10-20's
     *  invisible-press burn): `id` may be the card skeleton's own id
     *  ('generate' — a namespace the bench draft never heard of),
     *  while the bench read joins on the draft row's id. Absent on
     *  legacy sidecars and multi-row bench runs (those already stamp
     *  each row's own id). */
    readonly bench_stage_id?: string;
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
/** THE SERVED-GRAPH RECEIPT (the silent UI-drop purge's P1,
 *  dev_docs/audits/ui-engine-fidelity-purge-2026-11-08.md §7):
 *  the queue-time evidence of which doc scalars the composed graph
 *  actually carries — the DOC→GRAPH hop's witness, where every
 *  prior seat was green while a knob died silently.
 *
 *  v1 is the SCALAR plane, by law: every doc key whose value is a
 *  primitive (string non-empty after trim, finite number, boolean)
 *  is searched, by EXACT value, across every node's every input
 *  entry (one walk, a Set of primitive input values — link pairs
 *  `[node, slot]` and nested dicts are not input entries, so they
 *  never match). Arrays/objects/null are OUT of v1 scope, in
 *  NEITHER direction: the bag/class planes have lawful transforms
 *  (id→wire renames, per-window post maps, output binding renames)
 *  a raw name-diff would false-red on — v1 receipts the scalar
 *  plane and SAYS SO in arm (c)'s wall.
 *
 *  NO refusal rides here — the receipt is EVIDENCE, never a gate:
 *  the compose gate owns refusals; a dropped key is a receipt fact
 *  (the P0 census consumes it). */
export interface GraphReceiptPair {
    /** Workflow key count — the composed graph's node budget. */
    readonly nodes: number;
    /** Every judged doc key (scalar-valued), sorted. */
    readonly populated: readonly string[];
    /** The judged keys found in the graph, sorted. */
    readonly carried: readonly string[];
    /** The judged keys NOT found in the graph, sorted — the honesty face. */
    readonly dropped: readonly string[];
    readonly verdict: "complete" | "partial";
    /** THE BAKE'S RECORD (study §7 item 2, the run voice): present
     *  iff the composed graph bakes or loads a refmod mod — read off
     *  the graph's own nodes (the extract/loader inputs VERBATIM),
     *  never off the doc, so the record cannot disagree with what
     *  the engine will actually run. Absent when no seat exists. */
    readonly bake?: GraphReceiptBake;
}
/** The refmod bake's receipt: the graph-stated dials, the baked
 *  media count, the film's window count (one SamplerCustomAdvanced
 *  per window — the DiT pass set), and the run-voice price. */
export interface GraphReceiptBake {
    /** "baked" = media bakes at run time (MiniMaxH3RefModExtract);
     *  "stems" = pre-baked .safetensors packs load (MiniMaxH3RefModsLoader). */
    readonly source: "baked" | "stems";
    readonly mode?: string;
    readonly pool?: number;
    readonly refinement_steps?: number;
    readonly save?: boolean;
    /** refs_image.* + refs_video.* slots the extract stacks. */
    readonly visual_refs?: number;
    /** loader mod_N slots ≠ "(none)". */
    readonly stems?: number;
    /** One SamplerCustomAdvanced per film window. */
    readonly windows: number;
    /** "bake: <steps> refinement steps × <refs> ref(s) × <windows> windows" */
    readonly price: string;
}
/** One stage's queue-time doc→graph evidence row. */
export interface GraphReceiptStageRow extends GraphReceiptPair {
    readonly stage: string;
}
/** The run-level fold of the per-stage rows (what `_flow.json`
 *  carries as `graph_receipt`, beside `compose_echo`). */
export interface GraphReceipt extends GraphReceiptPair {
    /** Per-stage rows, in registration order. */
    readonly stages: readonly GraphReceiptStageRow[];
    /** THE ENGINE'S PROMPT ID — minted ENGINE-SIDE at POST /prompt,
     *  so it CANNOT exist at queue time. The execute outcome fold
     *  stamps it (runsExecute's runOne, beside the harvested
     *  result_outputs.prompt_id), and settle's sidecar rewrite
     *  carries it to disk. Absent until the run has submitted. */
    readonly prompt_id?: string;
}
/** THE RECEIPT SPINE: receipt one doc against one composed
 *  workflow (the `{workflow, output_nodes}` envelope the card walk
 *  yields — only `workflow`'s node inputs are judged).
 *  @param params the run door's admitted doc params (the snapshot's
 *    own row — bench stage row params, or the card arm's admitted
 *    request body)
 *  @param composed the card walk's composed envelope
 *  @returns the pair — node count, populated/carried/dropped
 *    (sorted), verdict `complete` iff nothing dropped */
export declare function graphReceiptOf(params: Record<string, unknown>, composed: {
    readonly workflow: unknown;
}): GraphReceiptPair;
/** Name one stage's pair with its stage id (the per-stage rows
 *  inside the run-level `graph_receipt`). */
export declare function graphReceiptStageOf(stage: string, pair: GraphReceiptPair): GraphReceiptStageRow;
/** Fold per-stage rows into the run-level receipt (nodes SUM —
 *  the run's graph key space; populated/carried/dropped the
 *  sorted union; verdict `complete` iff every stage is). */
export declare function graphReceiptFoldOf(rows: readonly GraphReceiptStageRow[], promptId?: string): GraphReceipt;
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
    draftId: DraftId;
    pipeline: string;
    graph: GraphRow[];
    /** THE SNAPSHOT KEYS (strokes 45/45d, carried stroke 48): the exact
     *  card + bench that ran. Absent when unstamped (inline runs)
     *  the pinned prefix above never shifts. */
    cardSnapshot?: unknown;
    cardRecipe?: unknown;
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
    /** THE SERVED-GRAPH RECEIPT (the silent UI-drop purge's P1):
     *  the queue-time doc→graph evidence, run-level fold with its
     *  per-stage rows inside. The status row spells it
     *  `graph_receipt` too. Absent when the run composed no card
     *  stage (the receipt judges the card compose, never the
     *  verbatim inline envelope). */
    graphReceipt?: GraphReceipt;
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
    /** THE REPLAY VERDICT (D11, 2026-10-11): the executor's seated tap
     *  folded zero engine events before settlement — one spelling on
     *  disk and on the wire (`replay_suspect`). Absent unless suspect. */
    replaySuspect?: boolean;
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
