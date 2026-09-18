// comfyui-control.ts — interrupt + the stop door + model unload,
// over the SDK client (deleteItem / interrupt / free).

import { ACTIVE } from "./comfyui-types.ts";
import type { ActivePrompt } from "./comfyui-types.ts";
import { ComfyError } from "./comfyui-types.ts";
import { resolveEngineBaseUrl } from "./comfyui-config.ts";
import { sdkClient } from "./comfyui-transport.ts";

/** Delete-from-queue + interrupt — best-effort swallow, exactly . */
export async function interrupt(server: string, promptId: string): Promise<void> {
  try {
    const client = sdkClient(server);
    await client.deleteItem("queue", promptId);
    await client.interrupt(promptId);
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

/** Shared unload core (no resolution): POST /free, LOUD on refusal. */
export async function unloadModelsInner(server: string): Promise<void> {
  try {
    await sdkClient(server).free({ unload_models: true, free_memory: true });
  } catch (e: unknown) {
    throw new ComfyError(
      "ComfyUI /free refused (models may still be resident): " +
        (e instanceof Error ? e.message : String(e)),
    );
  }
}
