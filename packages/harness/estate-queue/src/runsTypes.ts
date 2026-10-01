// runsTypes.ts — the live-run record + the pure tail helpers,
// re-homed VERBATIM from the dead flowsRun door (gateway kill,
// REBUILD-6). Types + pure functions only: no Context, no I/O
// beyond the settle persist (best-effort by the door's own law).
//
// DIVERGENCE-BY-ORDER (the kill): the door stamped stage url/gallery
// with ASSET_URL_PREFIX + "/v1/assets/runs/<run>/<rel>" — an HTTP
// face that died with the app. The remote reports the run-RELATIVE
// artifact name instead (no prefix, no port). The web callers
// (mask-studio/gallery) migrate when their stroke lands; the
// artifacts[] rows keep the engine's paths.
import { join } from "node:path";
import type { EngineJson } from "@melite/comfyui-cordis";
import {
  appendLedger,
  writeJsonAtomic,
  sidecarDoc,
  sidecarStageOf,
  variantOfBodies,
} from "./queue.ts";
import type { GraphRow } from "./queue.ts";

/** Stage statuses — the run worker's vocabulary (inherited from the retired oracle). */
export type RunStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "stopped"
  | "stopping";

/** The run-status vocabulary as a runtime set — the type's twin, for
 *  durable-boundary reads that judge an on-disk row's status (the
 *  type alone cannot answer "is this sidecar's status one of
 *  ours"). */
export const RUN_STATUSES: ReadonlySet<string> = new Set<string>([
  "queued",
  "running",
  "completed",
  "failed",
  "stopped",
  "stopping",
]);

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
  runId: string;
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
  loudness?: { loudness_lufs: number; peak_db: number };
  /** THE VOICE-FRESHNESS STAMP (the loudness sibling, 2026-09-26):
   *  which .qvoice won and whether that mint predates the run
   *  (MeliteQVoiceCopy's ui receipt, harvested with the meter's own
   *  collector law) — the single-tenant voice-name law's only
   *  signal, served instead of thrown away. Absent on voiceless
   *  runs. */
  voiceFreshness?: { reused_existing: boolean; voice_file: string };
  /** THE COMPOSE ECHO (the one-press/one-engine law, 2026-09-23):
   *  what the ENGINE actually received at start — the seam values
   *  of the composed calls + the bench revision the compose read.
   *  The read-side receipt: "what did ComfyUI get" is answered by
   *  the run record itself, not by inference. Non-film runs (no
   *  calls) stamp nothing. */
  composeEcho?: { seam: string; calls: number; benchRev: number | null };
  /** THE SOURCE ECHO (the source-echo law, 2026-09-23): the FILES
   *  the run was created from — every /melite-media/runs/ URL in
   *  the compiled stage params resolved to disk at registration
   *  (first-root-wins across the manifest, the media server's own
   *  walk). The write-side receipt: "what created this run" is
   *  answered by the record itself, never by inference. Runs with
   *  no media sources stamp nothing. */
  sourceEcho?: { refs: Array<{ url: string; file: string }> };
}

/** The engine's path relative to the run dir (runRel, door-verbatim). */
export function runRel(run: RunRecord, art: string): string {
  if (art === run.dir) return basenameSafe(art);
  const prefix: string = run.dir + "/";
  if (art.startsWith(prefix)) return art.slice(prefix.length);
  const base: string = basenameSafe(art);
  return base === "" || base === "." ? basenameSafe(art) : base;
}

function basenameSafe(p: string): string {
  const i: number = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
  return i < 0 ? p : p.slice(i + 1);
}

function errName(err: unknown): string {
  if (err instanceof Error && typeof err.name === "string" && err.name !== "") {
    return err.name;
  }
  return "Error";
}

/** "<Type>: <msg>" — the worker's terminal error text. */
export function errText(err: unknown): string {
  const msg: string = err instanceof Error ? err.message : String(err);
  return errName(err) + ": " + msg;
}

/** The settle persist (the R3 durable-queue mirror of registration,
 *  door-verbatim): the terminal status rewrites the run's
 *  _flow.json sidecar (the restart authority) and appends the
 *  terminal ledger row. Best-effort by law — a persist failure
 *  never unmakes the run's truth in memory. */
export async function settlePersist(
  run: RunRecord,
  stateRoot: string,
): Promise<void> {
  // THE EXPORT-NAME STAMP (023's self-critique #4/#6): a
  // design/export lane's voice_name rides the submitted body — lift
  // the first non-empty one onto the row so the receipt names the
  // mint (the preview flac carries the design sample; the .qvoice
  // is the deliverable and rides no artifact list). The compiled
  // stage params are engine-shaped (the compose may consume card
  // keys into the workflow — 024 proved voice_name missing there),
  // so the card snapshot (the exact submitted body) is the fallback.
  let exportName: string | undefined
  const bodies: unknown[] = [...run.params]
  const snap = run.cardSnapshot as { params?: unknown } | undefined
  if (snap !== undefined && snap !== null && typeof snap === "object") bodies.push(snap.params)
  for (const p of bodies) {
    if (p === null || typeof p !== "object" || Array.isArray(p)) continue
    const v: unknown = (p as Record<string, unknown>)["voice_name"]
    if (typeof v === "string" && v.trim() !== "") {
      exportName = v.trim()
      run.exportName = exportName
      break
    }
  }
  // THE VARIANT STAMP (commission 033's self-critique #5): the
  // lane rides the same bodies as the export name (run.params
  // first, the card snapshot's exact submitted body as fallback —
  // the compose may consume card keys into engine-shaped params).
  // Stamped on the row (registration may already hold it; settle
  // re-lifts with the registration stamp as fallback — the row in
  // memory is the truth either way).
  const variant = variantOfBodies(bodies) ?? run.variant
  if (variant !== undefined) run.variant = variant
  // THE EXPORT-PATH STAMP: lift the engine-reported mint path off
  // the stage result_outputs (set at execute time from the history
  // ui — qvoicePathsOf). Stamped only when the engine actually
  // minted one (a load lane mints nothing).
  let exportPath: string | undefined
  for (const st of run.stages) {
    const ro: unknown = st["result_outputs"]
    if (ro === null || typeof ro !== "object" || Array.isArray(ro)) continue
    const v: unknown = (ro as Record<string, unknown>)["qvoice_path"]
    if (typeof v === "string" && v.trim() !== "") {
      exportPath = v.trim()
      run.exportPath = exportPath
      break
    }
  }
  // THE LOUDNESS + FRESHNESS STAMPS (2026-09-26): lift the meter's
  // reading and the voice-mint receipt off the stage result_outputs
  // — same law as the export path (the engine's harvest carries
  // them; the run row serves them). First coherent pair wins.
  for (const st of run.stages) {
    const ro: unknown = st["result_outputs"]
    if (ro === null || typeof ro !== "object" || Array.isArray(ro)) continue
    const rec = ro as Record<string, unknown>
    if (run.loudness === undefined) {
      const loud: unknown = rec["loudness"]
      if (loud !== null && typeof loud === "object" && !Array.isArray(loud)) {
        const l = (loud as Record<string, unknown>)["loudness_lufs"]
        const pk = (loud as Record<string, unknown>)["peak_db"]
        if (typeof l === "number" && Number.isFinite(l) && typeof pk === "number" && Number.isFinite(pk)) {
          run.loudness = { loudness_lufs: l, peak_db: pk }
        }
      }
    }
    if (run.voiceFreshness === undefined) {
      const fresh: unknown = rec["voice_freshness"]
      if (fresh !== null && typeof fresh === "object" && !Array.isArray(fresh)) {
        const reused = (fresh as Record<string, unknown>)["reused_existing"]
        const file = (fresh as Record<string, unknown>)["voice_file"]
        if (typeof reused === "boolean" && typeof file === "string" && file.trim() !== "") {
          run.voiceFreshness = { reused_existing: reused, voice_file: file.trim() }
        }
      }
    }
  }
  try {
    await writeJsonAtomic(
      join(run.dir, "_flow.json"),
      sidecarDoc({
        runId: run.runId,
        status: run.status,
        error: run.error,
        stages: run.stages.map((st) => sidecarStageOf(st)),
        skippedStages: [...run.skippedStages],
        artifacts: [...run.artifacts],
        createdAt: run.createdAt,
        testFlag: run.testFlag,
        draftId: run.draftId,
        pipeline: run.pipeline,
        graph: run.graphRows,
        // THE SNAPSHOT CARRY (stroke 48 fix): the settle rewrite
        // re-renders the sidecar from the row — the snapshots stamped
        // at registration ride along, never wiped.
        cardSnapshot: run.cardSnapshot,
        benchSnapshot: run.benchSnapshot,
        // F-6(b): the admission warnings ride the settle rewrite
        // too (a terminal disk row keeps what the live row warned).
        warnings: run.warnings,
        // THE COMPOSE ECHO rides the settle rewrite too (a terminal
        // disk row keeps what the engine received at start).
        composeEcho: run.composeEcho,
        // THE SOURCE ECHO rides the settle rewrite too (a terminal
        // disk row keeps the files that created it).
        sourceEcho: run.sourceEcho,
        exportName,
        exportPath,
        variant,
        loudness: run.loudness,
        voiceFreshness: run.voiceFreshness,
      }),
    );
  } catch {
    /* the sidecar must never take the settle down */
  }
  try {
    appendLedger(stateRoot, "run." + run.status, {
      run_id: run.runId,
      error: run.error,
      // THE VARIANT RIDES THE TERMINAL ROW TOO (033 #5): the
      // queued row named it at birth; the terminal row names it at
      // rest — one grep tells design from performing, state to state.
      ...(variant !== undefined ? { variant } : {}),
    });
    /* v8 ignore next -- unreachable: appendLedger self-swallows I/O
       faults by law, and settle's payload is two strings (the dumps
       never throws), so this catch has no honest trigger (2026-09-12) */
  } catch {
    /* nor the ledger row */
  }
}

/** The synthesized log tail (door-verbatim port: the retired
 *  oracle's status voice, synthesized from the live row). */
export function runLogTail(obj: {
  status?: unknown;
  queue_position?: unknown;
  error?: unknown;
  stages?: unknown;
  artifacts?: unknown;
}): string {
  const lines: string[] = [];
  const status: string = String(obj.status ?? "?");
  const qp: unknown = obj.queue_position;
  let head: string = "run: " + status;
  if (status === "queued" && typeof qp === "number" && qp > 0) {
    head += " (queue position " + qp + ")";
  }
  if (obj.error) head += " — " + String(obj.error).slice(0, 300);
  lines.push(head);
  const stages: unknown = obj.stages;
  if (Array.isArray(stages)) {
    for (const st of stages as Record<string, unknown>[]) {
      if (typeof st !== "object" || st === null || Array.isArray(st)) continue;
      const name: string = String(st["name"] ?? st["id"] ?? "stage");
      let line: string = name + ": " + String(st["status"] ?? "?");
      const p: unknown = st["progress"];
      if (
        typeof p === "object" && p !== null && !Array.isArray(p) &&
        (p as Record<string, unknown>)["max"]
      ) {
        line +=
          " — " +
          String((p as Record<string, unknown>)["value"]) +
          "/" +
          String((p as Record<string, unknown>)["max"]);
      }
      const a: unknown = st["activity"];
      if (typeof a === "object" && a !== null && !Array.isArray(a)) {
        const rec = a as Record<string, unknown>;
        const ph: string = String(rec["phase"] ?? "");
        const msg: unknown = rec["message"] ?? rec["node_class"];
        line += " [" + ph + (msg ? ": " + String(msg) : "") + "]";
      }
      if (st["error"]) line += "\n  error: " + String(st["error"]).slice(0, 300);
      lines.push(line);
    }
  }
  const arts: unknown = obj.artifacts;
  if (Array.isArray(arts) && (arts as unknown[]).length > 0) {
    const names: string[] = [];
    for (const a of (arts as unknown[]).slice(0, 6)) {
      const v: unknown =
        typeof a === "object" && a !== null && !Array.isArray(a)
          ? ((a as Record<string, unknown>)["url"] ??
            (a as Record<string, unknown>)["name"])
          : a;
      const s: string = String(v ?? "").split("/").pop() as string;
      if (s !== "") names.push(s);
    }
    if (names.length > 0) lines.push("artifacts: " + names.join(", "));
  }
  return lines.join("\n");
}
