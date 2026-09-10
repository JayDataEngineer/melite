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
  atomicWriteJson,
  sidecarDoc,
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

/** One stage row — key order mirrors submit's literal. */
export interface StageRow {
  id: string;
  name: string;
  index: number;
  status: string;
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
  stages: StageRow[];
  skippedStages: string[];
  artifacts: string[];
  error: string;
  draftId: string;
  dir: string;
  testFlag: boolean;
  stopFlag: boolean;
  params: Record<string, EngineJson>[];
  outputNodes: Record<string, EngineJson>[];
  /** The settle persist (R3 mirror): registration stamps these so
   *  settle can rewrite the sidecar + ledger row. createdAt is
   *  epoch seconds (py parity). */
  createdAt: number;
  pipeline: string;
  graphRows: GraphRow[];
  /** Per-stage input names (the rim): stage-input -> "stage.output"
   *  / "__initial__.name". Stamped at registration. */
  inputNames?: Record<string, Record<string, string>>;
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
export function settlePersist(
  run: RunRecord,
  stateRoot: string,
): void {
  try {
    atomicWriteJson(
      join(run.dir, "_flow.json"),
      sidecarDoc({
        runId: run.runId,
        status: run.status,
        error: run.error,
        stages: run.stages.map((st) => ({
          id: st.id,
          name: st.name,
          index: st.index,
          status: st.status,
          outputs: { ...(st.outputs as Record<string, unknown>) },
          expected: { ...(st.expected as Record<string, unknown>) },
        })),
        skippedStages: [...run.skippedStages],
        artifacts: [...run.artifacts],
        createdAt: run.createdAt,
        testFlag: run.testFlag,
        draftId: run.draftId,
        pipeline: run.pipeline,
        graph: run.graphRows,
      }),
    );
  } catch {
    /* the sidecar must never take the settle down */
  }
  try {
    appendLedger(stateRoot, "run." + run.status, {
      run_id: run.runId,
      error: run.error,
    });
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
      const s: string = String(v ?? "").split("/").pop() ?? "";
      if (s !== "") names.push(s);
    }
    if (names.length > 0) lines.push("artifacts: " + names.join(", "));
  }
  return lines.join("\n");
}
