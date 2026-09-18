// comfyui-execute.ts — the progress tap + prompt submit/poll + per-stage execute (native execute).
// (split from comfyui.ts 2026-09-18: pure move, zero logic changes).

import { randomBytes, randomUUID } from "node:crypto";
import { dirname } from "node:path";
import { ACTIVE, ComfyError } from "./comfyui-types.ts";
import type { ActivePrompt, EngineJson } from "./comfyui-types.ts";
import { resolveEngineBaseUrl } from "./comfyui-config.ts";
import { formatTimeout0f, pyDumps400, pyStr } from "./comfyui-format.ts";
import { httpCall } from "./comfyui-transport.ts";
import { spliceWorkflow, uploadReferenced } from "./comfyui-upload.ts";
import { interrupt } from "./comfyui-control.ts";
import { fetchOutputs, mapHistoryEntry, normalizeTimeoutS, publishOutputChannels } from "./comfyui-outputs.ts";
import type { HistoryVerdict } from "./comfyui-outputs.ts";

// ── submit + poll ──

export function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolveP) => setTimeout(resolveP, ms));
}

// ── the progress tap (the _ws_tap port, 2026-09-13 — the operator's
//    "forward the comfyui progress webhooks like before") ──────────
// The py native hand-rolled the WebSocket handshake because py had no
// stdlib client; Node 22 ships one (undici's global WebSocket) — the
// platform client retires the hand-roll, the CONTRACT stays verbatim:
// connect /ws?clientId=<ours>, queue every JSON event targeted at our
// client_id, READ-ONLY (the client's own pong/close hygiene), and a
// dropped tap NEVER kills the run — /history stays the terminal
// authority (native.py:28-29, the documented law).

/** One /ws JSON event (type + data), queued by the tap. */
export interface ComfyWsEvent {
  readonly type: string;
  readonly data: Record<string, EngineJson>;
}

/** The tap handle: drain() snapshots the queue (never awaits — the
 *  get_nowait fold), close() idempotent. */
export interface TapHandle {
  readonly drain: () => ComfyWsEvent[];
  readonly close: () => void;
}

/** Open the read-only progress tap for one run's client_id. Never
 *  throws: a refused/dropped socket logs nothing and simply yields
 *  no events (progress is additive, never load-bearing). */
export function openProgressTap(server: string, clientId: string): TapHandle {
  const queue: ComfyWsEvent[] = [];
  let ws: WebSocket | null = null;
  try {
    const url: string =
      server.replace(/^http/, "ws") + "/ws?clientId=" + encodeURIComponent(clientId);
    ws = new WebSocket(url);
    ws.onmessage = (ev: MessageEvent): void => {
      if (typeof ev.data !== "string") return; // text only (binary previews skipped, py parity)
      try {
        const parsed: unknown = JSON.parse(ev.data);
        if (
          typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) &&
          typeof (parsed as Record<string, unknown>)["type"] === "string"
        ) {
          const rec = parsed as Record<string, unknown>;
          const d: unknown = rec["data"];
          queue.push({
            type: rec["type"] as string,
            data: typeof d === "object" && d !== null && !Array.isArray(d)
              ? (d as Record<string, EngineJson>)
              : {},
          });
        }
      } catch {
        /* non-JSON frame — skipped (py parity) */
      }
    };
  } catch {
    /* the platform client refused the URL — the tap stays empty */
  }
  return {
    drain: (): ComfyWsEvent[] => queue.splice(0, queue.length),
    close: (): void => {
      try { ws?.close(); } catch { /* already gone */ }
    },
  };
}

/** _drain_relevant port: fold queued events into report() calls.
 *  Frames for ANOTHER run's prompt_id are skipped (queue
 *  concurrency). Progress rides {progress:{value,max,node},
 *  activity:"sampling v/m"}; node flips ride {activity:"node n"};
 *  execution_error is recorded (returned) but NEVER thrown — the
 *  history verdict owns the failure voice (the documented law). */
export function drainRelevant(
  events: readonly ComfyWsEvent[],
  promptId: string,
  report: (updates: Record<string, EngineJson>) => void,
): string | null {
  let err: string | null = null;
  for (const ev of events) {
    const t: string = ev.type;
    const d: Record<string, EngineJson> = ev.data;
    const pid: unknown = d["prompt_id"];
    if (pid !== undefined && pid !== null && String(pid) !== promptId) {
      continue; // another run's prompt (queue concurrency)
    }
    if (t === "progress" && typeof d["value"] === "number") {
      const mx: number = typeof d["max"] === "number" ? d["max"] : 0;
      report({
        progress: {
          value: d["value"],
          max: mx,
          node: String(d["node"] ?? ""),
        },
        activity:
          "sampling " + Math.trunc(d["value"]) + "/" +
          (mx > 0 ? String(Math.trunc(mx)) : "?"),
      });
    } else if (t === "executing" && d["node"] !== undefined && d["node"] !== null) {
      report({ activity: "node " + String(d["node"]) });
    } else if (t === "execution_error") {
      err = "ComfyUI execution_error: " + JSON.stringify(d).slice(0, 400);
    }
  }
  return err;
}

export interface ExecuteOpts {
  /** Seconds; native default 2400 (never hours of silent hang). */
  readonly timeoutS?: number;
  /** Polled every tick — mirrors stop_event.is_set(). */
  readonly shouldStop?: () => boolean;
  /** Progress fold — the tap's frames folded here (progress +
   *  activity). Absent = no tap opened (the wire stays quiet). */
  readonly report?: (updates: Record<string, EngineJson>) => void;
}

export interface ExecuteResult {
  readonly outputs: Record<string, EngineJson>;
  readonly artifacts: string[];
  readonly promptId: string;
}

export async function submitPrompt(
  server: string,
  graph: Record<string, EngineJson>,
  merged: boolean,
): Promise<{ promptId: string; clientId: string }> {
  /* v8 ignore next -- cross-project merge phantom: the node lane's transport spec covers this body end-to-end (the POST /prompt battery), but the browser-lane module copy (melite-estate's comfyui-host entry) loads without ever submitting and its uncovered instance clobbers the union (2026-09-12). */
  const promptId: string = randomUUID();
  const clientId: string = "melite-" + randomBytes(8).toString("hex");
  const { status, body } = await httpCall(
    "POST",
    server + "/prompt",
    Buffer.from(
      JSON.stringify({ prompt: graph, prompt_id: promptId, client_id: clientId }),
      "utf8",
    ),
  );
  if (status !== 200) {
    throw new ComfyError("POST /prompt " + status + ": " + pyStr(body).slice(0, 400));
  }
  const out =
    typeof body === "object" && body !== null && !Buffer.isBuffer(body)
      ? (body as Record<string, EngineJson>)
      : null;
  if (out === null) {
    // A 200 body that is not an object (a proxy's scalar/empty
    // page, `42`, `true`) carries no prompt acceptance — proceed
    // would poll a never-queued random promptId to the deadline.
    // Refuse LOUD now (audit finding, stroke 82).
    throw new ComfyError(
      "POST /prompt 200 returned a non-object body (" +
        (Buffer.isBuffer(body) ? "bytes" : JSON.stringify(body).slice(0, 120)) +
        ") — no prompt acceptance",
    );
  }
  const nodeErrors: EngineJson | undefined = out?.["node_errors"];
  const hasErrors: boolean =
    nodeErrors !== undefined &&
    nodeErrors !== null &&
    (typeof nodeErrors !== "object" ||
      (Array.isArray(nodeErrors) ? nodeErrors.length > 0 : Object.keys(nodeErrors).length > 0));
  if (hasErrors) {
    throw new ComfyError(
      "ComfyUI validation refused the " +
        (merged ? "merged graph: " : "graph: ") +
        pyDumps400(nodeErrors as EngineJson),
    );
  }
  return { promptId, clientId };
}

export async function pollToTerminal(
  server: string,
  promptId: string,
  deadline: number,
  exceededText: () => string,
  shouldStop: () => boolean,
  tap: TapHandle | null = null,
  // Possibly undefined: both callers pass opts.report straight through,
  // and report is only invoked under `tap !== null` below — which holds
  // exactly when a report was passed (both callers derive the tap from
  // `opts.report !== undefined`), so the cast at the fold is total.
  report: ((updates: Record<string, EngineJson>) => void) | undefined,
): Promise<Record<string, EngineJson>> {
  for (;;) {
    await sleep(250); // the py-identical cadence (native 378)
    if (tap !== null) {
      // the tap fold (native 379): progress/activity ride report;
      // execution_error is recorded but the history verdict below
      // owns the failure voice (a dropped tap never kills the run).
      // The cast voices the construction invariant (see the report
      // param): tap is non-null exactly when a report was passed.
      // A THROWING report (a consumer bug) interrupts the prompt
      // before propagating — the engine slot is never orphaned on a
      // dead consumer (audit finding, stroke 82).
      try {
        drainRelevant(tap.drain(), promptId, report as (updates: Record<string, EngineJson>) => void);
      } catch (exc: unknown) {
        await interrupt(server, promptId);
        throw exc;
      }
    }
    if (shouldStop()) {
      await interrupt(server, promptId);
      throw new ComfyError("stopped (interrupt delivered)");
    }
    const { status: histStatus, body: hist } = await httpCall(
      "GET",
      server + "/history/" + promptId,
      null,
      "application/json",
      30000,
    );
    if (histStatus !== 200) {
      // A non-200 history answer (proxy 502, an error page) is not
      // "pending" — reading it as pending polls to the 40-minute
      // deadline and then interrupts a finished run. Fail fast
      // with the wire's own voice (audit finding, stroke 82).
      throw new ComfyError(
        "GET /history/" + promptId + " " + histStatus + ": " + pyStr(hist).slice(0, 200),
      );
    }
    const entry: EngineJson | undefined =
      typeof hist === "object" && hist !== null && !Buffer.isBuffer(hist)
        ? (hist as Record<string, EngineJson>)[promptId]
        : undefined;
    if (entry === undefined || entry === null) {
      if (Date.now() >= deadline) {
        await interrupt(server, promptId);
        throw new ComfyError(exceededText());
      }
      continue;
    }
    const verdict: HistoryVerdict = mapHistoryEntry(
      entry as Record<string, EngineJson>,
    );
    if (verdict.kind === "failed") {
      throw new ComfyError("ComfyUI run failed: " + verdict.detail);
    }
    if (verdict.kind === "pending") {
      if (Date.now() >= deadline) {
        await interrupt(server, promptId);
        throw new ComfyError(exceededText());
      }
      continue;
    }
    return entry as Record<string, EngineJson>;
  }
}

/** native.execute port (per-stage submit + poll + fetch).
 *
 *  NON-PLUGIN callers only (walls/probes/unit — no Context).
 *  Plugin paths (doors) use ComfyUIHostService.executeSingle (same
 *  inner, fiber-owned prompts map + service-resolved server).
 *  Documented split, never two truths. */
export async function executeSingle(
  runDir: string,
  nodeParams: Record<string, EngineJson>,
  nodeOutputs: Record<string, EngineJson>,
  opts: ExecuteOpts = {},
  serverOverride: string = "",
): Promise<ExecuteResult> {
  const server: string =
    serverOverride !== "" ? serverOverride : resolveEngineBaseUrl();
  return executeSingleInner(runDir, nodeParams, nodeOutputs, opts, server, ACTIVE);
}

/** Shared execute core (no resolution, no registry choice). */
export async function executeSingleInner(
  runDir: string,
  nodeParams: Record<string, EngineJson>,
  nodeOutputs: Record<string, EngineJson>,
  opts: ExecuteOpts,
  server: string,
  active: Map<string, ActivePrompt>,
): Promise<ExecuteResult> {
  const params: Record<string, EngineJson> = { ...nodeParams };
  const wf: Record<string, EngineJson> = spliceWorkflow(params);
  const staged = await uploadReferenced(server, wf, { runsRoot: dirname(String(runDir)) });
  const timeoutS: number = normalizeTimeoutS(params["timeout_s"]);
  const deadline: number = Date.now() + timeoutS * 1000;
  const { promptId, clientId } = await submitPrompt(server, staged.graph, false);
  active.set(String(runDir), {
    promptId,
    clientId,
    server,
  });
  // THE PROGRESS TAP (2026-09-13): opened only when a report fold
  // exists — no consumer, no socket (progress is additive).
  const tap: TapHandle | null = opts.report !== undefined
    ? openProgressTap(server, clientId) : null;
  try {
    const entry: Record<string, EngineJson> = await pollToTerminal(
      server,
      promptId,
      deadline,
      (): string =>
        "ComfyUI run exceeded " + formatTimeout0f(timeoutS) + "s (interrupt delivered)",
      opts.shouldStop ?? ((): boolean => false),
      tap,
      opts.report,
    );
    const arts: string[] = await fetchOutputs(server, String(runDir), entry, params["timeout_s"]);
    const outputs: Record<string, EngineJson> = { prompt_id: promptId };
    Object.assign(outputs, publishOutputChannels(nodeOutputs, arts));
    return { outputs, artifacts: arts, promptId };
  } finally {
    tap?.close();
    // THE STOP-HANDLE MAP IS THE PARAM, not the module ACTIVE (the
    // service face passes its own prompts map — deleting ACTIVE
    // here leaked the service's handle forever, and a later
    // stopForRunDir for this runDir phantom-interrupted whatever
    // innocent run was live; audit finding, stroke 82).
    active.delete(String(runDir));
  }
}
