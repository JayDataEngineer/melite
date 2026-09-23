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
  readonly outputs: Record<string, unknown>;
  readonly expected: Record<string, unknown>;
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
    error:
      args.error !== "" ? JSON.stringify(args.error).slice(0, 20000) : "",
    stages: args.stages,
    skipped_stages: [...args.skippedStages],
    artifacts: [...args.artifacts],
    graph: args.graph,
    ...(args.cardSnapshot !== undefined ? { card_snapshot: args.cardSnapshot } : {}),
    ...(args.benchSnapshot !== undefined ? { bench_snapshot: args.benchSnapshot } : {}),
    ...(args.warnings !== undefined && args.warnings.length > 0 ? { warnings: [...args.warnings] } : {}),
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
