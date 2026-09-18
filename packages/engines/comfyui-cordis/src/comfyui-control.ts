// comfyui-control.ts — interrupt + the stop door + model unload (native 525-565).
// (split from comfyui.ts 2026-09-18: pure move, zero logic changes).

import { ACTIVE } from "./comfyui-types.ts";
import type { ActivePrompt } from "./comfyui-types.ts";
import { ComfyError } from "./comfyui-types.ts";
import { resolveEngineBaseUrl } from "./comfyui-config.ts";
import { httpCall } from "./comfyui-transport.ts";

// ── interrupt (native 525-534) ──

/** Delete-from-queue + interrupt — best-effort swallow, exactly as py. */
export async function interrupt(server: string, promptId: string): Promise<void> {
  try {
    await httpCall(
      "POST",
      server + "/queue",
      Buffer.from(JSON.stringify({ delete: [promptId] }), "utf8"),
    );
    await httpCall("POST", server + "/interrupt", Buffer.from("{}", "utf8"));
  } catch {
    // best-effort; the stop door's /interrupt is audited <6s
  }
}

/** The stop door's engine handle — mirrors native.stop (537-565).
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

/** ENGINE TRANSITION (native.unload port, native 545-565): drop every
 *  cached model + the execution cache from VRAM — POST /free
 *  {"unload_models": true, "free_memory": true}. Raises ComfyError on
 *  a non-2xx so the caller can DOCUMENT a failed unload (RESILIENCE
 *  LAW) and continue — never silently resident. Unwired (single-engine
 *  preview — flowsRun.ts owns the boundary call when it lands).
 *
 *  NON-PLUGIN callers only (walls/probes/unit — no Context).
 *  Plugin paths use ComfyUIHostService.unloadModels (same inner). */
export async function unloadModels(serverOverride: string = ""): Promise<void> {
  const server: string =
    serverOverride !== "" ? serverOverride : resolveEngineBaseUrl();
  return unloadModelsInner(server);
}

/** Shared unload core (no resolution): POST /free, LOUD on non-2xx. */
export async function unloadModelsInner(server: string): Promise<void> {
  const { status } = await httpCall(
    "POST",
    server + "/free",
    Buffer.from(
      JSON.stringify({ unload_models: true, free_memory: true }),
      "utf8",
    ),
  );
  if (status >= 300) {
    throw new ComfyError(
      "ComfyUI /free status " + status + " (models may still be resident)",
    );
  }
}
