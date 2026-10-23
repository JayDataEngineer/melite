// comfyui-vram.ts — the VRAM headroom gate (the "ComfyUI should
// prevent oom" law, operator 2026-10-23, REFINED the same round:
// "ComfyUI manages VRAM auto" / "only comfyui uses the GPU"). A
// stage that declares a VRAM budget (`vram_budget_mb`, MiB) refuses
// BEFORE submit when the engine's primary device cannot prove that
// much free VRAM. The gate never evicts: no POST /free, no nudge
// prompts, no engine restarts — the engine's own memory management
// owns what stays resident (an earlier arm fired /free from here and
// evicted the operator's managed cache; that behavior is retired).
// The alternative the law retires: discovering the shortfall as a
// torch.OutOfMemoryError mid-run, after minutes of work, with the
// stack's own alloc size as the only diagnosis. NO-ESTATE-PYTHON:
// the OOM was born in a subprocess the estate must not edit — the
// gate rides the estate's execute door (Layer A) reading the
// engine's own /system_stats (Layer B), never a python patch.
import { ComfyError } from "./comfyui-types.ts";
import { withBound } from "./comfyui-transport.ts";

/** The type the SDK's getSystemStats answer carries for one device
 * (the engine's own /system_stats row — vram fields are BYTES on
 * the wire; this module owns the byte→MiB read). */
interface DeviceRow {
  readonly name?: unknown;
  readonly type?: unknown;
  readonly vram_total?: unknown;
  readonly vram_free?: unknown;
}

/** Normalize a stage's `vram_budget_mb` to a finite positive budget
 * (MiB). Absent (undefined) means NO GATE — the back-compat arm:
 * stages that declare no budget never probe, never refuse. A
 * present-but-garbage value refuses loud (a typo'd budget that
 * silently gated nothing is the exact failure class this law
 * exists to retire).
 * @param raw the stage params doc's `vram_budget_mb` slot
 * @returns the budget in MiB, or undefined when absent */
export function normalizeVramBudgetMb(raw: unknown): number | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) {
    throw new ComfyError(
      "vram_budget_mb must be a positive finite number of MiB (got " +
        String(raw) +
        ") — refusing rather than gating on a budget the estate cannot read",
    );
  }
  return raw;
}

/** Read the engine's primary-device free VRAM (MiB) off
 * /system_stats. The primary device is devices[0] — the device the
 * engine executes on (comfy.model_management's first enabled
 * device; single-GPU estates, ours included, report exactly one).
 * @param server the engine base URL
 * @param client the SDK client bound to that server (probe reuse)
 * @returns the free VRAM of devices[0] in MiB */
export async function probeVramFreeMb(
  server: string,
  client: { getSystemStats: () => Promise<unknown> },
): Promise<number> {
  const PROBE_BOUND_MS = 10_000;
  const stats: unknown = await withBound(
    (): Promise<unknown> => client.getSystemStats(),
    PROBE_BOUND_MS,
    "GET /system_stats",
  );
  const devices: unknown =
    stats !== null && typeof stats === "object"
      ? (stats as Record<string, unknown>)["devices"]
      : undefined;
  if (!Array.isArray(devices) || devices.length === 0) {
    throw new ComfyError(
      "vram_budget_mb declared but the engine reports no devices " +
        "(GET /system_stats devices empty on " +
        server +
        ") — headroom cannot be proven, refusing rather than OOM at run time",
    );
  }
  const first: unknown = devices[0];
  const free: unknown =
    first !== null && typeof first === "object"
      ? (first as DeviceRow)["vram_free"]
      : undefined;
  if (typeof free !== "number" || !Number.isFinite(free) || free < 0) {
    throw new ComfyError(
      "vram_budget_mb declared but the engine's devices[0] carries no " +
        "finite vram_free (GET /system_stats on " +
        server +
        ") — headroom cannot be proven, refusing rather than OOM at run time",
    );
  }
  return free / (1024 * 1024);
}

/** The gate: prove `budgetMb` of free VRAM on the engine's primary
 * device before the run submits — ONE probe, then the verdict. The
 * estate NEVER evicts (operator 2026-10-23: "ComfyUI manages VRAM
 * auto" — the engine's own memory management owns what stays
 * resident; an earlier arm fired POST /free + a nudge prompt from
 * here and evicted the operator's managed cache. Retired). Short
 * headroom refuses LOUD with the numbers; proved headroom submits.
 * Never a mid-run OOM the operator only meets as a dead run.
 * @param server the engine base URL
 * @param budgetMb the stage's declared budget (MiB, already normalized)
 * @param client the SDK client bound to the server */
export async function ensureVramHeadroom(
  server: string,
  budgetMb: number,
  client: { getSystemStats: () => Promise<unknown> },
): Promise<void> {
  const freeMb: number = await probeVramFreeMb(server, client);
  if (freeMb >= budgetMb) return;
  throw new ComfyError(
    "refusing rather than OOM at run time: the engine's primary device " +
      "holds " +
      Math.round(freeMb) +
      " MiB free against the stage's vram_budget_mb of " +
      Math.round(budgetMb) +
      " MiB — the engine manages its own VRAM (the estate never evicts); " +
      "free engine residency or lower the budget",
  );
}

/** The stage-door read of the gate: normalize the knob off a params
 * doc, fire the gate when present. Absent knob = no client traffic
 * (the back-compat law: stages that never declared a budget must
 * not suddenly probe).
 * @param server the engine base URL
 * @param params the stage's params doc (raw knobs ride here — the
 *  same doc timeout_s reads)
 * @param client the SDK client bound to the server */
export async function gateVramForStage(
  server: string,
  params: Record<string, unknown>,
  client: { getSystemStats: () => Promise<unknown> },
): Promise<void> {
  const budgetMb: number | undefined = normalizeVramBudgetMb(
    params["vram_budget_mb"],
  );
  if (budgetMb === undefined) return;
  await ensureVramHeadroom(server, budgetMb, client);
}
