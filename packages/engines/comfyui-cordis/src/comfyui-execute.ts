// comfyui-execute.ts — per-stage execute over the SDK client
// (submit / wait / interrupt / history), with the estate's own
// laws layered on top: deadline and stop both interrupt the
// prompt, progress is additive (never load-bearing), and the
// history verdict owns the failure voice.

import { dirname } from "node:path";
import { PollingTimeoutError } from "@stable-canvas/comfyui-client";
import type { Client } from "@stable-canvas/comfyui-client";
import { ACTIVE, ComfyError } from "./comfyui-types.ts";
import type { ActivePrompt, EngineJson } from "./comfyui-types.ts";
import { resolveEngineBaseUrl } from "./comfyui-config.ts";
import { sdkClient } from "./comfyui-transport.ts";
import { spliceWorkflow, uploadReferenced } from "./comfyui-upload.ts";
import { fetchOutputs, mapHistoryEntry, normalizeTimeoutS, publishOutputChannels } from "./comfyui-outputs.ts";

export interface ExecuteOpts {
  /** Seconds; the estate's own budget (default 2400). */
  readonly timeoutS?: number;
  /** Polled every tick — a true verdict interrupts the prompt. */
  readonly shouldStop?: () => boolean;
  /** Progress fold — the client's ws events folded here (progress
   *  + activity). Absent = no socket opened (the wire stays quiet). */
  readonly report?: (updates: Record<string, EngineJson>) => void;
}

export interface ExecuteResult {
  readonly outputs: Record<string, EngineJson>;
  readonly artifacts: string[];
  readonly promptId: string;
}

/** Submit one graph through the SDK (POST /prompt). The SDK owns
 *  the body shape and the refusal voice (its typed enqueue error);
 *  the server's prompt_id is the receipt. */
export async function submitPrompt(
  client: Client,
  graph: Record<string, EngineJson>,
): Promise<{ promptId: string; clientId: string }> {
  const res: Record<string, unknown> = await client.queuePrompt(0, {
    prompt: graph,
    workflow: null,
  }) as Record<string, unknown>;
  const id: unknown = res["prompt_id"];
  if (typeof id !== "string" || id === "") {
    throw new ComfyError("POST /prompt returned no prompt_id");
  }
  return { promptId: id, clientId: String(client.clientId) };
}

/** The stop probe: a 250ms tick racing the SDK's wait. dispose()
 *  clears the tick — never a stray interval after a settled run. */
function stopProbe(shouldStop: () => boolean): {
  readonly promise: Promise<never>;
  readonly dispose: () => void;
} {
  // (the Promise executor runs synchronously — the tick is always
  //  set before dispose can run; the null guard was a dead arm,
  //  deleted 2026-09-19 under the fallback ban.)
  let tick!: NodeJS.Timeout;
  const promise: Promise<never> = new Promise<never>((_, rejectP) => {
    tick = setInterval((): void => {
      if (shouldStop()) {
        rejectP(new ComfyError("stopped (interrupt delivered)"));
      }
    }, 250);
    tick.unref();
  });
  return {
    promise,
    dispose: (): void => {
      clearInterval(tick);
    },
  };
}

/** Find one prompt's entry in the engine history (the SDK fetches
 *  the history window; the entry carries status + outputs). */
async function historyEntry(
  client: Client,
  promptId: string,
): Promise<Record<string, EngineJson> | undefined> {
  const { History } = await client.getHistory();
  const hit = History.find((e: unknown): boolean => {
    const prompt: unknown = (e as Record<string, unknown>)["prompt"];
    return Array.isArray(prompt) && String(prompt[1]) === promptId;
  });
  return hit as Record<string, EngineJson> | undefined;
}

/** Wait to terminal: the SDK's queue-membership wait under the
 *  estate's deadline + stop, then the history verdict decides.
 *  Every exit path but success delivers the interrupt first. */
export async function waitTerminal(
  client: Client,
  promptId: string,
  deadline: number,
  shouldStop: () => boolean,
): Promise<Record<string, EngineJson>> {
  for (;;) {
    const probe = stopProbe(shouldStop);
    try {
      await Promise.race([
        client.waitForPrompt(promptId, 250, deadline - Date.now()),
        probe.promise,
      ]);
    } catch (e) {
      try {
        await client.interrupt(promptId);
      } catch {
        /* best-effort — the refusal never masks the cause */
      }
      if (e instanceof ComfyError) throw e;
      if (e instanceof PollingTimeoutError) {
        throw new ComfyError("run exceeded its budget (interrupt delivered)");
      }
      throw new ComfyError(e instanceof Error ? e.message : String(e));
    } finally {
      probe.dispose();
    }
    const entry: Record<string, EngineJson> | undefined =
      await historyEntry(client, promptId);
    const verdict = mapHistoryEntry(entry);
    if (verdict.kind === "failed") {
      throw new ComfyError("ComfyUI run failed: " + verdict.detail);
    }
    if (verdict.kind === "completed" && entry !== undefined) {
      return entry;
    }
    // queue says done but history is not terminal yet — loop on
  }
}

/** Fold the client's ws events into report() calls. Progress is
 *  additive: a refused/dropped socket logs nothing and simply
 *  yields no events — never a killed run. Returns the unhook. */
export function hookProgress(
  client: Client,
  promptId: string,
  report: ((updates: Record<string, EngineJson>) => void) | undefined,
): (() => void) | null {
  if (report === undefined) return null;
  void client
    .connect({ websocket: { enabled: true }, timeout_ms: 2000 })
    .catch((): void => {
      /* the tap stays empty — progress is never load-bearing */
    });
  const offs: Array<() => void> = [
    client.on("progress", (d): void => {
      if (typeof d.value !== "number") return;
      const mx: number = typeof d.max === "number" ? d.max : 0;
      report({
        progress: {
          value: d.value,
          max: mx,
          node: String(d.node ?? ""),
        },
        activity:
          "sampling " + Math.trunc(d.value) + "/" +
          (mx > 0 ? String(Math.trunc(mx)) : "?"),
      });
    }),
    client.on("executing", (d): void => {
      if (d.prompt_id !== undefined && d.prompt_id !== null && String(d.prompt_id) !== promptId) return;
      if (d.node === undefined || d.node === null) return;
      report({ activity: "node " + String(d.node) });
    }),
  ];
  return (): void => {
    for (const off of offs) off();
  };
}

/** The execute core (no resolution, no registry choice). */
export async function executeSingleInner(
  runDir: string,
  nodeParams: Record<string, EngineJson>,
  nodeOutputs: Record<string, EngineJson>,
  opts: ExecuteOpts,
  server: string,
  active: Map<string, ActivePrompt>,
): Promise<ExecuteResult> {
  const client = sdkClient(server);
  const params: Record<string, EngineJson> = { ...nodeParams };
  const wf: Record<string, EngineJson> = spliceWorkflow(params);
  const staged = await uploadReferenced(client, wf, { runsRoot: dirname(String(runDir)) });
  const timeoutS: number = normalizeTimeoutS(params["timeout_s"]);
  const deadline: number = Date.now() + timeoutS * 1000;
  const { promptId, clientId } = await submitPrompt(client, staged.graph);
  active.set(String(runDir), {
    promptId,
    clientId,
    server,
  });
  // THE PROGRESS TAP: hooked only when a report fold exists — no
  // consumer, no socket (progress is additive).
  const unhook = hookProgress(client, promptId, opts.report);
  try {
    const entry: Record<string, EngineJson> = await waitTerminal(
      client,
      promptId,
      deadline,
      opts.shouldStop ?? ((): boolean => false),
    );
    const arts: string[] = await fetchOutputs(client, String(runDir), entry, params["timeout_s"]);
    const outputs: Record<string, EngineJson> = { prompt_id: promptId };
    Object.assign(outputs, publishOutputChannels(nodeOutputs, arts));
    return { outputs, artifacts: arts, promptId };
  } finally {
    unhook?.();
    // the client owns the socket + its listeners — closing it here
    // retires the run's tap; the stop-handle map is the caller's
    // (the service face passes its own prompts map).
    client.close();
    active.delete(String(runDir));
  }
}

/** The non-plugin execute face (walls/probes/unit — no Context).
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
