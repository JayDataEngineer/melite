// queueSidecar.ts — the sidecar document + pipeline probe (split from queue.ts 2026-09-18;
// pure move, zero logic changes — the queue.ts barrel re-exports
// every symbol, so the public surface is byte-identical).
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.
import type { DraftId } from "@melite/contracts/benchStage";

// ── sidecar document (sidecar 2124-2169) ──────────────────────────

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
  readonly gallery?: Array<{ name: string }>;
  readonly result_outputs?: Record<string, unknown>;
  readonly error?: string;
  readonly merged?: boolean;
  readonly outputs: Record<string, unknown>;
  readonly expected: Record<string, unknown>;
}

export function sidecarStageOf(stage: {
  readonly id: string;
  readonly name: string;
  readonly index: number;
  readonly status: string;
  readonly engine?: string;
  readonly outputs?: Record<string, unknown>;
  readonly expected?: Record<string, unknown>;
  readonly [key: string]: unknown;
}): SidecarStage {
  const out: {
    id: string;
    bench_stage_id?: string;
    name: string;
    index: number;
    status: string;
    engine?: string;
    url?: string;
    gallery?: Array<{ name: string }>;
    result_outputs?: Record<string, unknown>;
    error?: string;
    merged?: boolean;
    outputs: Record<string, unknown>;
    expected: Record<string, unknown>;
  } = {
    id: stage.id,
    name: stage.name,
    index: stage.index,
    status: stage.status,
    outputs: stage.outputs ?? {},
    expected: stage.expected ?? {},
  };
  if (typeof stage.benchStageId === 'string' && stage.benchStageId !== '') out.bench_stage_id = stage.benchStageId;
  if (typeof stage.engine === 'string') out.engine = stage.engine;
  if (typeof stage.url === 'string') out.url = stage.url;
  if (Array.isArray(stage.gallery)) {
    const gallery = stage.gallery.filter((entry): entry is { name: string } =>
      typeof entry === 'object' && entry !== null && !Array.isArray(entry)
      && typeof (entry as { name?: unknown }).name === 'string'
      && (entry as { name: string }).name !== '',
    );
    if (gallery.length > 0) out.gallery = gallery;
  }
  if (typeof stage.result_outputs === 'object' && stage.result_outputs !== null && !Array.isArray(stage.result_outputs)) {
    out.result_outputs = stage.result_outputs as Record<string, unknown>;
  }
  if (typeof stage.error === 'string') out.error = stage.error;
  if (stage.merged === true) out.merged = true;
  return out;
}

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

/** A v1-judged scalar: the receipt's scope gate. */
function receiptScalarOf(value: unknown): string | number | boolean | undefined {
  if (typeof value === "string") return value.trim() !== "" ? value : undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "boolean") return value;
  return undefined;
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
export function graphReceiptOf(
  params: Record<string, unknown>,
  composed: { readonly workflow: unknown },
): GraphReceiptPair {
  const carried = new Set<string | number | boolean>();
  let nodes = 0;
  let windows = 0;
  let bake: GraphReceiptBake | undefined;
  const workflow = composed.workflow;
  if (workflow !== null && typeof workflow === "object" && !Array.isArray(workflow)) {
    for (const node of Object.values(workflow as Record<string, unknown>)) {
      if (node === null || typeof node !== "object" || Array.isArray(node)) continue;
      nodes += 1;
      const cls = (node as { class_type?: unknown }).class_type;
      if (cls === "SamplerCustomAdvanced") windows += 1;
      const inputs: unknown = (node as { inputs?: unknown }).inputs;
      if (inputs === null || typeof inputs !== "object" || Array.isArray(inputs)) continue;
      for (const v of Object.values(inputs as Record<string, unknown>)) {
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") carried.add(v);
      }
      // THE BAKE RECORD (study §7 item 2): read off the graph's own
      // seat nodes — the extract's declared dials verbatim, the
      // ref count from its autogrow slots, the price string the run
      // voice renders. One bake per graph; the visual seat wins
      // over a stems-only loader (the per-call replace law).
      if (cls === "MiniMaxH3RefModExtract" || cls === "MiniMaxH3RefModsLoader") {
        const inp = inputs as Record<string, unknown>;
        if (cls === "MiniMaxH3RefModExtract") {
          const visualRefs = Object.keys(inp).filter((k) => k.startsWith("refs_image.") || k.startsWith("refs_video.")).length;
          bake = {
            source: "baked",
            ...(typeof inp["mode"] === "string" ? { mode: inp["mode"] } : {}),
            ...(typeof inp["pool_h"] === "number" ? { pool: inp["pool_h"] } : {}),
            ...(typeof inp["identity"] === "number" ? { refinement_steps: inp["identity"] } : {}),
            ...(typeof inp["save"] === "boolean" ? { save: inp["save"] } : {}),
            visual_refs: visualRefs,
            windows,
            price: "",
          };
        } else {
          const stems = Object.entries(inp).filter(([k, v]) => /^mod_\d+$/.test(k) && v !== "(none)").length;
          bake = { source: "stems", stems, windows, price: "" };
        }
      }
    }
  }
  if (bake !== undefined) {
    const windows_ = windows;
    bake = bake.source === "baked"
      ? {
          ...bake,
          windows: windows_,
          price: "bake: " + String(bake.refinement_steps ?? "?") + " refinement steps × "
            + String(bake.visual_refs ?? 0) + (bake.visual_refs === 1 ? " ref × " : " refs × ")
            + String(windows_) + (windows_ === 1 ? " window" : " windows"),
        }
      : {
          ...bake,
          windows: windows_,
          price: "bake: " + String(bake.stems ?? 0) + (bake.stems === 1 ? " stem × " : " stems × ")
            + String(windows_) + (windows_ === 1 ? " window" : " windows"),
        };
  }
  const populated: string[] = [];
  const found: string[] = [];
  const missed: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    const scalar = receiptScalarOf(value);
    if (scalar === undefined) continue;
    populated.push(key);
    (carried.has(scalar) ? found : missed).push(key);
  }
  populated.sort();
  found.sort();
  missed.sort();
  return {
    nodes,
    populated,
    carried: found,
    dropped: missed,
    verdict: missed.length === 0 ? "complete" : "partial",
    ...(bake !== undefined ? { bake } : {}),
  };
}

/** Name one stage's pair with its stage id (the per-stage rows
 *  inside the run-level `graph_receipt`). */
export function graphReceiptStageOf(stage: string, pair: GraphReceiptPair): GraphReceiptStageRow {
  return {
    stage,
    nodes: pair.nodes,
    populated: [...pair.populated],
    carried: [...pair.carried],
    dropped: [...pair.dropped],
    verdict: pair.verdict,
    ...(pair.bake !== undefined ? { bake: pair.bake } : {}),
  };
}

/** Fold per-stage rows into the run-level receipt (nodes SUM —
 *  the run's graph key space; populated/carried/dropped the
 *  sorted union; verdict `complete` iff every stage is). */
export function graphReceiptFoldOf(rows: readonly GraphReceiptStageRow[], promptId?: string): GraphReceipt {
  const union = (pick: (r: GraphReceiptStageRow) => readonly string[]): string[] => {
    const s = new Set<string>();
    for (const r of rows) for (const k of pick(r)) s.add(k);
    return [...s].sort();
  };
  let nodes = 0;
  let complete = true;
  for (const r of rows) {
    nodes += r.nodes;
    if (r.verdict !== "complete") complete = false;
  }
  return {
    nodes,
    populated: union((r) => r.populated),
    carried: union((r) => r.carried),
    dropped: union((r) => r.dropped),
    verdict: complete ? "complete" : "partial",
    stages: rows.map((r) => graphReceiptStageOf(r.stage, r)),
    // THE BAKE rides the fold: the first stage that carries one
    // (the card run's single stage; a multi-stage flow receipts the
    // first bake seat it composes).
    ...(rows.find((r) => r.bake !== undefined)?.bake !== undefined
      ? { bake: rows.find((r) => r.bake !== undefined)!.bake }
      : {}),
    ...(promptId !== undefined && promptId !== "" ? { prompt_id: promptId } : {}),
  };
}

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
export function variantOfBodies(bodies: unknown[]): string | undefined {
  for (const p of bodies) {
    if (p === null || typeof p !== "object" || Array.isArray(p)) continue
    const v: unknown = (p as Record<string, unknown>)["variant"]
    if (typeof v === "string" && v.trim() !== "") return v.trim()
  }
  return undefined
}

/** The sidecar document: KEY ORDER as (run_id, status, error,
 *  stages, skipped_stages, artifacts, created_at, test, draft_id,
 *  pipeline, graph). error rides the JSON error capped at 20000 chars when
 *  set (a JSON-quoted string — the writer quirk, mirrored, never
 *  "fixed"), else "". */
export function sidecarDoc(args: {
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
  composeEcho?: { seam: string; calls: number; benchRev: number | null };
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
  sourceEcho?: { refs: Array<{ url: string; file: string }> };
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
  loudness?: { loudness_lufs: number; peak_db: number };
  voiceFreshness?: { reused_existing: boolean; voice_file: string };
  /** THE REPLAY VERDICT (D11, 2026-10-11): the executor's seated tap
   *  folded zero engine events before settlement — one spelling on
   *  disk and on the wire (`replay_suspect`). Absent unless suspect. */
  replaySuspect?: boolean;
}): Record<string, unknown> {
  return {
    // IDENTITY KEYS FIRST (stroke 82): buildRunCard and the listRuns
    // scan slice(0, 8191) the sidecar — with stages/error/graph in
    // the prefix, any bulky payload pushed created_at/draft_id/
    // pipeline past the window and the row listed as a zombie
    // (empty pipeline, draft cleared, created 0). The scalars ride
    // ahead of every payload; a big error or graph can only
    // truncate what follows it.
    run_id: args.runId,
    status: args.status,
    created_at: args.createdAt,
    test: args.testFlag,
    draft_id: args.draftId,
    pipeline: args.pipeline,
    // THE STAGE-ID DIGEST (commission 015, §6 finding 6): the ids of
    // the stages THIS run composed, CSV-compact, riding with the
    // identity scalars AHEAD of every payload — the list row's
    // 8191-byte window cannot reach the stages array, but it always
    // reaches this. Derived from the very stages the doc stores, so
    // digest and array can never disagree; every writer (queued,
    // settled, resurrect) shares this one seat.
    // THE DRAFT NAMESPACE (the invisible-press cure, 2026-10-20):
    // the digest is the bench read's MEMBERSHIP TICKET
    // (melite-construct's withLastRun joins stage_ids against the
    // bench draft's row ids) — a single-card press composes the
    // card's own skeleton ('generate'), a namespace the draft doc
    // never heard of, so the ticket takes the bench_stage_id seam
    // first and falls back to the row id only when the draft
    // address is absent (inline runs, multi-row bench loops — those
    // stamp each row's own id). The skeleton survives on the stage
    // row's own `id`, named beside its draft address.
    stage_ids: args.stages
      .map((s) => (s.bench_stage_id !== undefined && s.bench_stage_id !== "" ? s.bench_stage_id : s.id))
      .filter((id) => id !== "")
      .join(","),
    ...(args.exportName !== undefined && args.exportName !== "" ? { export_name: args.exportName } : {}),
    ...(args.exportPath !== undefined && args.exportPath !== "" ? { export_path: args.exportPath } : {}),
    ...(args.variant !== undefined && args.variant !== "" ? { variant: args.variant } : {}),
    ...(args.loudness !== undefined ? { loudness: args.loudness } : {}),
    ...(args.voiceFreshness !== undefined ? { voice_freshness: args.voiceFreshness } : {}),
    ...(args.replaySuspect === true ? { replay_suspect: true } : {}),
    error:
      args.error !== "" ? JSON.stringify(args.error).slice(0, 20000) : "",
    stages: args.stages,
    skipped_stages: [...args.skippedStages],
    artifacts: [...args.artifacts],
    graph: args.graph,
    ...(args.cardSnapshot !== undefined ? { card_snapshot: args.cardSnapshot } : {}),
    // THE RECIPE (the F27 cure): the admitted card doc — envelope
    // lifted, stanza unwrapped — is a DIFFERENT document from the
    // request that carried it (the raw body is `_request.json`, an
    // envelope the compose never read); restore overlays THIS key so a
    // restored stage is re-editable, never a fresh timeline with the
    // artifact pasted in.
    ...(args.cardRecipe !== undefined ? { card_recipe: args.cardRecipe } : {}),
    ...(args.benchSnapshot !== undefined ? { bench_snapshot: args.benchSnapshot } : {}),
    ...(args.warnings !== undefined && args.warnings.length > 0 ? { warnings: [...args.warnings] } : {}),
    ...(args.composeEcho !== undefined ? { compose_echo: args.composeEcho } : {}),
    ...(args.graphReceipt !== undefined ? { graph_receipt: args.graphReceipt } : {}),
    ...(args.sourceEcho !== undefined ? { source_echo: args.sourceEcho } : {}),
  };
}

/** The door name the run started with (_pipeline_of 2111-2119:
 *  exactly one of flow | flow_inline | model — the sidecar's
 *  `pipeline` and the queued ledger row share this one truth). */
export function pipelineOf(request: {
  flow?: unknown;
  model?: unknown;
  flow_inline?: unknown;
}): string {
  if (typeof request.flow === "string" && request.flow !== "") {
    return request.flow;
  }
  if (typeof request.model === "string" && request.model !== "") {
    return request.model;
  }
  const inline = request.flow_inline as
    | { id?: unknown }
    | undefined;
  if (
    typeof inline === "object" &&
    inline !== null &&
    typeof inline.id === "string"
  ) {
    return inline.id;
  }
  return "";
}

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
export function parseSidecar(raw: unknown): { stages: Array<Record<string, unknown>>; pipeline: string; request: Record<string, unknown> } | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null
  const doc = raw as Record<string, unknown>
  // the STAGES: an array of records, each with a STRING id (the one
  // field every reader keys on) — a row without one cannot be found
  // by id and is refused rather than silently invisible
  const rawStages = doc["stages"]
  const stages: Array<Record<string, unknown>> = []
  if (rawStages !== undefined && rawStages !== null) {
    if (!Array.isArray(rawStages)) return null
    for (const s of rawStages) {
      if (s === null || typeof s !== "object" || Array.isArray(s)) return null
      const row = s as Record<string, unknown>
      if (typeof row["id"] !== "string" || row["id"] === "") return null
      stages.push(row)
    }
  }
  // the REQUEST: a record when present — and it is what `request`
  // returns (the check was dead theater: it validated the key, then
  // handed back the whole doc; strictness fix 7, 2026-10-01)
  const rawRequest = doc["request"]
  if (rawRequest !== undefined && rawRequest !== null) {
    if (typeof rawRequest !== "object" || Array.isArray(rawRequest)) return null
  }
  // CONTENT typing (strictness fix 7): `pipeline` and `status` are
  // strings when PRESENT. Absent keys stay legal — the file-era
  // convention (found-ness matters; absent pipeline is "" to the
  // list reader). A present-but-non-string value is corruption the
  // old parse silently retyped: `pipeline: 42` became "" and served.
  if (doc["pipeline"] !== undefined && typeof doc["pipeline"] !== "string") return null
  if (doc["status"] !== undefined && typeof doc["status"] !== "string") return null
  return {
    // the CALLER's own row, fields intact (this judges the shape; it
    // never rebuilds a sidecar — a settle carries the old row's own
    // faces forward, and a rebuild would drop them)
    stages: Array.isArray(rawStages) ? (rawStages as Array<Record<string, unknown>>) : [],
    pipeline: typeof doc["pipeline"] === "string" ? doc["pipeline"] : "",
    request:
      rawRequest !== undefined && rawRequest !== null
        ? (rawRequest as Record<string, unknown>)
        : (doc as Record<string, unknown>),
  }
}
