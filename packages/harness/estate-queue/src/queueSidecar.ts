// queueSidecar.ts — the sidecar document + pipeline probe (split from queue.ts 2026-09-18;
// pure move, zero logic changes — the queue.ts barrel re-exports
// every symbol, so the public surface is byte-identical).
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

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
  composeEcho?: { seam: string; calls: number; benchRev: number | null };
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
    ...(args.exportName !== undefined && args.exportName !== "" ? { export_name: args.exportName } : {}),
    ...(args.exportPath !== undefined && args.exportPath !== "" ? { export_path: args.exportPath } : {}),
    ...(args.variant !== undefined && args.variant !== "" ? { variant: args.variant } : {}),
    ...(args.loudness !== undefined ? { loudness: args.loudness } : {}),
    ...(args.voiceFreshness !== undefined ? { voice_freshness: args.voiceFreshness } : {}),
    error:
      args.error !== "" ? JSON.stringify(args.error).slice(0, 20000) : "",
    stages: args.stages,
    skipped_stages: [...args.skippedStages],
    artifacts: [...args.artifacts],
    graph: args.graph,
    ...(args.cardSnapshot !== undefined ? { card_snapshot: args.cardSnapshot } : {}),
    ...(args.benchSnapshot !== undefined ? { bench_snapshot: args.benchSnapshot } : {}),
    ...(args.warnings !== undefined && args.warnings.length > 0 ? { warnings: [...args.warnings] } : {}),
    ...(args.composeEcho !== undefined ? { compose_echo: args.composeEcho } : {}),
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
