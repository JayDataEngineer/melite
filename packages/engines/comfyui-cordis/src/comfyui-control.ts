// comfyui-control.ts — interrupt + the stop door + model unload,
// over the SDK client (deleteItem / interrupt / free).

import { ACTIVE } from "./comfyui-types.ts";
import type { ActivePrompt } from "./comfyui-types.ts";
import { ComfyError } from "./comfyui-types.ts";
import { resolveEngineBaseUrl } from "./comfyui-config.ts";
import { sdkClient, withBound } from "./comfyui-transport.ts";

/** Delete-from-queue + interrupt — best-effort swallow, exactly .
 *  Each hop is bounded (audit P-E2): a hung engine cannot wedge the
 *  stop door — the door's own audit voice stays <6s. */
const STOP_HOP_BOUND_MS = 2_000;

export async function interrupt(server: string, promptId: string): Promise<void> {
  try {
    const client = sdkClient(server);
    await withBound(() => client.deleteItem("queue", promptId), STOP_HOP_BOUND_MS, "POST /queue delete");
    await withBound(() => client.interrupt(promptId), STOP_HOP_BOUND_MS, "POST /interrupt");
  } catch {
    // best-effort; the stop door's /interrupt is audited <6s
  }
}

/** The stop door's engine handle.
 *
 *  NON-PLUGIN callers only (walls/probes/unit — no Context).
 *  Plugin paths (the flows-stop door) read through
 *  ComfyUIHostService.stopForRunDir (the fiber-owned prompts map).
 *  Documented split, never two truths (shared inner below). */
export async function stopForRunDir(runDir: string): Promise<void> {
  return stopForRunDirInner(runDir, ACTIVE);
}

/** Shared stop core (no resolution, no registry choice): delete
 *  from queue + interrupt, best-effort. */
export async function stopForRunDirInner(
  runDir: string,
  active: Map<string, ActivePrompt>,
): Promise<void> {
  const rec: ActivePrompt | undefined = active.get(String(runDir));
  if (rec === undefined) return;
  await interrupt(rec.server, rec.promptId);
}

/** ENGINE TRANSITION: drop every cached model + the execution
 *  cache from VRAM. Raises ComfyError on a non-2xx so the caller
 *  can DOCUMENT a failed unload (RESILIENCE LAW) and continue —
 *  never silently resident.
 *
 *  NON-PLUGIN callers only (walls/probes/unit — no Context).
 *  Plugin paths use ComfyUIHostService.unloadModels (same inner). */
export async function unloadModels(serverOverride: string = ""): Promise<void> {
  const server: string =
    serverOverride !== "" ? serverOverride : resolveEngineBaseUrl();
  return unloadModelsInner(server);
}

/** Shared unload core (no resolution): POST /free, LOUD on refusal.
 *  Bounded (audit P-E7): a memory-relief valve that blocks forever
 *  on a sick engine wedges its caller; a bound breach refuses the
 *  same loud voice a non-2xx does. */
const UNLOAD_BOUND_MS = 10_000;

export async function unloadModelsInner(server: string): Promise<void> {
  try {
    await withBound(
      () => sdkClient(server).free({ unload_models: true, free_memory: true }),
      UNLOAD_BOUND_MS,
      "POST /free",
    );
  } catch (e: unknown) {
    throw new ComfyError(
      "ComfyUI /free refused (models may still be resident): " +
        (e instanceof Error ? e.message : String(e)),
    );
  }
  // NEW-3 (2026-11-12): the qwen3 torch engine's process-wide warmed
  // handles (~4.3 GB + graphs per variant) are seats ComfyUI's own
  // /free cannot see — they are engine-owned, not core-tracked, and
  // no estate door could reach the Unload node (it needs an
  // AUDIOCORE_MODEL handle no caller holds outside a run). The
  // vendored melite-audio-nodes pack serves POST
  // /audiocore/release_warmed (same release_warmed_handles() the
  // Unload node fires); chain it AFTER native /free so one free door
  // drops both seat classes. TOLERANT: the route exists only when
  // that pack serves — its absence must never fail an unload that
  // already succeeded (the native /free refusal above stays loud).
  try {
    await withBound(
      (): Promise<Response> => sdkClient(server).fetchApi(
        "/audiocore/release_warmed",
        { method: "POST" },
      ),
      UNLOAD_BOUND_MS,
      "POST /audiocore/release_warmed",
    );
  } catch {
    // tolerant by design: a pack-less engine 404s — nothing to release
  }
}
